import {
  Injectable,
  Logger,
  ConflictException,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
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
    @InjectQueue(FEED_IMPORT_QUEUE)
    private readonly feedImportQueue: Queue,
  ) {}

  async onModuleInit() {
    if (this.config.get('FEED_IMPORT_DISABLE_REPEAT') === 'true') {
      this.logger.log('Repeatable feed import cron disabled (FEED_IMPORT_DISABLE_REPEAT)');
      return;
    }
    const pattern =
      this.config.get<string>('FEED_IMPORT_CRON') || '0 3 * * 2';
    const regionCode =
      this.config.get<string>('TRENDAGENT_DEFAULT_REGION') || 'msk';
    try {
      await this.feedImportQueue.add(
        FEED_IMPORT_JOB_RUN,
        { regionCode },
        {
          repeat: { pattern },
          jobId: `feed-import-repeat-${regionCode}`,
        },
      );
      this.logger.log(
        `Registered BullMQ repeatable import: pattern="${pattern}" region=${regionCode}`,
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
    const payload = await this.createPendingBatch(regionCode, triggeredBy);
    await this.feedImportQueue.add(FEED_IMPORT_JOB_RUN, payload, {
      removeOnComplete: { count: 50 },
      attempts: 1,
    });
    return { batchId: payload.batchId, status: 'QUEUED' as const };
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
}
