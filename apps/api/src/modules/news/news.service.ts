import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { mkdirSync, promises as fs } from 'node:fs';
import { join } from 'node:path';
import { PrismaService } from '../../prisma/prisma.service';
import { parseFeedXml, slugFromSourceUrl } from './news-rss.parser';

const RSS_SETTING_KEY = 'home_news_rss_url';
const DEFAULT_TELEGRAM_LIMIT_PER_CHANNEL = 20;
const MEDIA_PUBLIC_PREFIX = '/uploads/media/';

@Injectable()
export class NewsService implements OnModuleInit {
  private readonly log = new Logger(NewsService.name);
  private readonly mediaRoot: string;
  private rssTimer?: NodeJS.Timeout;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {
    this.mediaRoot = this.config.get<string>('MEDIA_ROOT') ?? join(process.cwd(), 'uploads');
  }

  onModuleInit() {
    if (this.config.get<string>('NEWS_RSS_SYNC_DISABLE') === 'true') {
      this.log.log('RSS news sync disabled (NEWS_RSS_SYNC_DISABLE)');
      return;
    }
    const intervalMs = Number(this.config.get<string>('NEWS_RSS_SYNC_INTERVAL_MS') ?? 6 * 60 * 60 * 1000);
    const safeInterval = Number.isFinite(intervalMs) && intervalMs > 0 ? intervalMs : 6 * 60 * 60 * 1000;
    this.rssTimer = setInterval(() => {
      this.syncFromRss().catch((e) =>
        this.log.warn(`Scheduled RSS news sync failed: ${e instanceof Error ? e.message : String(e)}`),
      );
    }, safeInterval);
    this.rssTimer.unref?.();
  }

  async findAll(page = 1, perPage = 20, publishedOnly = false, regionId?: number | null) {
    const where: Prisma.NewsWhereInput = publishedOnly ? { isPublished: true } : {};
    const regionFilter = this.normalizeRegionId(regionId);
    if (regionFilter != null) {
      if (publishedOnly) {
        where.OR = [{ regionId: regionFilter }, { regionId: null }];
      } else {
        where.regionId = regionFilter;
      }
    }
    const [data, total] = await Promise.all([
      this.prisma.news.findMany({
        where,
        orderBy: [{ publishedAt: 'desc' }, { createdAt: 'desc' }],
        skip: (page - 1) * perPage,
        take: perPage,
      }),
      this.prisma.news.count({ where }),
    ]);
    return {
      data: await this.attachMediaToNewsRows(data),
      meta: { page, per_page: perPage, total, total_pages: Math.ceil(total / perPage) },
    };
  }

  async findBySlug(slug: string) {
    const row = await this.prisma.news.findUnique({ where: { slug } });
    if (!row) throw new NotFoundException(`News "${slug}" not found`);
    const [mapped] = await this.attachMediaToNewsRows([row]);
    return mapped ?? row;
  }

  async create(dto: {
    title: string;
    slug: string;
    body?: string;
    imageUrl?: string;
    source?: string;
    sourceUrl?: string;
    isPublished?: boolean;
    regionId?: number | null;
    mediaFileIds?: number[] | null;
  }) {
    const regionId = this.normalizeRegionId(dto.regionId);
    if (regionId != null) {
      await this.ensureRegionExists(regionId);
    }
    const created = await this.prisma.news.create({
      data: {
        title: dto.title,
        slug: dto.slug,
        body: dto.body ?? null,
        imageUrl: dto.imageUrl ?? null,
        regionId,
        source: dto.source ?? null,
        sourceUrl: dto.sourceUrl ?? null,
        isPublished: dto.isPublished ?? false,
        publishedAt: dto.isPublished ? new Date() : null,
      },
    });
    const mediaFileIds = this.normalizeMediaFileIds(dto.mediaFileIds);
    if (mediaFileIds.length > 0) {
      await this.linkNewsMedia(created.id, mediaFileIds);
    }
    const row = await this.prisma.news.findUnique({ where: { id: created.id } });
    const [mapped] = await this.attachMediaToNewsRows(row ? [row] : []);
    return mapped ?? created;
  }

  async update(
    id: number,
    dto: {
      title?: string;
      slug?: string;
      body?: string;
      imageUrl?: string;
      source?: string;
      sourceUrl?: string;
      isPublished?: boolean;
      regionId?: number | null;
      mediaFileIds?: number[] | null;
    },
  ) {
    const existing = await this.prisma.news.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException(`News ${id} not found`);

    const data: Record<string, unknown> = {};
    if (dto.title !== undefined) data.title = dto.title;
    if (dto.slug !== undefined) data.slug = dto.slug;
    if (dto.body !== undefined) data.body = dto.body;
    if (dto.imageUrl !== undefined) data.imageUrl = dto.imageUrl;
    if (dto.regionId !== undefined) {
      const regionId = this.normalizeRegionId(dto.regionId);
      if (regionId != null) {
        await this.ensureRegionExists(regionId);
      }
      data.regionId = regionId;
    }
    if (dto.source !== undefined) data.source = dto.source;
    if (dto.sourceUrl !== undefined) data.sourceUrl = dto.sourceUrl;
    if (dto.isPublished !== undefined) {
      data.isPublished = dto.isPublished;
      if (dto.isPublished && !existing.publishedAt) {
        data.publishedAt = new Date();
      }
    }
    const mediaFileIds = dto.mediaFileIds !== undefined ? this.normalizeMediaFileIds(dto.mediaFileIds) : null;

    const updated = await this.prisma.news.update({ where: { id }, data });
    if (mediaFileIds != null) {
      await this.linkNewsMedia(id, mediaFileIds);
    }
    const row = await this.prisma.news.findUnique({ where: { id: updated.id } });
    const [mapped] = await this.attachMediaToNewsRows(row ? [row] : []);
    return mapped ?? updated;
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
    const envSessionString = (process.env.TG_SESSION_STRING ?? '').trim();
    const apiId = Number(apiIdRaw);
    const apiIdOk = Number.isInteger(apiId) && apiId > 0;
    const apiHashOk = apiHash.length > 0;
    const [inDatabaseTotal, inDatabaseEnabled, mtprotoSessionRow] = await Promise.all([
      this.prisma.newsTelegramChannel.count(),
      this.prisma.newsTelegramChannel.count({ where: { isEnabled: true } }),
      this.prisma.siteSetting.findUnique({
        where: { key: 'tg_news_mtproto_session' },
        select: { value: true, updatedAt: true },
      }),
    ]);
    const dbSessionString = (mtprotoSessionRow?.value ?? '').trim();
    const sessionString = envSessionString || dbSessionString;
    const sessionOk = sessionString.length > 0;
    const sessionSource: 'env' | 'database' | 'none' = envSessionString
      ? 'env'
      : dbSessionString
        ? 'database'
        : 'none';
    const lastConnectedAt =
      dbSessionString && mtprotoSessionRow?.updatedAt
        ? mtprotoSessionRow.updatedAt.toISOString()
        : null;
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
      telegramAuth: {
        connected: sessionOk,
        sessionSource,
        lastConnectedAt,
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
    regionId: number;
    channelRef: string;
    label?: string | null;
    isEnabled?: boolean;
    limitPerRun?: number;
    publishOnImport?: boolean;
    sortOrder?: number;
  }) {
    const regionId = this.requireRegionId(dto.regionId);
    await this.ensureRegionExists(regionId);
    const channelRef = this.normalizeTelegramChannelRef(dto.channelRef);
    if (!channelRef) {
      throw new BadRequestException('Укажите канал: @username, ссылку на t.me или числовой id (для приватных).');
    }
    const limitPerRun = this.clampTelegramLimit(dto.limitPerRun ?? DEFAULT_TELEGRAM_LIMIT_PER_CHANNEL);
    try {
      return await this.prisma.newsTelegramChannel.create({
        data: {
          regionId,
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
        throw new BadRequestException('Этот канал уже есть в списке для выбранного города.');
      }
      throw e;
    }
  }

  async updateTelegramChannel(
    id: number,
    dto: {
      regionId?: number;
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
    if (dto.regionId !== undefined) {
      const regionId = this.requireRegionId(dto.regionId);
      await this.ensureRegionExists(regionId);
      data.region = { connect: { id: regionId } };
    }
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
        throw new BadRequestException('Такой канал уже есть в списке для выбранного города.');
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
        let telegramFolderId: number | null = null;
        try {
          const entity = await client.getEntity(item.ref);
          const messages = await client.getMessages(entity, { limit: item.limit });
          const groupedMessages = new Map<string, unknown[]>();
          for (const m of messages) {
            const key = this.telegramMessageGroupKey(m);
            if (!key) continue;
            const bucket = groupedMessages.get(key);
            if (bucket) bucket.push(m);
            else groupedMessages.set(key, [m]);
          }
          const usedGroups = new Set<string>();

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
            const groupKey = this.telegramMessageGroupKey(msg);
            let mediaMessages: unknown[] = [msg];
            if (groupKey) {
              if (usedGroups.has(groupKey)) {
                channelSkipped += 1;
                skipped += 1;
                continue;
              }
              mediaMessages = groupedMessages.get(groupKey) ?? [msg];
              usedGroups.add(groupKey);
            }
            const savedPhotos = await this.trySaveTelegramPhotos(
              client,
              mediaMessages,
              item.ref,
              telegramFolderId,
            );
            const firstPhoto = savedPhotos[0] ?? null;
            if (firstPhoto?.folderId != null) {
              telegramFolderId = firstPhoto.folderId;
            }
            const created = await this.prisma.news.create({
              data: {
                slug,
                title,
                body: text,
                imageUrl: firstPhoto?.url ?? null,
                regionId: item.regionId ?? null,
                source: 'TELEGRAM_CHANNEL',
                sourceUrl,
                isPublished: item.publishOnImport,
                publishedAt: item.publishOnImport ? publishedAt : null,
              },
            });
            for (const photo of savedPhotos) {
              await this.prisma.mediaFile
                .update({
                  where: { id: photo.mediaFileId },
                  data: { entityType: 'NEWS', entityId: created.id },
                })
                .catch((e) =>
                  this.log.warn(
                    `Failed to link Telegram media file ${photo.mediaFileId} to news ${created.id}: ${
                      e instanceof Error ? e.message : String(e)
                    }`,
                  ),
                );
            }
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

  /**
   * Дозагрузка фото для ранее импортированных Telegram-новостей, где imageUrl пустой.
   * Берём sourceUrl вида https://t.me/<channel>/<messageId>, читаем сообщение и пробуем скачать медиа.
   */
  async backfillTelegramNewsPhotos(limitRaw?: number | null) {
    const apiIdRaw = (process.env.TG_API_ID ?? '').trim();
    const apiHash = (process.env.TG_API_HASH ?? '').trim();
    const sessionString = await this.getTgSessionStringForParser();
    const apiId = Number(apiIdRaw);
    if (!Number.isInteger(apiId) || apiId <= 0 || !apiHash) {
      throw new BadRequestException('TG_API_ID/TG_API_HASH не настроены на сервере.');
    }
    if (!sessionString) {
      throw new BadRequestException('Нет MTProto-сессии для Telegram.');
    }

    const limit = Math.max(1, Math.min(200, Math.trunc(Number(limitRaw) || 30)));
    const candidates = await this.prisma.news.findMany({
      where: {
        source: 'TELEGRAM_CHANNEL',
        OR: [{ imageUrl: null }, { imageUrl: '' }],
        sourceUrl: { not: null },
      },
      orderBy: [{ id: 'desc' }],
      take: limit,
      select: {
        id: true,
        slug: true,
        sourceUrl: true,
      },
    });
    if (candidates.length === 0) {
      return { scanned: 0, updated: 0, skipped: 0, failed: 0 };
    }

    const { TelegramClient } = await import('telegram');
    const { StringSession } = await import('telegram/sessions');
    const session = new StringSession(sessionString);
    const client = new TelegramClient(session, apiId, apiHash, {
      connectionRetries: 3,
    });

    let updated = 0;
    let skipped = 0;
    let failed = 0;
    const folderByChannel = new Map<string, number>();

    try {
      await client.connect();
      const authorized = await client.checkAuthorization();
      if (!authorized) {
        throw new BadRequestException('MTProto-сессия не авторизована.');
      }

      for (const row of candidates) {
        const parsed = this.parseTelegramPostUrl(row.sourceUrl ?? '');
        if (!parsed) {
          skipped += 1;
          continue;
        }
        try {
          const entity = await client.getEntity(parsed.channelRef);
          const loaded = await client.getMessages(entity, { ids: [parsed.messageId] });
          const msg = Array.isArray(loaded) ? loaded[0] : loaded;
          if (!msg) {
            skipped += 1;
            continue;
          }
          const knownFolderId = folderByChannel.get(parsed.channelRef) ?? null;
          const saved = await this.trySaveTelegramPhoto(
            client,
            msg,
            parsed.channelRef,
            parsed.messageId,
            knownFolderId,
          );
          if (!saved) {
            skipped += 1;
            continue;
          }
          folderByChannel.set(parsed.channelRef, saved.folderId);
          await this.prisma.news.update({
            where: { id: row.id },
            data: { imageUrl: saved.url },
          });
          await this.prisma.mediaFile.update({
            where: { id: saved.mediaFileId },
            data: { entityType: 'NEWS', entityId: row.id },
          });
          updated += 1;
        } catch (e) {
          this.log.warn(
            `Telegram photo backfill failed for news ${row.id} (${row.slug}): ${
              e instanceof Error ? e.message : String(e)
            }`,
          );
          failed += 1;
        }
      }
    } finally {
      await client.disconnect();
    }

    return {
      scanned: candidates.length,
      updated,
      skipped,
      failed,
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
  ): Promise<Array<{ ref: string; limit: number; publishOnImport: boolean; regionId: number | null }>> {
    const fromBody = (input?.channels ?? [])
      .map((c) => this.normalizeTelegramChannelRef(c))
      .filter(Boolean);
    if (fromBody.length > 0) {
      return fromBody.map((ref) => ({ ref, limit: defaultLimit, publishOnImport: true, regionId: null }));
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
        regionId: r.regionId,
      }));
    }

    const envList = (process.env.TG_NEWS_CHANNELS ?? '')
      .split(',')
      .map((v) => this.normalizeTelegramChannelRef(v))
      .filter(Boolean);
    return envList.map((ref) => ({ ref, limit: defaultLimit, publishOnImport: true, regionId: null }));
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

  private async trySaveTelegramPhoto(
    client: { downloadMedia?: (msg: unknown, opts?: Record<string, unknown>) => Promise<unknown> },
    msg: unknown,
    channelRef: string,
    messageId: number,
    knownFolderId: number | null,
  ): Promise<{ url: string; mediaFileId: number; folderId: number } | null> {
    if (!msg || typeof msg !== 'object' || typeof client.downloadMedia !== 'function') {
      return null;
    }

    // GramJS: фото может лежать напрямую в `photo`, в `media`, либо как превью ссылки `media.webpage.photo`.
    // Для надёжности находим «насыщенный» объект media и передаём его в downloadMedia.
    const root: any = msg;
    const directPhoto = 'photo' in root ? root.photo : null;
    const media = 'media' in root ? root.media : null;
    const webpagePhoto = media && typeof media === 'object' && 'webpage' in media && (media as any).webpage
      ? (media as any).webpage.photo ?? null
      : null;

    const target = webpagePhoto || directPhoto || media || msg;
    const hasPhoto = Boolean(webpagePhoto || directPhoto || media);
    if (!hasPhoto) return null;

    try {
      // Telegram media download can hang for a long time on blocked/unstable 443 routes.
      // We cap photo fetch time so one bad media item doesn't block whole channel import.
      const mediaPromise = client.downloadMedia(target, {});
      void mediaPromise.catch(() => undefined);
      const raw = await this.withTimeout(mediaPromise, 10_000, 'Telegram media download timeout');
      const buffer = this.toBuffer(raw);
      if (!buffer || buffer.length === 0) return null;

      const folderId = knownFolderId ?? (await this.ensureTelegramFolder(channelRef));
      const storedName = `${randomUUID()}.jpg`;
      const absDir = join(this.mediaRoot, 'media');
      mkdirSync(absDir, { recursive: true });
      const absPath = join(absDir, storedName);
      await fs.writeFile(absPath, buffer);

      const url = `${MEDIA_PUBLIC_PREFIX}${storedName}`;
      const media = await this.prisma.mediaFile.create({
        data: {
          kind: 'PHOTO',
          url,
          originalFilename: `tg-${this.telegramFolderSuffix(channelRef)}-${messageId}.jpg`,
          sizeBytes: BigInt(buffer.length),
          folderId,
          uploadedBy: null,
        },
      });
      return { url, mediaFileId: media.id, folderId };
    } catch (e) {
      this.log.warn(
        `Telegram photo save failed for ${channelRef}/${messageId}: ${e instanceof Error ? e.message : String(e)}`,
      );
      return null;
    }
  }

  private async trySaveTelegramPhotos(
    client: { downloadMedia?: (msg: unknown, opts?: Record<string, unknown>) => Promise<unknown> },
    messages: unknown[],
    channelRef: string,
    knownFolderId: number | null,
  ): Promise<Array<{ url: string; mediaFileId: number; folderId: number }>> {
    const out: Array<{ url: string; mediaFileId: number; folderId: number }> = [];
    let folderId = knownFolderId;
    for (const msg of messages) {
      const messageId = this.telegramMessageId(msg);
      const saved = await this.trySaveTelegramPhoto(client, msg, channelRef, messageId, folderId);
      if (!saved) continue;
      folderId = saved.folderId;
      out.push(saved);
    }
    return out;
  }

  private toBuffer(value: unknown): Buffer | null {
    if (Buffer.isBuffer(value)) return value;
    if (value instanceof Uint8Array) return Buffer.from(value);
    if (value instanceof ArrayBuffer) return Buffer.from(new Uint8Array(value));
    return null;
  }

  private async ensureTelegramFolder(channelRef: string): Promise<number> {
    const name = `ТГ-${this.telegramFolderSuffix(channelRef)}`;
    const existing = await this.prisma.mediaFolder.findFirst({
      where: { parentId: null, isTrash: false, name },
      select: { id: true },
    });
    if (existing) return existing.id;
    try {
      const created = await this.prisma.mediaFolder.create({
        data: { parentId: null, name, isTrash: false },
        select: { id: true },
      });
      return created.id;
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        const retry = await this.prisma.mediaFolder.findFirst({
          where: { parentId: null, isTrash: false, name },
          select: { id: true },
        });
        if (retry) return retry.id;
      }
      throw e;
    }
  }

  private telegramFolderSuffix(channelRef: string): string {
    const raw = channelRef.replace(/^@/, '').trim().toLowerCase();
    const clean = raw
      .replace(/[^a-zа-яё0-9_-]+/gi, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 80);
    return clean || 'kanal';
  }

  private parseTelegramPostUrl(url: string): { channelRef: string; messageId: number } | null {
    const trimmed = (url ?? '').trim();
    const m = trimmed.match(/^https?:\/\/t\.me\/([^/?#]+)\/(\d+)(?:[/?#].*)?$/i);
    if (!m) return null;
    const channelRef = this.normalizeTelegramChannelRef(m[1] ?? '');
    const messageId = Number(m[2]);
    if (!channelRef || !Number.isInteger(messageId) || messageId <= 0) return null;
    return { channelRef, messageId };
  }

  private telegramMessageGroupKey(msg: unknown): string | null {
    if (!msg || typeof msg !== 'object' || !('groupedId' in msg)) return null;
    const raw = (msg as { groupedId?: unknown }).groupedId;
    if (raw == null) return null;
    if (typeof raw === 'string' || typeof raw === 'number' || typeof raw === 'bigint') return String(raw);
    if (typeof raw === 'object' && raw != null && 'toString' in raw && typeof raw.toString === 'function') {
      const v = raw.toString();
      return v && v !== '[object Object]' ? v : null;
    }
    return null;
  }

  private normalizeMediaFileIds(value: unknown): number[] {
    if (!Array.isArray(value)) return [];
    const set = new Set<number>();
    for (const item of value) {
      const n = Number(item);
      if (!Number.isInteger(n) || n <= 0) continue;
      set.add(n);
    }
    return Array.from(set);
  }

  private async linkNewsMedia(newsId: number, mediaFileIds: number[]): Promise<void> {
    const existing = await this.prisma.news.findUnique({
      where: { id: newsId },
      select: { id: true },
    });
    if (!existing) throw new NotFoundException(`News ${newsId} not found`);

    const files =
      mediaFileIds.length > 0
        ? await this.prisma.mediaFile.findMany({
            where: { id: { in: mediaFileIds } },
            select: { id: true, url: true },
          })
        : [];
    if (files.length !== mediaFileIds.length) {
      throw new BadRequestException('Часть выбранных медиафайлов не найдена.');
    }

    await this.prisma.mediaFile.updateMany({
      where: {
        entityType: 'NEWS',
        entityId: newsId,
        ...(mediaFileIds.length > 0 ? { id: { notIn: mediaFileIds } } : {}),
      },
      data: { entityType: null, entityId: null },
    });

    if (mediaFileIds.length > 0) {
      await this.prisma.mediaFile.updateMany({
        where: { id: { in: mediaFileIds } },
        data: { entityType: 'NEWS', entityId: newsId },
      });
    }

    const fileById = new Map(files.map((f) => [f.id, f]));
    const primary = mediaFileIds.map((id) => fileById.get(id)).find((x) => !!x)?.url ?? null;
    await this.prisma.news.update({
      where: { id: newsId },
      data: { imageUrl: primary },
    });
  }

  private async attachMediaToNewsRows<T extends { id: number; imageUrl: string | null }>(
    rows: T[],
  ): Promise<Array<T & { mediaFiles: Array<{ id: number; url: string }> }>> {
    if (rows.length === 0) return [];
    const ids = rows.map((r) => r.id);
    const media = await this.prisma.mediaFile.findMany({
      where: {
        entityType: 'NEWS',
        entityId: { in: ids },
      },
      orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
      select: { id: true, entityId: true, url: true },
    });
    const byNews = new Map<number, Array<{ id: number; url: string }>>();
    for (const m of media) {
      if (m.entityId == null) continue;
      const arr = byNews.get(m.entityId) ?? [];
      arr.push({ id: m.id, url: m.url });
      byNews.set(m.entityId, arr);
    }
    return rows.map((row) => {
      const mediaFiles = byNews.get(row.id) ?? [];
      const fallbackImage = mediaFiles[0]?.url ?? row.imageUrl ?? null;
      return { ...row, imageUrl: fallbackImage, mediaFiles };
    });
  }

  private async withTimeout<T>(promise: Promise<T>, timeoutMs: number, message: string): Promise<T> {
    let timer: NodeJS.Timeout | null = null;
    try {
      return await Promise.race<T>([
        promise,
        new Promise<T>((_, reject) => {
          timer = setTimeout(() => reject(new Error(message)), timeoutMs);
        }),
      ]);
    } finally {
      if (timer) clearTimeout(timer);
    }
  }

  private normalizeRegionId(value: unknown): number | null {
    if (value == null || value === '') return null;
    const n = Number(value);
    if (!Number.isInteger(n) || n <= 0) return null;
    return n;
  }

  private requireRegionId(value: unknown): number {
    const regionId = this.normalizeRegionId(value);
    if (regionId == null) {
      throw new BadRequestException('Выберите город (regionId).');
    }
    return regionId;
  }

  private async ensureRegionExists(regionId: number): Promise<void> {
    const row = await this.prisma.feedRegion.findUnique({
      where: { id: regionId },
      select: { id: true },
    });
    if (!row) {
      throw new BadRequestException('Выбранный город не найден.');
    }
  }
}
