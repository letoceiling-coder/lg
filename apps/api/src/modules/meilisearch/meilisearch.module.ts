import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { CatalogMeilisearchService } from './catalog-meilisearch.service';

@Module({
  imports: [PrismaModule],
  providers: [CatalogMeilisearchService],
  exports: [CatalogMeilisearchService],
})
export class MeilisearchModule {}
