import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Express } from 'express';
import { Roles, CurrentUser } from '../../auth/decorators';
import { CreateMediaFolderDto } from './dto/create-media-folder.dto';
import { MoveMediaFileDto } from './dto/move-media-file.dto';
import { MediaService } from './media.service';

@ApiTags('Admin / Media')
@ApiBearerAuth()
@Controller('admin/media')
export class MediaAdminController {
  constructor(private readonly media: MediaService) {}

  @Get('folders')
  @Roles('editor')
  @ApiOperation({ summary: 'Список папок (плоский; дерево строит клиент)' })
  listFolders() {
    return this.media.listFolders();
  }

  @Post('folders')
  @Roles('editor')
  @ApiOperation({ summary: 'Создать папку' })
  createFolder(@Body() dto: CreateMediaFolderDto) {
    const parent =
      dto.parentId === undefined ? undefined : dto.parentId === null ? null : dto.parentId;
    return this.media.createFolder(parent, dto.name);
  }

  @Delete('folders/:id')
  @Roles('editor')
  @ApiOperation({ summary: 'Удалить пустую папку (не корзину)' })
  deleteFolder(@Param('id', ParseIntPipe) id: number) {
    return this.media.deleteFolder(id);
  }

  @Get('files')
  @Roles('editor')
  @ApiOperation({ summary: 'Файлы в папке (folder_id не передан — корень без папки)' })
  listFiles(@Query('folder_id') folderId?: string) {
    if (folderId === undefined || folderId === '' || folderId === 'null') {
      return this.media.listFiles(null);
    }
    const n = Number.parseInt(folderId, 10);
    if (!Number.isFinite(n)) throw new BadRequestException('Некорректный folder_id');
    return this.media.listFiles(n);
  }

  @Post('upload')
  @Roles('editor')
  @ApiOperation({ summary: 'Загрузить изображение в медиатеку' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
        folder_id: { type: 'string', description: 'Опционально: ID папки (не корзина)' },
      },
    },
  })
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 15 * 1024 * 1024 },
    }),
  )
  upload(
    @UploadedFile() file: Express.Multer.File,
    @Query('folder_id') folderId: string | undefined,
    @CurrentUser('sub') userId: string,
  ) {
    return this.media.saveUploadedFile(file, folderId, userId);
  }

  @Post('files/:id/trash')
  @Roles('editor')
  @ApiOperation({ summary: 'Переместить файл в корзину' })
  trash(@Param('id', ParseIntPipe) id: number) {
    return this.media.moveFileToTrash(id);
  }

  @Post('files/:id/restore')
  @Roles('editor')
  @ApiOperation({ summary: 'Восстановить файл из корзины в исходную папку' })
  restore(@Param('id', ParseIntPipe) id: number) {
    return this.media.restoreFile(id);
  }

  @Patch('files/:id/move')
  @Roles('editor')
  @ApiOperation({ summary: 'Переместить файл в другую папку (не в корзину)' })
  move(@Param('id', ParseIntPipe) id: number, @Body() dto: MoveMediaFileDto) {
    const target = dto.folderId === -1 ? null : dto.folderId;
    return this.media.moveFile(id, target);
  }

  @Delete('files/:id')
  @Roles('editor')
  @ApiOperation({ summary: 'Удалить навсегда (только если файл в корзине)' })
  permanent(@Param('id', ParseIntPipe) id: number) {
    return this.media.permanentDelete(id);
  }

  @Post('trash/empty')
  @Roles('editor')
  @ApiOperation({ summary: 'Очистить корзину (безвозвратно)' })
  emptyTrash() {
    return this.media.emptyTrash();
  }
}
