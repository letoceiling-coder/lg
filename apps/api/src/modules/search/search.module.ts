import { Module } from '@nestjs/common';
import { SearchController } from './search.controller';
import { SearchAdminController } from './search-admin.controller';
import { SearchService } from './search.service';
import { BlocksModule } from '../blocks/blocks.module';
import { MeilisearchModule } from '../meilisearch/meilisearch.module';

@Module({
  imports: [BlocksModule, MeilisearchModule],
  controllers: [SearchController, SearchAdminController],
  providers: [SearchService],
})
export class SearchModule {}
