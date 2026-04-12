/** Задача с уже созданным import_batch (ручной запуск из API) */
export interface FeedImportBatchJob {
  batchId: number;
  regionId: number;
  regionCode: string;
}

/** Планировщик BullMQ — только регион */
export interface FeedImportScheduledJob {
  regionCode: string;
}

export type FeedImportJobData = FeedImportBatchJob | FeedImportScheduledJob;
