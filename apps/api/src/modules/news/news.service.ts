import { BadRequestException, Injectable, Logger, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { parseFeedXml, slugFromSourceUrl } from './news-rss.parser';

const RSS_SETTING_KEY = 'home_news_rss_url';
const DEFAULT_TELEGRAM_LIMIT_PER_CHANNEL = 20;

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

  private async getTgSessionStringForParser(): Promise<string> {
    const env = (process.env.TG_SESSION_STRING ?? '').trim();
    if (env) return env;
    const row = await this.prisma.siteSetting.findUnique({
      where: { key: 'tg_news_mtproto_session' },
      select: { value: true },
    });
    return (row?.value ?? '').trim();
  }

  async getTelegramParserStatus() {
    const apiIdRaw = (process.env.TG_API_ID ?? '').trim();
    const apiHash = (process.env.TG_API_HASH ?? '').trim();
    const sessionString = await this.getTgSessionStringForParser();
    const apiId = Number(apiIdRaw);
    const apiIdOk = Number.isInteger(apiId) && apiId > 0;
    const apiHashOk = apiHash.length > 0;
    const sessionOk = sessionString.length > 0;
    const [inDatabaseTotal, inDatabaseEnabled] = await Promise.all([
      this.prisma.newsTelegramChannel.count(),
      this.prisma.newsTelegramChannel.count({ where: { isEnabled: true } }),
    ]);
    const envListCount = (process.env.TG_NEWS_CHANNELS ?? '')
      .split(',')
      .map((v) => v.trim())
      .filter(Boolean).length;
    const credentialsOk = apiIdOk && apiHashOk && sessionOk;
    const hasChannelSource = inDatabaseEnabled > 0 || envListCount > 0;
    const hints: string[] = [];
    if (!apiIdOk || !apiHashOk) {
      hints.push('На сервере в .env задайте TG_API_ID и TG_API_HASH (см. https://my.telegram.org).');
    }
    if (!sessionOk) {
      hints.push(
        'Задайте TG_SESSION_STRING в .env сервера или выполните вход по QR в блоке «Новости из Telegram» ниже (сессия сохранится в БД).',
      );
    }
    if (!hasChannelSource) {
      hints.push('Добавьте хотя бы один канал ниже (или список TG_NEWS_CHANNELS в env как запасной вариант).');
    }
    if (credentialsOk && hasChannelSource) {
      hints.push('Можно нажать «Импортировать сейчас» — новые посты попадут в раздел «Новости» без дублей.');
    }
    return {
      ready: credentialsOk && hasChannelSource,
      credentialsOk,
      credentials: { apiIdOk, apiHashOk, sessionOk },
      channels: {
        inDatabaseTotal,
        inDatabaseEnabled,
        envListCount,
      },
      hints,
    };
  }

  listTelegramChannels() {
    return this.prisma.newsTelegramChannel.findMany({
      orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
    });
  }

  async createTelegramChannel(dto: {
    channelRef: string;
    label?: string | null;
    isEnabled?: boolean;
    limitPerRun?: number;
    publishOnImport?: boolean;
    sortOrder?: number;
  }) {
    const channelRef = this.normalizeTelegramChannelRef(dto.channelRef);
    if (!channelRef) {
      throw new BadRequestException('Укажите канал: @username, ссылку на t.me или числовой id (для приватных).');
    }
    const limitPerRun = this.clampTelegramLimit(dto.limitPerRun ?? DEFAULT_TELEGRAM_LIMIT_PER_CHANNEL);
    try {
      return await this.prisma.newsTelegramChannel.create({
        data: {
          channelRef,
          label: dto.label?.trim() ? dto.label.trim() : null,
          isEnabled: dto.isEnabled ?? true,
          limitPerRun,
          publishOnImport: dto.publishOnImport ?? true,
          sortOrder: dto.sortOrder ?? 0,
        },
      });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        throw new BadRequestException('Этот канал уже есть в списке.');
      }
      throw e;
    }
  }

  async updateTelegramChannel(
    id: number,
    dto: {
      channelRef?: string;
      label?: string | null;
      isEnabled?: boolean;
      limitPerRun?: number;
      publishOnImport?: boolean;
      sortOrder?: number;
    },
  ) {
    const existing = await this.prisma.newsTelegramChannel.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException(`Канал ${id} не найден`);

    const data: Prisma.NewsTelegramChannelUpdateInput = {};
    if (dto.channelRef !== undefined) {
      const channelRef = this.normalizeTelegramChannelRef(dto.channelRef);
      if (!channelRef) {
        throw new BadRequestException('Пустой идентификатор канала');
      }
      data.channelRef = channelRef;
    }
    if (dto.label !== undefined) data.label = dto.label?.trim() ? dto.label.trim() : null;
    if (dto.isEnabled !== undefined) data.isEnabled = dto.isEnabled;
    if (dto.limitPerRun !== undefined) data.limitPerRun = this.clampTelegramLimit(dto.limitPerRun);
    if (dto.publishOnImport !== undefined) data.publishOnImport = dto.publishOnImport;
    if (dto.sortOrder !== undefined) data.sortOrder = dto.sortOrder;

    try {
      return await this.prisma.newsTelegramChannel.update({ where: { id }, data });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        throw new BadRequestException('Такой канал уже есть в списке.');
      }
      throw e;
    }
  }

  async deleteTelegramChannel(id: number) {
    const existing = await this.prisma.newsTelegramChannel.findUnique({ where: { id }, select: { id: true } });
    if (!existing) throw new NotFoundException(`Канал ${id} не найден`);
    await this.prisma.newsTelegramChannel.delete({ where: { id } });
  }

  /**
   * Импорт новостей из Telegram-каналов через MTProto.
   * Источник каналов (по приоритету): одноразовый список `channels` в теле → включённые записи в БД
   * (можно сузить `onlyChannelIds`) → переменная окружения TG_NEWS_CHANNELS.
   * Env: TG_API_ID, TG_API_HASH; сессия: TG_SESSION_STRING в .env или site_settings tg_news_mtproto_session (QR в админке).
   */
  async syncFromTelegramChannels(input?: {
    channels?: string[] | null;
    limitPerChannel?: number | null;
    onlyChannelIds?: number[] | null;
  }) {
    const apiIdRaw = (process.env.TG_API_ID ?? '').trim();
    const apiHash = (process.env.TG_API_HASH ?? '').trim();
    const sessionString = await this.getTgSessionStringForParser();

    const apiId = Number(apiIdRaw);
    if (!Number.isInteger(apiId) || apiId <= 0 || !apiHash) {
      throw new BadRequestException(
        'TG_API_ID/TG_API_HASH не настроены на сервере. Получите их в https://my.telegram.org и добавьте в .env.',
      );
    }
    if (!sessionString) {
      throw new BadRequestException(
        'Нет MTProto-сессии: задайте TG_SESSION_STRING в .env или войдите по QR в админке → Новости.',
      );
    }

    const defaultLimit = this.clampTelegramLimit(input?.limitPerChannel ?? DEFAULT_TELEGRAM_LIMIT_PER_CHANNEL);
    const targets = await this.resolveTelegramSyncTargets(input, defaultLimit);
    if (targets.length === 0) {
      throw new BadRequestException(
        'Нет каналов для импорта: добавьте каналы в таблице ниже или задайте TG_NEWS_CHANNELS в env.',
      );
    }

    const { TelegramClient } = await import('telegram');
    const { StringSession } = await import('telegram/sessions');

    const session = new StringSession(sessionString);
    const client = new TelegramClient(session, apiId, apiHash, {
      connectionRetries: 3,
    });

    let imported = 0;
    let skipped = 0;
    const byChannel: Array<{ channel: string; imported: number; skipped: number }> = [];
    try {
      await client.connect();
      const authorized = await client.checkAuthorization();
      if (!authorized) {
        throw new BadRequestException(
          'MTProto-сессия не авторизована. Обновите TG_SESSION_STRING на сервере.',
        );
      }

      for (const item of targets) {
        let channelImported = 0;
        let channelSkipped = 0;
        try {
          const entity = await client.getEntity(item.ref);
          const messages = await client.getMessages(entity, { limit: item.limit });
          for (const msg of messages) {
            const text = this.telegramMessageText(msg);
            if (!text) {
              channelSkipped += 1;
              skipped += 1;
              continue;
            }
            const messageId = this.telegramMessageId(msg);
            const sourceUrl = this.telegramSourceUrl(item.ref, item.ref, messageId);
            if (!sourceUrl) {
              channelSkipped += 1;
              skipped += 1;
              continue;
            }
            const slug = this.telegramSlug(item.ref, messageId);
            const dupBySource = await this.prisma.news.findFirst({
              where: { sourceUrl },
              select: { id: true },
            });
            if (dupBySource) {
              channelSkipped += 1;
              skipped += 1;
              continue;
            }
            const dupBySlug = await this.prisma.news.findUnique({
              where: { slug },
              select: { id: true },
            });
            if (dupBySlug) {
              channelSkipped += 1;
              skipped += 1;
              continue;
            }

            const title = this.telegramTitle(text);
            const publishedAt = this.telegramMessageDate(msg) ?? new Date();
            await this.prisma.news.create({
              data: {
                slug,
                title,
                body: text,
                imageUrl: null,
                source: 'TELEGRAM_CHANNEL',
                sourceUrl,
                isPublished: item.publishOnImport,
                publishedAt: item.publishOnImport ? publishedAt : null,
              },
            });
            channelImported += 1;
            imported += 1;
          }
        } catch (e) {
          this.log.warn(
            `Telegram channel sync failed for "${item.ref}": ${e instanceof Error ? e.message : String(e)}`,
          );
        }
        byChannel.push({ channel: item.ref, imported: channelImported, skipped: channelSkipped });
      }
    } catch (e) {
      this.log.warn(`Telegram sync failed: ${e instanceof Error ? e.message : String(e)}`);
      if (e instanceof BadRequestException) throw e;
      throw new ServiceUnavailableException('Не удалось выполнить импорт из Telegram');
    } finally {
      await client.disconnect();
    }

    return {
      imported,
      skipped,
      channelsTotal: targets.length,
      defaultLimit,
      byChannel,
    };
  }

  private clampTelegramLimit(n: number): number {
    if (!Number.isFinite(n)) return DEFAULT_TELEGRAM_LIMIT_PER_CHANNEL;
    return Math.max(1, Math.min(100, Math.trunc(n)));
  }

  /** @username, ссылка t.me/… или числовой id. */
  private normalizeTelegramChannelRef(raw: string): string {
    const t = raw.trim();
    if (!t) return '';
    const urlMatch = t.match(/(?:https?:\/\/)?(?:t(?:elegram)?\.me|telegram\.me)\/([^/?#]+)/i);
    if (urlMatch) {
      const seg = urlMatch[1];
      if (/^-?\d+$/.test(seg)) return seg;
      const name = seg.startsWith('@') ? seg.slice(1) : seg;
      return `@${name.toLowerCase()}`;
    }
    if (/^-?\d+$/.test(t)) return t;
    const uname = t.startsWith('@') ? t.slice(1) : t;
    if (!uname) return '';
    return `@${uname.toLowerCase()}`;
  }

  private async resolveTelegramSyncTargets(
    input: { channels?: string[] | null; onlyChannelIds?: number[] | null } | undefined,
    defaultLimit: number,
  ): Promise<Array<{ ref: string; limit: number; publishOnImport: boolean }>> {
    const fromBody = (input?.channels ?? [])
      .map((c) => this.normalizeTelegramChannelRef(c))
      .filter(Boolean);
    if (fromBody.length > 0) {
      return fromBody.map((ref) => ({ ref, limit: defaultLimit, publishOnImport: true }));
    }

    const where: Prisma.NewsTelegramChannelWhereInput = { isEnabled: true };
    if (input?.onlyChannelIds?.length) {
      where.id = { in: input.onlyChannelIds };
    }
    const rows = await this.prisma.newsTelegramChannel.findMany({
      where,
      orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
    });
    if (rows.length > 0) {
      return rows.map((r) => ({
        ref: this.normalizeTelegramChannelRef(r.channelRef),
        limit: this.clampTelegramLimit(r.limitPerRun ?? defaultLimit),
        publishOnImport: r.publishOnImport,
      }));
    }

    const envList = (process.env.TG_NEWS_CHANNELS ?? '')
      .split(',')
      .map((v) => this.normalizeTelegramChannelRef(v))
      .filter(Boolean);
    return envList.map((ref) => ({ ref, limit: defaultLimit, publishOnImport: true }));
  }

  private telegramMessageText(msg: unknown): string | null {
    const value =
      msg && typeof msg === 'object' && 'message' in msg
        ? (msg as { message?: unknown }).message
        : null;
    if (typeof value !== 'string') return null;
    const text = value.trim();
    return text.length > 0 ? text : null;
  }

  private telegramMessageId(msg: unknown): number {
    const value =
      msg && typeof msg === 'object' && 'id' in msg
        ? (msg as { id?: unknown }).id
        : null;
    return typeof value === 'number' && Number.isFinite(value) ? Math.trunc(value) : 0;
  }

  private telegramMessageDate(msg: unknown): Date | null {
    const value =
      msg && typeof msg === 'object' && 'date' in msg
        ? (msg as { date?: unknown }).date
        : null;
    if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
    return null;
  }

  private telegramSourceUrl(channel: string, fallbackChannel: string, messageId: number): string | null {
    if (!messageId) return null;
    const clean = channel.replace(/^@/, '').trim() || fallbackChannel.replace(/^@/, '').trim();
    if (!clean) return null;
    return `https://t.me/${clean}/${messageId}`;
  }

  private telegramSlug(channel: string, messageId: number): string {
    const clean = channel
      .toLowerCase()
      .replace(/^@/, '')
      .replace(/[^a-z0-9_]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 48);
    const id = Math.max(0, Math.trunc(messageId));
    return `tg-${clean || 'channel'}-${id}`;
  }

  private telegramTitle(text: string): string {
    const line = text.split('\n').map((v) => v.trim()).find(Boolean) || 'Telegram news';
    return line.length > 140 ? `${line.slice(0, 137)}...` : line;
  }
}
