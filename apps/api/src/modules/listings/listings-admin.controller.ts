import { Body, Controller, Delete, Param, ParseIntPipe, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../auth/decorators';
import { ListingsService } from './listings.service';
import {
  CreateManualApartmentDto,
  UpdateManualApartmentDto,
} from './dto/manual-apartment.dto';

@ApiTags('Admin / Listings')
@ApiBearerAuth()
@Controller('admin/listings')
export class ListingsAdminController {
  constructor(private readonly service: ListingsService) {}

  @Post('manual-apartment')
  @Roles('editor')
  @ApiOperation({ summary: 'Создать ручное объявление квартиры (data_source=MANUAL)' })
  createManualApartment(@Body() dto: CreateManualApartmentDto) {
    return this.service.createManualApartment(dto);
  }

  @Patch(':id/manual-apartment')
  @Roles('editor')
  @ApiOperation({ summary: 'Обновить ручное объявление квартиры (только MANUAL)' })
  updateManualApartment(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateManualApartmentDto,
  ) {
    return this.service.updateManualApartment(id, dto);
  }

  @Delete(':id')
  @Roles('editor')
  @ApiOperation({ summary: 'Удалить объявление (только MANUAL)' })
  deleteManual(@Param('id', ParseIntPipe) id: number) {
    return this.service.deleteManualListing(id);
  }
}
