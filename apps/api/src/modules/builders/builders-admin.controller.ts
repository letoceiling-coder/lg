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
import { BuildersService } from './builders.service';
import { CreateBuilderDto } from './dto/create-builder.dto';
import { UpdateBuilderDto } from './dto/update-builder.dto';

@ApiTags('Admin / Builders')
@ApiBearerAuth()
@Controller('admin/builders')
export class BuildersAdminController {
  constructor(
    private readonly service: BuildersService,
    private readonly audit: AuditService,
  ) {}

  @Get()
  @Roles('editor')
  @ApiOperation({ summary: 'Список застройщиков (admin)' })
  @ApiQuery({ name: 'region_id', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  findAll(
    @Query('region_id', new DefaultValuePipe('')) regionIdRaw: string,
    @Query('search') search?: string,
  ) {
    const regionId =
      regionIdRaw !== '' && regionIdRaw !== undefined
        ? Number.parseInt(regionIdRaw, 10)
        : undefined;
    return this.service.findAllAdmin(Number.isFinite(regionId) ? regionId : undefined, search);
  }

  @Post()
  @Roles('editor')
  @ApiOperation({ summary: 'Создать ручного застройщика' })
  async create(@Body() dto: CreateBuilderDto, @CurrentUser('sub') userId: string) {
    const created = await this.service.createAdmin(dto);
    await this.audit.log(userId, 'builder', created.id, 'CREATE', undefined, created);
    return created;
  }

  @Patch(':id')
  @Roles('editor')
  @ApiOperation({ summary: 'Обновить ручного застройщика' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateBuilderDto,
    @CurrentUser('sub') userId: string,
  ) {
    const oldData = await this.service.findOne(id);
    const updated = await this.service.updateAdmin(id, dto);
    await this.audit.log(userId, 'builder', id, 'UPDATE', oldData, updated);
    return updated;
  }

  @Delete(':id')
  @Roles('editor')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Удалить ручного застройщика' })
  async remove(@Param('id', ParseIntPipe) id: number, @CurrentUser('sub') userId: string) {
    const oldData = await this.service.findOne(id);
    await this.service.deleteAdmin(id);
    await this.audit.log(userId, 'builder', id, 'DELETE', oldData, null);
  }
}
