import { Controller, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../auth/decorators';
import { CatalogMeilisearchService } from '../meilisearch/catalog-meilisearch.service';
import { BlocksService } from '../blocks/blocks.service';

@ApiTags('Admin / Search')
@ApiBearerAuth()
@Controller('admin/search')
export class SearchAdminController {
  constructor(
    private readonly meili: CatalogMeilisearchService,
    private readonly blocks: BlocksService,
  ) {}

  @Post('reindex-catalog')
  @Roles('admin')
  @ApiOperation({ summary: 'Переиндексировать каталог ЖК в Meilisearch' })
  async reindexCatalog() {
    const { indexed } = await this.meili.fullReindex();
    await this.blocks.invalidateCatalogCache();
    return { ok: true, indexed };
  }
}
