import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Res,
  StreamableFile,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { CurrentUser } from '../../auth/decorators';
import { AddCollectionItemDto } from './dto/add-collection-item.dto';
import { CreateCollectionDto } from './dto/create-collection.dto';
import { UpdateCollectionDto } from './dto/update-collection.dto';
import { CollectionsService } from './collections.service';

@ApiTags('Collections')
@ApiBearerAuth()
@Controller('collections')
export class CollectionsController {
  constructor(private readonly service: CollectionsService) {}

  @Get()
  @ApiOperation({ summary: 'Мои подборки' })
  list(@CurrentUser('sub') userId: string) {
    return this.service.list(userId);
  }

  @Post()
  @ApiOperation({ summary: 'Создать подборку' })
  create(@CurrentUser('sub') userId: string, @Body() dto: CreateCollectionDto) {
    return this.service.create(userId, dto.name);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Подборка с элементами' })
  getOne(@CurrentUser('sub') userId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.service.getOne(userId, id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Удалить подборку' })
  remove(@CurrentUser('sub') userId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.service.remove(userId, id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Переименовать подборку' })
  update(
    @CurrentUser('sub') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCollectionDto,
  ) {
    return this.service.update(userId, id, dto.name);
  }

  @Post(':collectionId/items')
  @ApiOperation({ summary: 'Добавить ЖК или объявление в подборку' })
  addItem(
    @CurrentUser('sub') userId: string,
    @Param('collectionId', ParseUUIDPipe) collectionId: string,
    @Body() dto: AddCollectionItemDto,
  ) {
    return this.service.addItem(userId, collectionId, dto.kind, dto.entityId);
  }

  @Delete(':collectionId/items/:itemId')
  @ApiOperation({ summary: 'Удалить элемент из подборки' })
  removeItem(
    @CurrentUser('sub') userId: string,
    @Param('collectionId', ParseUUIDPipe) collectionId: string,
    @Param('itemId', ParseUUIDPipe) itemId: string,
  ) {
    return this.service.removeItem(userId, collectionId, itemId);
  }

  @Get(':id/pdf')
  @ApiOperation({ summary: 'Скачать подборку в PDF' })
  async downloadPdf(
    @CurrentUser('sub') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    const data = await this.service.exportPdf(userId, id);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=\"collection-${id}.pdf\"`);
    res.setHeader('Content-Length', String(data.length));
    return new StreamableFile(data);
  }
}
