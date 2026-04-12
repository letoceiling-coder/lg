import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { Public } from '../../auth/decorators';
import { DistrictsService } from './districts.service';

@ApiTags('Districts')
@Controller('districts')
export class DistrictsController {
  constructor(private readonly service: DistrictsService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'List districts' })
  @ApiQuery({ name: 'region_id', required: false, type: Number })
  findAll(@Query('region_id') regionId?: number) {
    return this.service.findAll(regionId ? +regionId : undefined);
  }
}
