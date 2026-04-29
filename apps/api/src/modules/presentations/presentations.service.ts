import { Injectable, NotFoundException } from '@nestjs/common';
import PDFDocument from 'pdfkit';
import { PrismaService } from '../../prisma/prisma.service';

export type PresentationPayload = {
  slug: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  address: string | null;
  metro: string | null;
  builder: string | null;
  deadline: string | null;
  availableApartments: number;
  priceFrom: number | null;
  priceTo: number | null;
  roomMix: Array<{ label: string; count: number; priceFrom: number | null }>;
  generatedAt: string;
};

function decodeHtmlEntities(input: string): string {
  return input
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&mdash;/gi, '—')
    .replace(/&ndash;/gi, '–')
    .replace(/&laquo;/gi, '«')
    .replace(/&raquo;/gi, '»')
    .replace(/&hellip;/gi, '…');
}

function normalizeDescription(raw: string | null): string | null {
  if (!raw?.trim()) return null;
  const decoded = decodeHtmlEntities(raw);
  const withBreaks = decoded
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<\/li>/gi, '\n');
  const text = withBreaks
    .replace(/<[^>]+>/g, ' ')
    .replace(/\r/g, '')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
  return text.length > 0 ? text : null;
}

function quarterLabel(value: Date | null | undefined): string | null {
  if (!value || Number.isNaN(value.getTime())) return null;
  return `${value.getUTCFullYear()} Q${Math.ceil((value.getUTCMonth() + 1) / 3)}`;
}

function roomLabel(raw: string | null | undefined): string {
  const t = (raw ?? '').toLowerCase();
  if (t.includes('студ')) return 'Студии';
  const m = t.match(/\b(\d)\b/);
  if (m) return `${m[1]}-комн.`;
  return 'Другие';
}

@Injectable()
export class PresentationsService {
  constructor(private readonly prisma: PrismaService) {}

  async getBySlug(slug: string): Promise<PresentationPayload> {
    const block = await this.prisma.block.findUnique({
      where: { slug },
      select: {
        id: true,
        slug: true,
        name: true,
        description: true,
        builder: { select: { name: true } },
        addresses: { take: 1, orderBy: { id: 'asc' }, select: { address: true } },
        images: { take: 1, orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }], select: { url: true } },
        subways: {
          take: 1,
          orderBy: [{ distanceTime: 'asc' }, { id: 'asc' }],
          select: {
            distanceTime: true,
            subway: { select: { name: true } },
          },
        },
        buildings: {
          where: { deadline: { not: null } },
          orderBy: { deadline: 'asc' },
          select: { deadline: true },
        },
      },
    });
    if (!block) throw new NotFoundException('Block not found');

    const listings = await this.prisma.listing.findMany({
      where: {
        blockId: block.id,
        kind: 'APARTMENT',
        status: 'ACTIVE',
        isPublished: true,
      },
      select: {
        price: true,
        builder: { select: { name: true } },
        apartment: {
          select: {
            roomType: { select: { name: true } },
          },
        },
      },
      orderBy: { price: 'asc' },
    });

    const metro = block.subways[0]
      ? `${block.subways[0].subway.name}${block.subways[0].distanceTime != null ? ` · ${block.subways[0].distanceTime} мин` : ''}`
      : null;
    const priceValues = listings
      .map((x) => (x.price == null ? null : Number(x.price)))
      .filter((v): v is number => v != null && Number.isFinite(v) && v > 0);
    const roomMixMap = new Map<string, { label: string; count: number; priceFrom: number | null }>();
    for (const row of listings) {
      const label = roomLabel(row.apartment?.roomType?.name);
      const price = row.price == null ? null : Number(row.price);
      const current = roomMixMap.get(label);
      if (!current) {
        roomMixMap.set(label, { label, count: 1, priceFrom: Number.isFinite(price ?? NaN) ? (price as number) : null });
        continue;
      }
      current.count += 1;
      if (price != null && Number.isFinite(price) && (current.priceFrom == null || price < current.priceFrom)) {
        current.priceFrom = price;
      }
    }
    const roomMix = Array.from(roomMixMap.values()).sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
    const deadlineValues = block.buildings
      .map((x) => x.deadline)
      .filter((d): d is Date => d instanceof Date && !Number.isNaN(d.getTime()));
    const deadlineFrom = quarterLabel(deadlineValues[0] ?? null);
    const deadlineTo = quarterLabel(deadlineValues[deadlineValues.length - 1] ?? null);
    const deadline =
      deadlineFrom && deadlineTo
        ? deadlineFrom === deadlineTo
          ? deadlineFrom
          : `${deadlineFrom} - ${deadlineTo}`
        : deadlineFrom ?? null;
    const fallbackBuilder =
      listings
        .map((x) => x.builder?.name?.trim() ?? '')
        .find((name) => name.length > 0) ?? null;

    return {
      slug: block.slug,
      name: block.name,
      description: normalizeDescription(block.description),
      imageUrl: block.images[0]?.url ?? null,
      address: block.addresses[0]?.address ?? null,
      metro,
      builder: block.builder?.name ?? fallbackBuilder,
      deadline,
      availableApartments: listings.length,
      priceFrom: priceValues.length ? Math.min(...priceValues) : null,
      priceTo: priceValues.length ? Math.max(...priceValues) : null,
      roomMix,
      generatedAt: new Date().toISOString(),
    };
  }

  async generatePdf(slug: string): Promise<Buffer> {
    const FONT_REGULAR = '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf';
    const FONT_BOLD = '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf';
    const p = await this.getBySlug(slug);
    const chunks: Buffer[] = [];
    const doc = new PDFDocument({ size: 'A4', margin: 48 });
    doc.registerFont('Regular', FONT_REGULAR);
    doc.registerFont('Bold', FONT_BOLD);
    doc.on('data', (c) => chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c)));

    doc.font('Bold').fontSize(22).text(p.name, { align: 'left' });
    doc.moveDown(0.5);
    doc.font('Regular').fontSize(11).fillColor('#666666').text('Краткая презентация для клиента');
    doc.moveDown();

    doc.fillColor('#000000').fontSize(12);
    if (p.address) doc.font('Regular').text('Адрес: ' + p.address);
    if (p.builder) doc.font('Regular').text('Застройщик: ' + p.builder);
    if (p.metro) doc.font('Regular').text('Метро: ' + p.metro);
    if (p.deadline) doc.font('Regular').text('Срок сдачи: ' + p.deadline);
    if (p.availableApartments > 0) {
      doc.font('Regular').text('Квартир в наличии: ' + p.availableApartments);
    }
    if (p.priceFrom != null) {
      const range =
        p.priceTo != null && p.priceTo !== p.priceFrom
          ? `${new Intl.NumberFormat('ru-RU').format(p.priceFrom)} - ${new Intl.NumberFormat('ru-RU').format(p.priceTo)} руб.`
          : `${new Intl.NumberFormat('ru-RU').format(p.priceFrom)} руб.`;
      doc.font('Regular').text('Диапазон цен: ' + range);
    }

    if (p.description?.trim()) {
      doc.moveDown();
      doc.font('Bold').fontSize(12).fillColor('#000000').text('Описание:');
      doc.moveDown(0.3);
      doc.font('Regular').fontSize(11).fillColor('#1f1f1f').text(p.description.trim(), { align: 'left' });
    }

    if (p.roomMix.length > 0) {
      doc.moveDown();
      doc.font('Bold').fontSize(12).fillColor('#000000').text('Квартиры в наличии:');
      doc.moveDown(0.3);
      doc.font('Regular').fontSize(11).fillColor('#1f1f1f');
      for (const row of p.roomMix.slice(0, 8)) {
        const priceText =
          row.priceFrom != null
            ? `от ${new Intl.NumberFormat('ru-RU').format(row.priceFrom)} руб.`
            : 'цена по запросу';
        doc.text(`- ${row.label}: ${row.count} шт., ${priceText}`);
      }
    }

    doc.moveDown();
    doc.font('Regular').fontSize(9).fillColor('#888888').text('Сформировано: ' + new Date(p.generatedAt).toLocaleString('ru-RU'));
    doc.end();

    return await new Promise<Buffer>((resolve, reject) => {
      doc.once('end', () => resolve(Buffer.concat(chunks)));
      doc.once('error', reject);
    });
  }
}
