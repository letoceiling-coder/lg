import { Controller, Get, Param, ParseIntPipe, Query } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { Public } from '../../auth/decorators';
import { BuildersService } from './builders.service';

@ApiTags('Builders')
@Controller('builders')
export class BuildersController {
  constructor(private readonly service: BuildersService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'List builders' })
  @ApiQuery({ name: 'region_id', required: false, type: Number })
  findAll(@Query('region_id') regionId?: number) {
    return this.service.findAll(regionId ? +regionId : undefined);
  }

  @Public()
  @Get(':id')
  @ApiOperation({ summary: 'Get builder by id' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }
}
