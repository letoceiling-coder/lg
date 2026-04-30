import { Injectable, NotFoundException } from '@nestjs/common';
import PDFDocument from 'pdfkit';
import { ListingKind } from '@prisma/client';
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

export type ListingPresentationPayload = {
  listingId: number;
  kind: ListingKind;
  kindLabel: string;
  title: string;
  description: string | null;
  price: number | null;
  address: string | null;
  region: string | null;
  district: string | null;
  builder: string | null;
  blockName: string | null;
  /** Для кнопки «ЖК»: ссылка на /complex/[slug]. */
  blockSlug: string | null;
  subtitle: string | null;
  photoUrls: string[];
  planUrls: string[];
  generatedAt: string;
};

function listingKindLabel(kind: ListingKind): string {
  const m: Record<ListingKind, string> = {
    APARTMENT: 'Квартира',
    HOUSE: 'Дом',
    LAND: 'Участок',
    COMMERCIAL: 'Коммерция',
    PARKING: 'Машиноместо',
  };
  return m[kind] ?? String(kind);
}

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

function extraPhotoUrlsFromJson(j: unknown): string[] {
  if (!Array.isArray(j)) return [];
  return j.filter((x): x is string => typeof x === 'string' && x.trim().length > 0);
}

function dedupeUrls(urls: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const u of urls) {
    const k = u.trim();
    if (!k || seen.has(k)) continue;
    seen.add(k);
    out.push(k);
  }
  return out;
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

  private siteBase(): string {
    return (process.env.PUBLIC_SITE_URL ?? 'https://livegrid.ru').replace(/\/+$/, '');
  }

  private toAbsoluteUrl(url: string): string {
    const u = url.trim();
    if (!u) return '';
    if (/^https?:\/\//i.test(u)) return u;
    return `${this.siteBase()}${u.startsWith('/') ? '' : '/'}${u}`;
  }

  private async fetchImageBuffer(url: string): Promise<Buffer | null> {
    try {
      const abs = this.toAbsoluteUrl(url);
      const res = await fetch(abs, { redirect: 'follow' });
      if (!res.ok) return null;
      return Buffer.from(await res.arrayBuffer());
    } catch {
      return null;
    }
  }

  async getListingPresentation(listingId: number): Promise<ListingPresentationPayload> {
    const row = await this.prisma.listing.findUnique({
      where: { id: listingId },
      include: {
        apartment: { include: { roomType: true, finishing: true } },
        house: true,
        land: true,
        commercial: true,
        parking: true,
        region: true,
        district: true,
        builder: true,
        block: true,
      },
    });
    if (!row) throw new NotFoundException('Listing not found');
    if (!row.isPublished || row.status !== 'ACTIVE') {
      throw new NotFoundException('Listing not available');
    }

    const media = await this.prisma.mediaFile.findMany({
      where: { entityType: 'listing', entityId: listingId },
      orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
    });

    const rawPhotos: string[] = [];
    const rawPlans: string[] = [];
    for (const m of media) {
      const u = m.url?.trim();
      if (!u) continue;
      if (m.kind === 'PLAN') rawPlans.push(u);
      else if (m.kind === 'PHOTO') rawPhotos.push(u);
    }

    if (row.kind === 'APARTMENT' && row.apartment) {
      const a = row.apartment;
      if (a.planUrl?.trim()) rawPlans.push(a.planUrl.trim());
      if (a.finishingPhotoUrl?.trim()) rawPhotos.push(a.finishingPhotoUrl.trim());
      rawPhotos.push(...extraPhotoUrlsFromJson(a.extraPhotoUrls));
    }
    if (row.kind === 'HOUSE' && row.house) {
      const h = row.house;
      if (h.photoUrl?.trim()) rawPhotos.push(h.photoUrl.trim());
      rawPhotos.push(...extraPhotoUrlsFromJson(h.extraPhotoUrls));
    }
    if (row.kind === 'LAND' && row.land) {
      const land = row.land;
      if (land.photoUrl?.trim()) rawPhotos.push(land.photoUrl.trim());
      rawPhotos.push(...extraPhotoUrlsFromJson(land.extraPhotoUrls));
    }

    const planUrls = dedupeUrls(rawPlans);
    const photoUrls = dedupeUrls(rawPhotos.filter((u) => !planUrls.includes(u)));

    const kl = listingKindLabel(row.kind);
    let subtitle: string | null = null;
    switch (row.kind) {
      case 'APARTMENT': {
        const a = row.apartment;
        if (a) {
          const parts: string[] = [];
          if (a.roomType?.name?.trim()) parts.push(a.roomType.name.trim());
          if (a.areaTotal != null && Number(a.areaTotal) > 0) parts.push(`${Number(a.areaTotal)} м²`);
          if (a.floor != null)
            parts.push(`этаж ${a.floor}${a.floorsTotal != null ? ` из ${a.floorsTotal}` : ''}`);
          subtitle = parts.length ? parts.join(' · ') : null;
        }
        break;
      }
      case 'HOUSE': {
        const h = row.house;
        if (h?.areaTotal != null && Number(h.areaTotal) > 0) subtitle = `${Number(h.areaTotal)} м²`;
        break;
      }
      case 'LAND': {
        const land = row.land;
        if (land?.areaSotki != null && Number(land.areaSotki) > 0)
          subtitle = `${Number(land.areaSotki)} сот.`;
        break;
      }
      case 'COMMERCIAL': {
        const c = row.commercial;
        if (c?.area != null && Number(c.area) > 0) subtitle = `${Number(c.area)} м²`;
        break;
      }
      case 'PARKING': {
        const pk = row.parking;
        if (pk?.area != null && Number(pk.area) > 0) subtitle = `${Number(pk.area)} м²`;
        break;
      }
      default:
        break;
    }

    const titleFallback = subtitle ? `${kl} · ${subtitle}` : kl;
    const title = row.title?.trim() || titleFallback;

    const price =
      row.price != null && Number.isFinite(Number(row.price)) ? Number(row.price) : null;

    return {
      listingId: row.id,
      kind: row.kind,
      kindLabel: kl,
      title,
      description: normalizeDescription(row.description),
      price,
      address: row.address?.trim() ?? null,
      region: row.region?.name ?? null,
      district: row.district?.name ?? null,
      builder: row.builder?.name ?? null,
      blockName: row.block?.name ?? null,
      blockSlug: row.block?.slug ?? null,
      subtitle,
      photoUrls,
      planUrls,
      generatedAt: new Date().toISOString(),
    };
  }

  async generateListingPdf(listingId: number): Promise<Buffer> {
    const FONT_REGULAR = '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf';
    const FONT_BOLD = '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf';
    const p = await this.getListingPresentation(listingId);
    const chunks: Buffer[] = [];
    const doc = new PDFDocument({ size: 'A4', margin: 48 });
    doc.registerFont('Regular', FONT_REGULAR);
    doc.registerFont('Bold', FONT_BOLD);
    doc.on('data', (c) => chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c)));

    doc.font('Bold').fontSize(20).fillColor('#000000').text(p.title, { align: 'left' });
    doc.moveDown(0.4);
    doc.font('Regular').fontSize(11).fillColor('#666666').text('Презентация объекта', { align: 'left' });
    doc.moveDown(0.8);
    doc.font('Regular').fontSize(11).fillColor('#000000');

    const lines: string[] = [];
    lines.push(`Тип: ${p.kindLabel}`);
    if (p.subtitle) lines.push(`Параметры: ${p.subtitle}`);
    if (p.price != null)
      lines.push(`Цена: ${new Intl.NumberFormat('ru-RU').format(Math.round(p.price))} ₽`);
    if (p.region) lines.push(`Регион: ${p.region}`);
    if (p.district) lines.push(`Район: ${p.district}`);
    if (p.address) lines.push(`Адрес: ${p.address}`);
    if (p.builder) lines.push(`Продавец / застройщик: ${p.builder}`);
    if (p.blockName) lines.push(`ЖК / комплекс: ${p.blockName}`);

    for (const ln of lines) doc.font('Regular').fontSize(11).fillColor('#1f1f1f').text(ln);

    if (p.description?.trim()) {
      doc.moveDown();
      doc.font('Bold').fontSize(11).fillColor('#000000').text('Описание');
      doc.moveDown(0.25);
      doc.font('Regular').fontSize(10).fillColor('#232323').text(p.description.trim(), { align: 'left' });
    }

    doc.moveDown();
    doc.font('Regular').fontSize(9).fillColor('#888888').text('Документ сформатирован: ' + new Date(p.generatedAt).toLocaleString('ru-RU'));

    const fit = { fit: [500, 700] as [number, number] };

    const plans = p.planUrls.slice(0, 10);
    for (let i = 0; i < plans.length; i++) {
      const url = plans[i];
      const buf = await this.fetchImageBuffer(url);
      doc.addPage();
      doc.font('Bold').fontSize(13).fillColor('#000000').text(`Планировка (${i + 1}/${plans.length})`);
      doc.moveDown(0.4);
      if (buf) {
        try {
          doc.image(buf, fit);
        } catch {
          doc.font('Regular').fontSize(10).text('Не удалось встроить изображение.');
        }
      } else {
        doc.font('Regular').fontSize(10).text('Изображение недоступно по ссылке.');
      }
    }

    const photos = p.photoUrls.slice(0, 14);
    for (let i = 0; i < photos.length; i++) {
      const url = photos[i];
      const buf = await this.fetchImageBuffer(url);
      doc.addPage();
      doc.font('Bold').fontSize(13).fillColor('#000000').text(`Фото (${i + 1}/${photos.length})`);
      doc.moveDown(0.4);
      if (buf) {
        try {
          doc.image(buf, fit);
        } catch {
          doc.font('Regular').fontSize(10).text('Не удалось встроить изображение.');
        }
      } else {
        doc.font('Regular').fontSize(10).text('Изображение недоступно по ссылке.');
      }
    }

    doc.end();

    return await new Promise<Buffer>((resolve, reject) => {
      doc.once('end', () => resolve(Buffer.concat(chunks)));
      doc.once('error', reject);
    });
  }
}
