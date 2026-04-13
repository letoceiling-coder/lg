import {
  Injectable,
  Logger,
  ConflictException,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { ListingKind, ListingStatus } from '@prisma/client';
import { ConfigService } from '@nestjs/config';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '../../prisma/prisma.service';
import { FeedFetcherService } from './feed-fetcher.service';
import { FeedProcessorService } from './feed-processor.service';
import {
  FEED_IMPORT_QUEUE,
  FEED_IMPORT_JOB_RUN,
} from './feed-import.constants';
import type { FeedImportBatchJob } from './feed-import.types';
import { BlocksService } from '../blocks/blocks.service';

export interface ImportProgress {
  step: string;
  detail?: string;
  percent: number;
}

@Injectable()
export class FeedImportService implements OnModuleInit {
  private readonly logger = new Logger(FeedImportService.name);
  private currentProgress: ImportProgress | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly fetcher: FeedFetcherService,
    private readonly processor: FeedProcessorService,
    private readonly config: ConfigService,
    private readonly blocks: BlocksService,
    @InjectQueue(FEED_IMPORT_QUEUE)
    private readonly feedImportQueue: Queue,
  ) {}

  async onModuleInit() {
    if (this.config.get('FEED_IMPORT_DISABLE_REPEAT') === 'true') {
      this.logger.log('Repeatable feed import cron disabled (FEED_IMPORT_DISABLE_REPEAT)');
      return;
    }
    const pattern = this.config.get<string>('FEED_IMPORT_CRON') || '0 3 * * 2';
    const regionCodes = await this.resolveCronRegionCodes();
    if (!regionCodes.length) {
      this.logger.warn('No valid regions resolved for repeatable import cron registration');
      return;
    }
    try {
      for (const regionCode of regionCodes) {
        await this.feedImportQueue.add(
          FEED_IMPORT_JOB_RUN,
          { regionCode },
          {
            repeat: { pattern },
            jobId: `feed-import-repeat-${regionCode}`,
          },
        );
      }
      this.logger.log(
        `Registered BullMQ repeatable import: pattern="${pattern}" regions=${regionCodes.join(',')}`,
      );
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      this.logger.warn(`Could not register repeatable feed import (Redis unavailable?): ${msg}`);
    }
  }

  getProgress(): ImportProgress | null {
    return this.currentProgress;
  }

  /**
   * Ручной запуск: создаёт import_batch и ставит задачу в BullMQ.
   */
  async triggerImport(regionCode: string, triggeredBy?: string) {
    const payload = await this.createPendingBatch(this.normalizeRegionCode(regionCode), triggeredBy);
    await this.feedImportQueue.add(FEED_IMPORT_JOB_RUN, payload, {
      removeOnComplete: { count: 50 },
      attempts: 1,
    });
    return { batchId: payload.batchId, status: 'QUEUED' as const };
  }

  async triggerImportForEnabledRegions(triggeredBy?: string) {
    const rows = await this.prisma.feedRegion.findMany({
      where: { isEnabled: true },
      orderBy: { id: 'asc' },
      select: { code: true },
    });
    if (!rows.length) throw new NotFoundException('Нет включённых регионов для импорта');

    const queued: Array<{ region: string; batchId: number }> = [];
    const skipped: Array<{ region: string; reason: string }> = [];
    for (const row of rows) {
      const code = this.normalizeRegionCode(row.code);
      try {
        const result = await this.triggerImport(code, triggeredBy);
        queued.push({ region: code, batchId: result.batchId });
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        skipped.push({ region: code, reason: msg });
      }
    }
    return {
      status: 'QUEUED',
      queued,
      skipped,
      total: rows.length,
    };
  }

  /**
   * Планировщик (вторник и т.д.): при отсутствии активного импорта создаёт batch и выполняет импорт в воркере.
   */
  async runScheduledImport(regionCode: string) {
    const region = await this.prisma.feedRegion.findUnique({
      where: { code: regionCode },
    });
    if (!region) {
      this.logger.error(`Scheduled import: region not found: ${regionCode}`);
      return;
    }

    const running = await this.prisma.importBatch.findFirst({
      where: { regionId: region.id, status: 'RUNNING' },
    });
    if (running) {
      this.logger.warn(
        `Scheduled import skipped: import already running (batch ${running.id})`,
      );
      return;
    }

    const batch = await this.prisma.importBatch.create({
      data: {
        regionId: region.id,
        status: 'PENDING',
        triggeredBy: null,
      },
    });

    await this.executeBatch({
      batchId: batch.id,
      regionId: region.id,
      regionCode,
    });
  }

  private async createPendingBatch(
    regionCode: string,
    triggeredBy?: string,
  ): Promise<FeedImportBatchJob> {
    const region = await this.prisma.feedRegion.findUnique({
      where: { code: regionCode },
    });
    if (!region) {
      throw new NotFoundException(`Region not found: ${regionCode}`);
    }

    const running = await this.prisma.importBatch.findFirst({
      where: { regionId: region.id, status: 'RUNNING' },
    });
    if (running) {
      throw new ConflictException('Import already running');
    }

    const batch = await this.prisma.importBatch.create({
      data: {
        regionId: region.id,
        status: 'PENDING',
        triggeredBy: triggeredBy || null,
      },
    });

    return { batchId: batch.id, regionId: region.id, regionCode };
  }

  /**
   * Выполняет импорт для уже созданного batch (вызывается из BullMQ worker).
   */
  async executeBatch({
    batchId,
    regionId,
    regionCode,
  }: FeedImportBatchJob): Promise<void> {
    const stats: Record<string, number> = {};
    const errors: string[] = [];

    try {
      this.setProgress('Downloading about.json', undefined, 5);

      await this.prisma.importBatch.update({
        where: { id: batchId },
        data: { status: 'RUNNING', startedAt: new Date() },
      });

      const about = await this.fetcher.fetchAbout(regionCode);
      const exportedAt = about[0]?.exported_at;

      await this.prisma.importBatch.update({
        where: { id: batchId },
        data: { feedExportedAt: exportedAt ? new Date(exportedAt) : null },
      });

      const fileMap = new Map(about.map((e) => [e.name, e.url]));

      const refFiles = [
        { name: 'rooms', process: (d: any[]) => this.processor.processRooms(d) },
        { name: 'finishings', process: (d: any[]) => this.processor.processFinishings(d) },
        {
          name: 'buildingtypes',
          process: (d: any[]) => this.processor.processBuildingTypes(d),
        },
        { name: 'regions', process: (d: any[]) => this.processor.processDistricts(d, regionId) },
        { name: 'subways', process: (d: any[]) => this.processor.processSubways(d, regionId) },
        { name: 'builders', process: (d: any[]) => this.processor.processBuilders(d, regionId) },
      ];

      for (let i = 0; i < refFiles.length; i++) {
        const rf = refFiles[i];
        const url = fileMap.get(rf.name);
        if (!url) {
          errors.push(`Missing feed file: ${rf.name}`);
          continue;
        }

        this.setProgress(`Processing ${rf.name}`, url, 10 + i * 3);
        try {
          const data = await this.fetcher.fetchFeedFile(url);
          stats[`${rf.name}_upserted`] = await rf.process(data);
        } catch (err: any) {
          errors.push(`${rf.name}: ${err.message}`);
          this.logger.error(`Error processing ${rf.name}: ${err.message}`);
        }
      }

      const blocksUrl = fileMap.get('blocks');
      if (blocksUrl) {
        this.setProgress('Processing blocks', blocksUrl, 30);
        try {
          const blocksData = await this.fetcher.fetchFeedFile(blocksUrl);
          stats.blocks_upserted = await this.processor.processBlocks(blocksData, regionId);
        } catch (err: unknown) {
          errors.push(`blocks: ${err instanceof Error ? err.message : String(err)}`);
        }
      }

      const buildingsUrl = fileMap.get('buildings');
      if (buildingsUrl) {
        this.setProgress('Processing buildings', buildingsUrl, 45);
        try {
          const buildingsData = await this.fetcher.fetchFeedFile(buildingsUrl);
          stats.buildings_upserted =
            await this.processor.processBuildings(buildingsData, regionId);
        } catch (err: unknown) {
          errors.push(`buildings: ${err instanceof Error ? err.message : String(err)}`);
        }
      }

      const apartmentsUrl = fileMap.get('apartments');
      if (apartmentsUrl) {
        this.setProgress('Downloading apartments', apartmentsUrl, 60);
        try {
          const aptData = await this.fetcher.fetchFeedFile(apartmentsUrl);
          this.setProgress('Processing apartments', `${aptData.length} items`, 65);
          stats.apartments_upserted =
            await this.processor.processApartments(aptData, regionId);
        } catch (err: unknown) {
          errors.push(`apartments: ${err instanceof Error ? err.message : String(err)}`);
        }
      }

      this.setProgress('Deriving block statuses', undefined, 95);
      try {
        stats.block_statuses_updated =
          await this.processor.deriveBlockStatuses(regionId);
      } catch (err: unknown) {
        errors.push(`block_statuses: ${err instanceof Error ? err.message : String(err)}`);
      }

      this.setProgress('Finalizing', undefined, 98);

      await this.prisma.importBatch.update({
        where: { id: batchId },
        data: {
          status: 'COMPLETED',
          finishedAt: new Date(),
          stats: { ...stats, errors },
        },
      });

      await this.prisma.feedRegion.update({
        where: { id: regionId },
        data: { lastImportedAt: new Date() },
      });

      try {
        await this.refreshCatalogSearchCache();
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        errors.push(`catalog_mv_refresh: ${msg}`);
        this.logger.warn(`catalog_apartment_active_mv refresh failed: ${msg}`);
      }

      this.setProgress('Completed', JSON.stringify(stats), 100);
      this.logger.log(`Import batch ${batchId} completed: ${JSON.stringify(stats)}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      const stack = err instanceof Error ? err.stack : undefined;
      this.logger.error(`Import batch ${batchId} failed: ${msg}`, stack);

      await this.prisma.importBatch.update({
        where: { id: batchId },
        data: {
          status: 'FAILED',
          finishedAt: new Date(),
          errorMessage: msg,
          stats: { ...stats, errors: [...errors, msg] },
        },
      });

      this.setProgress('Failed', msg, 0);
    }
  }

  /**
   * Отчёт «фид TrendAgent vs БД» для сопоставления с витриной (например, msk.trendagent.ru).
   * Тяжёлый apartments.json целиком не качаем — только about + blocks; число квартир во фиде уточняйте по последнему импорту или локальной копии фида.
   */
  async feedVsDbDiagnostics(regionCodeRaw: string) {
    const regionCode = (regionCodeRaw || 'msk').toLowerCase();
    const region = await this.prisma.feedRegion.findFirst({
      where: { code: { equals: regionCode, mode: 'insensitive' } },
    });
    if (!region) {
      throw new NotFoundException(`Регион не найден: ${regionCode}`);
    }

    const about = await this.fetcher.fetchAbout(regionCode);
    const fileMap = new Map(about.map((e) => [e.name, e.url]));
    const exportedAt = about[0]?.exported_at ?? null;

    let blocksInFeed: number | null = null;
    let blocksFeedError: string | null = null;
    const blocksUrl = fileMap.get('blocks');
    if (blocksUrl) {
      try {
        const blocksData = await this.fetcher.fetchFeedFile<unknown[]>(blocksUrl);
        blocksInFeed = Array.isArray(blocksData) ? blocksData.length : null;
      } catch (e: unknown) {
        blocksFeedError = e instanceof Error ? e.message : String(e);
      }
    }

    const apartmentsUrl = fileMap.get('apartments') ?? null;

    const [
      listingsActivePublished,
      listingsWithBlock,
      listingsBlockIdNull,
      blocksInDbRegion,
      lastCompleted,
    ] = await Promise.all([
      this.prisma.listing.count({
        where: {
          regionId: region.id,
          kind: ListingKind.APARTMENT,
          status: ListingStatus.ACTIVE,
          isPublished: true,
        },
      }),
      this.prisma.listing.count({
        where: {
          regionId: region.id,
          kind: ListingKind.APARTMENT,
          status: ListingStatus.ACTIVE,
          isPublished: true,
          blockId: { not: null },
        },
      }),
      this.prisma.listing.count({
        where: {
          regionId: region.id,
          kind: ListingKind.APARTMENT,
          status: ListingStatus.ACTIVE,
          isPublished: true,
          blockId: null,
        },
      }),
      this.prisma.block.count({ where: { regionId: region.id } }),
      this.prisma.importBatch.findFirst({
        where: { regionId: region.id, status: 'COMPLETED' },
        orderBy: { finishedAt: 'desc' },
        select: { id: true, finishedAt: true, feedExportedAt: true, stats: true },
      }),
    ]);

    const importStats = lastCompleted?.stats as Record<string, unknown> | null | undefined;
    const apartmentsUpsertedLast =
      typeof importStats?.apartments_upserted === 'number'
        ? importStats.apartments_upserted
        : null;
    const blocksUpsertedLast =
      typeof importStats?.blocks_upserted === 'number' ? importStats.blocks_upserted : null;

    /** Как публичный GET /blocks/catalog-counts (дефолт витрины). */
    const catalogCountsVitrine = await this.blocks.countCatalog({
      region_id: region.id,
      require_active_listings: true,
    });
    /** Все ЖК региона с квартирами по тем же правилам лотов, без требования «есть активные квартиры у ЖК». */
    const catalogCountsRelaxed = await this.blocks.countCatalog({
      region_id: region.id,
      require_active_listings: false,
    });

    const listingStatusBreakdown = await this.prisma.listing.groupBy({
      by: ['status'],
      where: { regionId: region.id, kind: ListingKind.APARTMENT },
      _count: { _all: true },
    });

    const distinctBlocksWithListings = await this.prisma.listing.groupBy({
      by: ['blockId'],
      where: {
        regionId: region.id,
        kind: ListingKind.APARTMENT,
        status: ListingStatus.ACTIVE,
        isPublished: true,
        blockId: { not: null },
      },
    });
    const distinctBlockCount = distinctBlocksWithListings.filter((g) => g.blockId != null).length;

    const explanations: string[] = [];
    if (listingsBlockIdNull > 0) {
      explanations.push(
        `В БД ${listingsBlockIdNull} активных опубликованных квартир без привязки к ЖК (block_id = null). Такие лоты не попадают в публичный счётчик «X квартир в Y ЖК», потому что Y считается только по связанным ЖК.`,
      );
    }
    explanations.push(
      'Счётчик витрины Live Grid (GET /blocks/catalog-counts) учитывает только квартиры, у которых есть связанный ЖК в регионе, и только ЖК с хотя бы одной такой квартирой (require_active_listings).',
    );
    explanations.push(
      'Числа на msk.trendagent.ru могут включать другой набор статусов/географии или полный объём фида до фильтрации — сравнивайте с blocksInFeed и apartments_upserted последнего импорта.',
    );
    if (blocksInFeed != null && blocksInFeed > catalogCountsVitrine.blocks) {
      explanations.push(
        `Во фиде ${blocksInFeed} записей ЖК, на витрине (как у TrendAgent по смыслу «ЖК с офферами») ${catalogCountsVitrine.blocks} ЖК — часть ЖК в БД без активных опубликованных квартир не попадает в счётчик главной.`,
      );
    }
    if (
      catalogCountsRelaxed.apartments > catalogCountsVitrine.apartments ||
      catalogCountsRelaxed.blocks > catalogCountsVitrine.blocks
    ) {
      explanations.push(
        `Счётчик главной = vitrine_catalog_counts (require_active_listings). Без него было бы квартир: ${catalogCountsRelaxed.apartments}, ЖК: ${catalogCountsRelaxed.blocks} — сравнивайте с этим, если нужно понять «все лоты в регионе».`,
      );
    }

    return {
      generatedAt: new Date().toISOString(),
      region: {
        id: region.id,
        code: region.code,
        name: region.name,
        lastImportedAt: region.lastImportedAt,
      },
      feedAbout: {
        exported_at: exportedAt,
        files: about.map((e) => ({ name: e.name, url: e.url, scope: e.scope })),
      },
      feedProbe: {
        blocks_json_count: blocksInFeed,
        blocks_json_error: blocksFeedError,
        apartments_json_url: apartmentsUrl,
        note:
          'Полный размер массива apartments.json не запрашивается здесь (слишком тяжело для HTTP). Смотрите apartments_upserted последнего успешного импорта или скачайте фид локально (FEED_LOCAL_DIR).',
      },
      database: {
        blocks_total_in_db: blocksInDbRegion,
        listings_apartment_active_published: listingsActivePublished,
        listings_with_block_id: listingsWithBlock,
        listings_block_id_null: listingsBlockIdNull,
        distinct_blocks_having_listings: distinctBlockCount,
      },
      vitrine_catalog_counts: catalogCountsVitrine,
      catalog_counts_relaxed: catalogCountsRelaxed,
      listing_status_breakdown_apartments: listingStatusBreakdown.map((r) => ({
        status: r.status,
        count: r._count._all,
      })),
      last_completed_import: lastCompleted
        ? {
            batch_id: lastCompleted.id,
            finished_at: lastCompleted.finishedAt,
            feed_exported_at: lastCompleted.feedExportedAt,
            stats: lastCompleted.stats,
            apartments_upserted: apartmentsUpsertedLast,
            blocks_upserted: blocksUpsertedLast,
          }
        : null,
      explanations,
    };
  }

  /**
   * Лёгкая проверка доступности фида по региону:
   * - доступен ли about.json
   * - присутствуют ли обязательные файлы в about
   * - удалось ли прочитать blocks.json и сколько в нём записей
   */
  async probeRegionFeed(regionCodeRaw: string) {
    const regionCode = this.normalizeRegionCode(regionCodeRaw);
    const requiredFiles = ['blocks', 'buildings', 'apartments', 'regions', 'subways', 'builders'] as const;
    const warnings: string[] = [];

    try {
      const about = await this.fetcher.fetchAbout(regionCode);
      const fileMap = new Map(about.map((e) => [e.name, e.url]));
      const availableFiles = Array.from(fileMap.keys()).sort();
      const missingRequired = requiredFiles.filter((name) => !fileMap.has(name));

      let blocksCount: number | null = null;
      let blocksReadError: string | null = null;
      const blocksUrl = fileMap.get('blocks');
      if (blocksUrl) {
        try {
          const blocksData = await this.fetcher.fetchFeedFile<unknown[]>(blocksUrl);
          blocksCount = Array.isArray(blocksData) ? blocksData.length : null;
        } catch (e: unknown) {
          blocksReadError = e instanceof Error ? e.message : String(e);
          warnings.push(`Не удалось прочитать blocks.json: ${blocksReadError}`);
        }
      }

      if (missingRequired.length) {
        warnings.push(`В about.json отсутствуют обязательные файлы: ${missingRequired.join(', ')}`);
      }

      return {
        region: regionCode,
        ok: missingRequired.length === 0 && !blocksReadError,
        exportedAt: about[0]?.exported_at ?? null,
        filesTotal: about.length,
        availableFiles,
        missingRequired,
        blocksCount,
        blocksReadError,
        warnings,
      };
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      return {
        region: regionCode,
        ok: false,
        exportedAt: null,
        filesTotal: 0,
        availableFiles: [],
        missingRequired: requiredFiles,
        blocksCount: null,
        blocksReadError: msg,
        warnings: [`about.json недоступен: ${msg}`],
      };
    }
  }

  async getHistory(regionId?: number, page = 1, perPage = 20) {
    const where = regionId ? { regionId } : {};
    const [data, total] = await Promise.all([
      this.prisma.importBatch.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * perPage,
        take: perPage,
        include: {
          region: { select: { code: true, name: true } },
          user: { select: { id: true, fullName: true, email: true } },
        },
      }),
      this.prisma.importBatch.count({ where }),
    ]);
    return {
      data,
      meta: {
        page,
        per_page: perPage,
        total,
        total_pages: Math.ceil(total / perPage),
      },
    };
  }

  private setProgress(step: string, detail?: string, percent = 0) {
    this.currentProgress = { step, detail, percent };
  }

  async refreshCatalogSearchCache() {
    await this.prisma.$executeRawUnsafe(
      'REFRESH MATERIALIZED VIEW catalog_apartment_active_mv',
    );
    return { refreshed: true, view: 'catalog_apartment_active_mv' as const };
  }

  private normalizeRegionCode(regionCode: string): string {
    return String(regionCode || 'msk').trim().toLowerCase();
  }

  private parseConfiguredRegionCodes(): string[] {
    const rawList = this.config.get<string>('TRENDAGENT_REGIONS')?.trim();
    const fallback = this.config.get<string>('TRENDAGENT_DEFAULT_REGION') || 'msk';
    const source = rawList && rawList.length > 0 ? rawList : fallback;
    const items = source
      .split(/[\s,;]+/)
      .map((s) => this.normalizeRegionCode(s))
      .filter(Boolean);
    return Array.from(new Set(items));
  }

  private async resolveCronRegionCodes(): Promise<string[]> {
    const configured = this.parseConfiguredRegionCodes();
    if (!configured.length) return [];

    if (configured.includes('all')) {
      const allEnabled = await this.prisma.feedRegion.findMany({
        where: { isEnabled: true },
        orderBy: { id: 'asc' },
        select: { code: true },
      });
      return allEnabled.map((r) => this.normalizeRegionCode(r.code));
    }

    const rows = await this.prisma.feedRegion.findMany({
      where: { code: { in: configured } },
      select: { code: true },
    });
    const existing = new Set(rows.map((r) => this.normalizeRegionCode(r.code)));
    const missing = configured.filter((code) => !existing.has(code));
    if (missing.length) {
      this.logger.warn(`Skip unknown TRENDAGENT_REGIONS codes: ${missing.join(', ')}`);
    }
    return configured.filter((code) => existing.has(code));
  }
}
