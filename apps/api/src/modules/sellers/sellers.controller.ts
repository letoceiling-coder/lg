import { Body, Controller, DefaultValuePipe, Get, Param, ParseIntPipe, Post, Put, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser, Roles } from '../../auth/decorators';
import { UpsertSellerDto } from './dto/seller.dto';
import { SellersService } from './sellers.service';

@ApiTags('Admin / Sellers')
@ApiBearerAuth()
@Controller('admin/sellers')
export class SellersController {
  constructor(private readonly sellers: SellersService) {}

  @Get()
  @Roles('agent')
  @ApiOperation({ summary: 'Список продавцов объектов' })
  findAll(
    @CurrentUser('sub') userId: string,
    @CurrentUser('role') role: string,
    @Query('search') search?: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page?: number,
    @Query('per_page', new DefaultValuePipe(30), ParseIntPipe) perPage?: number,
  ) {
    return this.sellers.findAll({ userId, role }, search, page, perPage);
  }

  @Get(':id')
  @Roles('agent')
  @ApiOperation({ summary: 'Карточка продавца' })
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('sub') userId: string,
    @CurrentUser('role') role: string,
  ) {
    return this.sellers.findOne(id, { userId, role });
  }

  @Post()
  @Roles('agent')
  @ApiOperation({ summary: 'Создать продавца' })
  create(
    @Body() dto: UpsertSellerDto,
    @CurrentUser('sub') userId: string,
    @CurrentUser('role') role: string,
  ) {
    return this.sellers.create(dto, { userId, role });
  }

  @Put(':id')
  @Roles('agent')
  @ApiOperation({ summary: 'Обновить продавца' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpsertSellerDto,
    @CurrentUser('sub') userId: string,
    @CurrentUser('role') role: string,
  ) {
    return this.sellers.update(id, dto, { userId, role });
  }
}
