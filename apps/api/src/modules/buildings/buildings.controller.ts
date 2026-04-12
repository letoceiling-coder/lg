import { BadRequestException, Controller, Get, Param, ParseIntPipe, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../../auth/decorators';
import { BuildingsService } from './buildings.service';

@ApiTags('Buildings')
@Controller('buildings')
export class BuildingsController {
  constructor(private readonly service: BuildingsService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'List buildings' })
  findAll(@Query('block_id') blockIdRaw?: string) {
    let blockId: number | undefined;
    if (blockIdRaw !== undefined && blockIdRaw !== '') {
      const parsed = parseInt(blockIdRaw, 10);
      if (Number.isNaN(parsed)) {
        throw new BadRequestException('block_id must be a number');
      }
      blockId = parsed;
    }
    return this.service.findAll(blockId);
  }

  @Public()
  @Get(':id')
  @ApiOperation({ summary: 'Get building by id' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }
}
