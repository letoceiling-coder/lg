import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class NewsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(page = 1, perPage = 20, publishedOnly = false) {
    const where = publishedOnly ? { isPublished: true } : {};
    const [data, total] = await Promise.all([
      this.prisma.news.findMany({
        where,
        orderBy: { publishedAt: 'desc' },
        skip: (page - 1) * perPage,
        take: perPage,
      }),
      this.prisma.news.count({ where }),
    ]);
    return {
      data,
      meta: { page, per_page: perPage, total, total_pages: Math.ceil(total / perPage) },
    };
  }

  async findBySlug(slug: string) {
    const row = await this.prisma.news.findUnique({ where: { slug } });
    if (!row) throw new NotFoundException(`News "${slug}" not found`);
    return row;
  }

  async create(dto: { title: string; slug: string; body?: string; imageUrl?: string; source?: string; sourceUrl?: string; isPublished?: boolean }) {
    return this.prisma.news.create({
      data: {
        title: dto.title,
        slug: dto.slug,
        body: dto.body ?? null,
        imageUrl: dto.imageUrl ?? null,
        source: dto.source ?? null,
        sourceUrl: dto.sourceUrl ?? null,
        isPublished: dto.isPublished ?? false,
        publishedAt: dto.isPublished ? new Date() : null,
      },
    });
  }

  async update(id: number, dto: { title?: string; slug?: string; body?: string; imageUrl?: string; source?: string; sourceUrl?: string; isPublished?: boolean }) {
    const existing = await this.prisma.news.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException(`News ${id} not found`);

    const data: Record<string, unknown> = {};
    if (dto.title !== undefined) data.title = dto.title;
    if (dto.slug !== undefined) data.slug = dto.slug;
    if (dto.body !== undefined) data.body = dto.body;
    if (dto.imageUrl !== undefined) data.imageUrl = dto.imageUrl;
    if (dto.source !== undefined) data.source = dto.source;
    if (dto.sourceUrl !== undefined) data.sourceUrl = dto.sourceUrl;
    if (dto.isPublished !== undefined) {
      data.isPublished = dto.isPublished;
      if (dto.isPublished && !existing.publishedAt) {
        data.publishedAt = new Date();
      }
    }

    return this.prisma.news.update({ where: { id }, data });
  }

  async remove(id: number) {
    const existing = await this.prisma.news.findUnique({ where: { id }, select: { id: true } });
    if (!existing) throw new NotFoundException(`News ${id} not found`);
    await this.prisma.news.delete({ where: { id } });
  }
}
