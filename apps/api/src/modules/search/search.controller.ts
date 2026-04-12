import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../../auth/decorators';
import { CatalogHintsQueryDto } from './dto/catalog-hints-query.dto';
import { SearchService } from './search.service';

@ApiTags('Search')
@Controller('search')
export class SearchController {
  constructor(private readonly search: SearchService) {}

  @Public()
  @Get('catalog-hints')
  @ApiOperation({ summary: 'Подсказки каталога: ЖК, метро, районы, адреса' })
  catalogHints(@Query() query: CatalogHintsQueryDto) {
    const lim = query.limit ?? 15;
    return this.search.catalogHints(query.region_id, query.q, lim);
  }
}
