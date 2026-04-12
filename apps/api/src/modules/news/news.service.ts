import { BadRequestException, Injectable, Logger, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { parseFeedXml, slugFromSourceUrl } from './news-rss.parser';

const RSS_SETTING_KEY = 'home_news_rss_url';

@Injectable()
export class NewsService {
  private readonly log = new Logger(NewsService.name);

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

  private async getHomeNewsRssUrl(): Promise<string> {
    const row = await this.prisma.siteSetting.findUnique({ where: { key: RSS_SETTING_KEY } });
    return (row?.value ?? '').trim();
  }

  /**
   * Импорт из RSS/Atom: новые записи по `sourceUrl`, без дублей.
   * URL — из тела запроса или настройки `home_news_rss_url` (группа «Главная» в админке).
   */
  async syncFromRss(urlOverride?: string | null) {
    const url = (urlOverride ?? '').trim() || (await this.getHomeNewsRssUrl());
    if (!url) {
      throw new BadRequestException(
        'Не задан URL ленты: укажите его в запросе или в настройках сайта (ключ home_news_rss_url).',
      );
    }
    if (!/^https?:\/\//i.test(url)) {
      throw new BadRequestException('URL ленты должен начинаться с http:// или https://');
    }

    let xml: string;
    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': 'LiveGrid-NewsSync/1.0 (+https://livegrid)' },
        redirect: 'follow',
        signal: AbortSignal.timeout(25_000),
      });
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      xml = await res.text();
    } catch (e) {
      this.log.warn(`RSS fetch failed for ${url}: ${e instanceof Error ? e.message : String(e)}`);
      throw new ServiceUnavailableException('Не удалось загрузить RSS-ленту');
    }

    const items = parseFeedXml(xml);
    if (items.length === 0) {
      throw new BadRequestException('В ответе не найдено элементов RSS/Atom или формат не распознан');
    }

    let imported = 0;
    let skipped = 0;
    for (const item of items) {
      const dup = await this.prisma.news.findFirst({
        where: { sourceUrl: item.sourceUrl },
        select: { id: true },
      });
      if (dup) {
        skipped += 1;
        continue;
      }
      const slug = slugFromSourceUrl(item.sourceUrl);
      const slugBusy = await this.prisma.news.findUnique({ where: { slug }, select: { id: true } });
      if (slugBusy) {
        skipped += 1;
        continue;
      }
      try {
        await this.prisma.news.create({
          data: {
            slug,
            title: item.title,
            body: item.body,
            imageUrl: item.imageUrl,
            source: 'RSS',
            sourceUrl: item.sourceUrl,
            isPublished: true,
            publishedAt: item.publishedAt ?? new Date(),
          },
        });
        imported += 1;
      } catch (e) {
        this.log.warn(`RSS row skip ${item.sourceUrl}: ${e instanceof Error ? e.message : String(e)}`);
        skipped += 1;
      }
    }

    return { imported, skipped, totalInFeed: items.length, feedUrl: url };
  }
}
