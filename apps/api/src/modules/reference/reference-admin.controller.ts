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
import { ApiBearerAuth, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { CurrentUser, Roles } from '../../auth/decorators';
import { AuditService } from '../audit/audit.service';
import { ReferenceService } from './reference.service';
import { UpsertReferenceItemDto } from './dto/upsert-reference-item.dto';

type RefKind = 'room-types' | 'finishings' | 'building-types';

@ApiTags('Admin / Reference')
@ApiBearerAuth()
@Controller('admin/reference')
export class ReferenceAdminController {
  constructor(
    private readonly service: ReferenceService,
    private readonly audit: AuditService,
  ) {}

  @Get(':kind')
  @Roles('editor')
  @ApiParam({ name: 'kind', enum: ['room-types', 'finishings', 'building-types'] })
  @ApiOperation({ summary: 'Список справочника (admin)' })
  findAll(@Param('kind') kind: RefKind) {
    return this.service.getByKind(kind);
  }

  @Post(':kind')
  @Roles('admin')
  @ApiParam({ name: 'kind', enum: ['room-types', 'finishings', 'building-types'] })
  @ApiOperation({ summary: 'Создать элемент справочника (admin)' })
  async create(
    @Param('kind') kind: RefKind,
    @Body() dto: UpsertReferenceItemDto,
    @CurrentUser('sub') userId: string,
  ) {
    const created = await this.service.createByKind(kind, dto);
    await this.audit.log(userId, `reference:${kind}`, created.id, 'CREATE', undefined, created);
    return created;
  }

  @Patch(':kind/:id')
  @Roles('admin')
  @ApiParam({ name: 'kind', enum: ['room-types', 'finishings', 'building-types'] })
  @ApiOperation({ summary: 'Обновить элемент справочника (admin)' })
  async update(
    @Param('kind') kind: RefKind,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpsertReferenceItemDto,
    @CurrentUser('sub') userId: string,
  ) {
    const oldData = await this.service.findOneByKind(kind, id);
    const updated = await this.service.updateByKind(kind, id, dto);
    await this.audit.log(userId, `reference:${kind}`, id, 'UPDATE', oldData, updated);
    return updated;
  }

  @Delete(':kind/:id')
  @Roles('admin')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiParam({ name: 'kind', enum: ['room-types', 'finishings', 'building-types'] })
  @ApiOperation({ summary: 'Удалить элемент справочника (admin)' })
  async remove(
    @Param('kind') kind: RefKind,
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('sub') userId: string,
  ) {
    const oldData = await this.service.findOneByKind(kind, id);
    await this.service.deleteByKind(kind, id);
    await this.audit.log(userId, `reference:${kind}`, id, 'DELETE', oldData, null);
  }
}
