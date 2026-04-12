import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { Public } from '../../auth/decorators';
import { SubwaysService } from './subways.service';

@ApiTags('Subways')
@Controller('subways')
export class SubwaysController {
  constructor(private readonly service: SubwaysService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'List subway stations' })
  @ApiQuery({ name: 'region_id', required: false, type: Number })
  findAll(@Query('region_id') regionId?: number) {
    return this.service.findAll(regionId ? +regionId : undefined);
  }
}
