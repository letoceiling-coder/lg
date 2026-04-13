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
import { CreateManualHouseDto, UpdateManualHouseDto } from './dto/manual-house.dto';
import { CreateManualLandDto, UpdateManualLandDto } from './dto/manual-land.dto';
import {
  CreateManualCommercialDto,
  UpdateManualCommercialDto,
} from './dto/manual-commercial.dto';
import { CreateManualParkingDto, UpdateManualParkingDto } from './dto/manual-parking.dto';

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

  @Post('manual-house')
  @Roles('editor')
  @ApiOperation({ summary: 'Создать ручное объявление дома (data_source=MANUAL)' })
  async createManualHouse(
    @Body() dto: CreateManualHouseDto,
    @CurrentUser('sub') userId: string,
  ) {
    const created = await this.service.createManualHouse(dto);
    await this.audit.log(userId, 'listing', created.id, 'CREATE', undefined, created);
    return created;
  }

  @Post('manual-land')
  @Roles('editor')
  @ApiOperation({ summary: 'Создать ручное объявление участка (data_source=MANUAL)' })
  async createManualLand(
    @Body() dto: CreateManualLandDto,
    @CurrentUser('sub') userId: string,
  ) {
    const created = await this.service.createManualLand(dto);
    await this.audit.log(userId, 'listing', created.id, 'CREATE', undefined, created);
    return created;
  }

  @Post('manual-commercial')
  @Roles('editor')
  @ApiOperation({ summary: 'Создать ручное коммерческое объявление (data_source=MANUAL)' })
  async createManualCommercial(
    @Body() dto: CreateManualCommercialDto,
    @CurrentUser('sub') userId: string,
  ) {
    const created = await this.service.createManualCommercial(dto);
    await this.audit.log(userId, 'listing', created.id, 'CREATE', undefined, created);
    return created;
  }

  @Post('manual-parking')
  @Roles('editor')
  @ApiOperation({ summary: 'Создать ручное парковочное объявление (data_source=MANUAL)' })
  async createManualParking(
    @Body() dto: CreateManualParkingDto,
    @CurrentUser('sub') userId: string,
  ) {
    const created = await this.service.createManualParking(dto);
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

  @Patch(':id/manual-house')
  @Roles('editor')
  @ApiOperation({ summary: 'Обновить ручное объявление дома (только MANUAL + HOUSE)' })
  async updateManualHouse(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateManualHouseDto,
    @CurrentUser('sub') userId: string,
  ) {
    const oldData = await this.service.findOne(id);
    const updated = await this.service.updateManualHouse(id, dto);
    await this.audit.log(userId, 'listing', id, 'UPDATE', oldData, updated);
    return updated;
  }

  @Patch(':id/manual-land')
  @Roles('editor')
  @ApiOperation({ summary: 'Обновить ручное объявление участка (только MANUAL + LAND)' })
  async updateManualLand(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateManualLandDto,
    @CurrentUser('sub') userId: string,
  ) {
    const oldData = await this.service.findOne(id);
    const updated = await this.service.updateManualLand(id, dto);
    await this.audit.log(userId, 'listing', id, 'UPDATE', oldData, updated);
    return updated;
  }

  @Patch(':id/manual-commercial')
  @Roles('editor')
  @ApiOperation({ summary: 'Обновить ручное коммерческое объявление (только MANUAL + COMMERCIAL)' })
  async updateManualCommercial(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateManualCommercialDto,
    @CurrentUser('sub') userId: string,
  ) {
    const oldData = await this.service.findOne(id);
    const updated = await this.service.updateManualCommercial(id, dto);
    await this.audit.log(userId, 'listing', id, 'UPDATE', oldData, updated);
    return updated;
  }

  @Patch(':id/manual-parking')
  @Roles('editor')
  @ApiOperation({ summary: 'Обновить ручное парковочное объявление (только MANUAL + PARKING)' })
  async updateManualParking(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateManualParkingDto,
    @CurrentUser('sub') userId: string,
  ) {
    const oldData = await this.service.findOne(id);
    const updated = await this.service.updateManualParking(id, dto);
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
