import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../auth/decorators';
import { RegionsService } from './regions.service';
import { UpdateFeedRegionDto } from './dto/update-feed-region.dto';
import { CreateFeedRegionDto } from './dto/create-feed-region.dto';

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

  @Post()
  @Roles('admin')
  @ApiOperation({
    summary: 'Добавить регион вручную',
    description:
      'Запись в БД не зависит от фида: можно задать код и название без URL импорта (как для ручного региона).',
  })
  create(@Body() dto: CreateFeedRegionDto) {
    return this.service.createAdmin(dto);
  }

  @Patch(':id')
  @Roles('admin')
  @ApiOperation({ summary: 'Обновить регион (название, URL фида, включён в витрину)' })
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateFeedRegionDto) {
    return this.service.updateAdmin(id, dto);
  }

  @Delete(':id')
  @Roles('admin')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Удалить регион',
    description: 'Допустимо только если нет связанных районов, ЖК, объявлений и т.д.',
  })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.service.deleteAdmin(id);
  }
}
