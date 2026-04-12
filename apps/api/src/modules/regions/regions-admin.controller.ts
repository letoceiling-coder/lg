import { Body, Controller, Get, Param, ParseIntPipe, Patch } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../auth/decorators';
import { RegionsService } from './regions.service';
import { UpdateFeedRegionDto } from './dto/update-feed-region.dto';

@ApiTags('Admin / Regions')
@ApiBearerAuth()
@Controller('admin/regions')
export class RegionsAdminController {
  constructor(private readonly service: RegionsService) {}

  @Get()
  @Roles('admin', 'editor')
  @ApiOperation({ summary: 'Список всех регионов фида (вкл. выключенные)' })
  findAllAdmin() {
    return this.service.findAllAdmin();
  }

  @Patch(':id')
  @Roles('admin')
  @ApiOperation({ summary: 'Обновить регион (название, URL фида, включён в витрину)' })
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateFeedRegionDto) {
    return this.service.updateAdmin(id, dto);
  }
}
