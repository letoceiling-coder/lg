import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { MetricsService } from '../../monitoring/metrics.service';
import { FeedImportService } from './feed-import.service';
import {
  FEED_IMPORT_QUEUE,
  FEED_IMPORT_JOB_RUN,
} from './feed-import.constants';
import type {
  FeedImportBatchJob,
  FeedImportJobData,
} from './feed-import.types';

export type {
  FeedImportBatchJob,
  FeedImportScheduledJob,
  FeedImportJobData,
} from './feed-import.types';

function isBatchJob(data: FeedImportJobData): data is FeedImportBatchJob {
  return typeof (data as FeedImportBatchJob).batchId === 'number';
}

@Processor(FEED_IMPORT_QUEUE)
export class FeedImportProcessor extends WorkerHost {
  private readonly logger = new Logger(FeedImportProcessor.name);

  constructor(
    private readonly feedImport: FeedImportService,
    private readonly metrics: MetricsService,
  ) {
    super();
  }

  override async process(job: Job<FeedImportJobData, unknown, string>) {
    if (job.name !== FEED_IMPORT_JOB_RUN) {
      this.logger.warn(`Unknown job name: ${job.name}`);
      return;
    }

    try {
      if (isBatchJob(job.data)) {
        this.logger.log(`Execute import batch ${job.data.batchId} (${job.data.regionCode})`);
        await this.feedImport.executeBatch(job.data);
      } else {
        this.logger.log(`Scheduled import for region ${job.data.regionCode}`);
        await this.feedImport.runScheduledImport(job.data.regionCode);
      }
      this.metrics.recordFeedImportJob('completed');
    } catch (e) {
      this.metrics.recordFeedImportJob('failed');
      throw e;
    }
  }
}
