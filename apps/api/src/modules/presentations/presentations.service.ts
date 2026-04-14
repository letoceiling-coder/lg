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
  generatedAt: string;
};

@Injectable()
export class PresentationsService {
  constructor(private readonly prisma: PrismaService) {}

  async getBySlug(slug: string): Promise<PresentationPayload> {
    const block = await this.prisma.block.findUnique({
      where: { slug },
      select: {
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
      },
    });
    if (!block) throw new NotFoundException('Block not found');

    const metro = block.subways[0]
      ? `${block.subways[0].subway.name}${block.subways[0].distanceTime != null ? ` · ${block.subways[0].distanceTime} мин` : ''}`
      : null;

    return {
      slug: block.slug,
      name: block.name,
      description: block.description,
      imageUrl: block.images[0]?.url ?? null,
      address: block.addresses[0]?.address ?? null,
      metro,
      builder: block.builder?.name ?? null,
      generatedAt: new Date().toISOString(),
    };
  }

  async generatePdf(slug: string): Promise<Buffer> {
    const p = await this.getBySlug(slug);
    const chunks: Buffer[] = [];
    const doc = new PDFDocument({ size: 'A4', margin: 48 });
    doc.on('data', (c) => chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c)));

    doc.fontSize(22).text(p.name, { align: 'left' });
    doc.moveDown(0.5);
    doc.fontSize(11).fillColor('#666666').text('Краткая презентация для клиента');
    doc.moveDown();

    doc.fillColor('#000000').fontSize(12);
    if (p.address) doc.text(`Адрес: ${p.address}`);
    if (p.builder) doc.text(`Застройщик: ${p.builder}`);
    if (p.metro) doc.text(`Метро: ${p.metro}`);
    if (p.imageUrl) doc.text(`Изображение: ${p.imageUrl}`);

    if (p.description?.trim()) {
      doc.moveDown();
      doc.fontSize(12).text('Описание:');
      doc.moveDown(0.3);
      doc.fontSize(11).fillColor('#1f1f1f').text(p.description.trim(), { align: 'left' });
    }

    doc.moveDown();
    doc.fontSize(9).fillColor('#888888').text(`Сформировано: ${new Date(p.generatedAt).toLocaleString('ru-RU')}`);
    doc.end();

    return await new Promise<Buffer>((resolve, reject) => {
      doc.once('end', () => resolve(Buffer.concat(chunks)));
      doc.once('error', reject);
    });
  }
}

