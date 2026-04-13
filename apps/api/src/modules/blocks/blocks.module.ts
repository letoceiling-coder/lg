import { Module } from '@nestjs/common';
import { BlocksController } from './blocks.controller';
import { BlocksAdminController } from './blocks-admin.controller';
import { BlocksService } from './blocks.service';
import { GeoModule } from '../geo/geo.module';
import { MeilisearchModule } from '../meilisearch/meilisearch.module';

@Module({
  imports: [GeoModule, MeilisearchModule],
  controllers: [BlocksController, BlocksAdminController],
  providers: [BlocksService],
  exports: [BlocksService],
})
export class BlocksModule {}
