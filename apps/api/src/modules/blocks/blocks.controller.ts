import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../../auth/decorators';
import { BlocksService } from './blocks.service';
import { QueryBlocksDto } from './dto/query-blocks.dto';

/** Как у витрины: только ЖК с опубликованными активными квартирами, если явно не запрошены «пустые». */
function publicCatalogQuery(query: QueryBlocksDto): QueryBlocksDto {
  if (query.require_active_listings !== undefined) {
    return query;
  }
  if (query.include_empty_blocks === true) {
    return { ...query, require_active_listings: false };
  }
  return { ...query, require_active_listings: true };
}

@ApiTags('Blocks')
@Controller('blocks')
export class BlocksController {
  constructor(private readonly service: BlocksService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'List blocks (ЖК) with filters and pagination' })
  findAll(@Query() query: QueryBlocksDto) {
    return this.service.findAll(publicCatalogQuery(query));
  }

  @Public()
  @Get('catalog-counts')
  @ApiOperation({ summary: 'Count blocks and matching apartment listings (same filters as list)' })
  catalogCounts(@Query() query: QueryBlocksDto) {
    return this.service.countCatalog(publicCatalogQuery(query));
  }

  @Public()
  @Get(':id')
  @ApiOperation({ summary: 'Get block details by ID or slug' })
  findOne(@Param('id') id: string) {
    if (/^\d+$/.test(id)) {
      const numId = Number.parseInt(id, 10);
      return this.service.findOne(numId);
    }
    return this.service.findBySlug(id);
  }
}
