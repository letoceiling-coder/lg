import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../auth/decorators';
import { AddCollectionItemDto } from './dto/add-collection-item.dto';
import { CreateCollectionDto } from './dto/create-collection.dto';
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
}
