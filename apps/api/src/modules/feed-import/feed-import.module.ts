import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BlocksModule } from '../blocks/blocks.module';
import { FeedImportService } from './feed-import.service';
import { FeedImportController } from './feed-import.controller';
import { FeedFetcherService } from './feed-fetcher.service';
import { FeedProcessorService } from './feed-processor.service';
import { FeedImportProcessor } from './feed-import.processor';
import { FEED_IMPORT_QUEUE } from './feed-import.constants';

@Module({
  imports: [
    BlocksModule,
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        connection: {
          url: config.get<string>('REDIS_URL', 'redis://127.0.0.1:6379'),
        },
      }),
      inject: [ConfigService],
    }),
    BullModule.registerQueue({ name: FEED_IMPORT_QUEUE }),
  ],
  controllers: [FeedImportController],
  providers: [
    FeedImportService,
    FeedFetcherService,
    FeedProcessorService,
    FeedImportProcessor,
  ],
  exports: [FeedImportService],
})
export class FeedImportModule {}
