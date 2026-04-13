import {
  Body,
  Controller,
  DefaultValuePipe,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { CurrentUser, Roles } from '../../auth/decorators';
import { AuditService } from '../audit/audit.service';
import { BuildingsService } from './buildings.service';
import { CreateBuildingDto } from './dto/create-building.dto';
import { UpdateBuildingDto } from './dto/update-building.dto';

@ApiTags('Admin / Buildings')
@ApiBearerAuth()
@Controller('admin/buildings')
export class BuildingsAdminController {
  constructor(
    private readonly service: BuildingsService,
    private readonly audit: AuditService,
  ) {}

  @Get()
  @Roles('editor')
  @ApiOperation({ summary: 'Список корпусов (admin)' })
  @ApiQuery({ name: 'region_id', required: false, type: Number })
  @ApiQuery({ name: 'block_id', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  findAll(
    @Query('region_id', new DefaultValuePipe('')) regionIdRaw: string,
    @Query('block_id', new DefaultValuePipe('')) blockIdRaw: string,
    @Query('search') search?: string,
  ) {
    const regionId =
      regionIdRaw !== '' && regionIdRaw !== undefined
        ? Number.parseInt(regionIdRaw, 10)
        : undefined;
    const blockId =
      blockIdRaw !== '' && blockIdRaw !== undefined
        ? Number.parseInt(blockIdRaw, 10)
        : undefined;
    return this.service.findAllAdmin(
      Number.isFinite(regionId) ? regionId : undefined,
      Number.isFinite(blockId) ? blockId : undefined,
      search,
    );
  }

  @Get('options')
  @Roles('editor')
  @ApiOperation({ summary: 'Справочники для форм корпуса' })
  options(
    @Query('region_id', new DefaultValuePipe('')) regionIdRaw: string,
    @Query('block_search') blockSearch?: string,
  ) {
    const regionId =
      regionIdRaw !== '' && regionIdRaw !== undefined
        ? Number.parseInt(regionIdRaw, 10)
        : undefined;
    return this.service.getAdminOptions(Number.isFinite(regionId) ? regionId : undefined, blockSearch);
  }

  @Post()
  @Roles('editor')
  @ApiOperation({ summary: 'Создать ручной корпус' })
  async create(@Body() dto: CreateBuildingDto, @CurrentUser('sub') userId: string) {
    const created = await this.service.createAdmin(dto);
    await this.audit.log(userId, 'building', created.id, 'CREATE', undefined, created);
    return created;
  }

  @Patch(':id')
  @Roles('editor')
  @ApiOperation({ summary: 'Обновить ручной корпус' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateBuildingDto,
    @CurrentUser('sub') userId: string,
  ) {
    const oldData = await this.service.findOne(id);
    const updated = await this.service.updateAdmin(id, dto);
    await this.audit.log(userId, 'building', id, 'UPDATE', oldData, updated);
    return updated;
  }

  @Delete(':id')
  @Roles('editor')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Удалить ручной корпус' })
  async remove(@Param('id', ParseIntPipe) id: number, @CurrentUser('sub') userId: string) {
    const oldData = await this.service.findOne(id);
    await this.service.deleteAdmin(id);
    await this.audit.log(userId, 'building', id, 'DELETE', oldData, null);
  }
}
