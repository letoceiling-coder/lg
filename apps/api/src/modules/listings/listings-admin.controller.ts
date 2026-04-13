import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser, Roles } from '../../auth/decorators';
import { AuditService } from '../audit/audit.service';
import { ListingsService } from './listings.service';
import {
  CreateManualApartmentDto,
  UpdateManualApartmentDto,
} from './dto/manual-apartment.dto';
import { UpdateListingAdminDto } from './dto/update-listing-admin.dto';
import { QueryListingsDto } from './dto/query-listings.dto';

@ApiTags('Admin / Listings')
@ApiBearerAuth()
@Controller('admin/listings')
export class ListingsAdminController {
  constructor(
    private readonly service: ListingsService,
    private readonly audit: AuditService,
  ) {}

  @Get()
  @Roles('manager')
  @ApiOperation({ summary: 'Админ-список объявлений с фильтрами/пагинацией' })
  findAll(@Query() query: QueryListingsDto) {
    return this.service.findAll(query);
  }

  @Post('manual-apartment')
  @Roles('editor')
  @ApiOperation({ summary: 'Создать ручное объявление квартиры (data_source=MANUAL)' })
  async createManualApartment(
    @Body() dto: CreateManualApartmentDto,
    @CurrentUser('sub') userId: string,
  ) {
    const created = await this.service.createManualApartment(dto);
    await this.audit.log(userId, 'listing', created.id, 'CREATE', undefined, created);
    return created;
  }

  @Patch(':id/manual-apartment')
  @Roles('editor')
  @ApiOperation({ summary: 'Обновить ручное объявление квартиры (только MANUAL)' })
  async updateManualApartment(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateManualApartmentDto,
    @CurrentUser('sub') userId: string,
  ) {
    const oldData = await this.service.findOne(id);
    const updated = await this.service.updateManualApartment(id, dto);
    await this.audit.log(userId, 'listing', id, 'UPDATE', oldData, updated);
    return updated;
  }

  @Patch(':id')
  @Roles('editor')
  @ApiOperation({ summary: 'Обновить статус/публикацию объявления (любого источника)' })
  async updateListingAdmin(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateListingAdminDto,
    @CurrentUser('sub') userId: string,
  ) {
    const oldData = await this.service.findOne(id);
    const updated = await this.service.updateAdminListing(id, dto);
    await this.audit.log(userId, 'listing', id, 'UPDATE', oldData, updated);
    return updated;
  }

  @Delete(':id')
  @Roles('editor')
  @ApiOperation({ summary: 'Удалить объявление (только MANUAL)' })
  async deleteManual(@Param('id', ParseIntPipe) id: number, @CurrentUser('sub') userId: string) {
    const oldData = await this.service.findOne(id);
    const result = await this.service.deleteManualListing(id);
    await this.audit.log(userId, 'listing', id, 'DELETE', oldData, null);
    return result;
  }
}
