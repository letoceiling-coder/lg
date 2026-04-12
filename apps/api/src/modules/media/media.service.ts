import { randomUUID } from 'node:crypto';
import { existsSync, mkdirSync, promises as fs } from 'node:fs';
import { join } from 'node:path';
import { BadRequestException, Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Express } from 'express';
import { PrismaService } from '../../prisma/prisma.service';

const PUBLIC_PREFIX = '/uploads/media/';
const IMAGE_MIMES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

@Injectable()
export class MediaService implements OnModuleInit {
  private readonly mediaRoot: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {
    this.mediaRoot = this.config.get<string>('MEDIA_ROOT') ?? join(process.cwd(), 'uploads');
  }

  async onModuleInit() {
    mkdirSync(join(this.mediaRoot, 'media'), { recursive: true });
    await this.ensureSystemFolders();
  }

  /** Если миграции ещё не создали строки — создаём «Корзину» и «Загрузки» (идемпотентно). */
  private async ensureSystemFolders() {
    const hasTrash = await this.prisma.mediaFolder.findFirst({ where: { isTrash: true } });
    if (!hasTrash) {
      await this.prisma.mediaFolder.create({
        data: { name: 'Корзина', parentId: null, isTrash: true },
      });
    }
    const uploads = await this.prisma.mediaFolder.findFirst({
      where: { parentId: null, isTrash: false, name: 'Загрузки' },
    });
    if (!uploads) {
      await this.prisma.mediaFolder.create({
        data: { name: 'Загрузки', parentId: null, isTrash: false },
      });
    }
  }

  diskPathFromPublicUrl(url: string): string {
    if (!url.startsWith(PUBLIC_PREFIX)) {
      throw new BadRequestException('Некорректный URL медиа');
    }
    const name = url.slice(PUBLIC_PREFIX.length).split('/').join('');
    if (!name || name.includes('..')) throw new BadRequestException('Некорректный URL медиа');
    return join(this.mediaRoot, 'media', name);
  }

  async getTrashFolderId(): Promise<number> {
    const trash = await this.prisma.mediaFolder.findFirst({ where: { isTrash: true } });
    if (!trash) throw new BadRequestException('Системная папка «Корзина» не найдена');
    return trash.id;
  }

  async listFolders() {
    return this.prisma.mediaFolder.findMany({
      orderBy: [{ parentId: 'asc' }, { name: 'asc' }],
    });
  }

  async createFolder(parentId: number | null | undefined, rawName: string) {
    const name = rawName.trim();
    if (!name) throw new BadRequestException('Укажите имя папки');
    if (name === 'Корзина') throw new BadRequestException('Зарезервированное имя');
    const trashId = await this.getTrashFolderId();
    if (parentId === trashId) {
      throw new BadRequestException('Нельзя создавать папки внутри корзины');
    }
    if (parentId != null) {
      const parent = await this.prisma.mediaFolder.findUnique({ where: { id: parentId } });
      if (!parent) throw new BadRequestException('Родительская папка не найдена');
      if (parent.isTrash) throw new BadRequestException('Нельзя создавать папки внутри корзины');
    }
    try {
      return await this.prisma.mediaFolder.create({
        data: {
          name,
          parentId: parentId ?? null,
        },
      });
    } catch {
      throw new BadRequestException('Папка с таким именем уже существует');
    }
  }

  async deleteFolder(id: number) {
    const trashId = await this.getTrashFolderId();
    if (id === trashId) throw new BadRequestException('Нельзя удалить корзину');
    const folder = await this.prisma.mediaFolder.findUnique({
      where: { id },
      include: { _count: { select: { children: true, files: true } } },
    });
    if (!folder) throw new NotFoundException('Папка не найдена');
    if (folder.isTrash) throw new BadRequestException('Нельзя удалить корзину');
    if (folder._count.children > 0) {
      throw new BadRequestException('Сначала удалите вложенные папки');
    }
    if (folder._count.files > 0) {
      throw new BadRequestException('Папка не пуста');
    }
    await this.prisma.mediaFolder.delete({ where: { id } });
  }

  async listFiles(folderId: number | null) {
    return this.prisma.mediaFile.findMany({
      where: { folderId },
      orderBy: { id: 'desc' },
      take: 500,
    });
  }

  private extFromMime(mime: string, original: string): string {
    const fromName = original.includes('.') ? original.replace(/^.*(\.[a-zA-Z0-9]+)$/, '$1') : '';
    if (fromName && /^\.[a-zA-Z0-9]{1,8}$/.test(fromName)) return fromName.toLowerCase();
    switch (mime) {
      case 'image/jpeg':
        return '.jpg';
      case 'image/png':
        return '.png';
      case 'image/webp':
        return '.webp';
      case 'image/gif':
        return '.gif';
      default:
        return '.bin';
    }
  }

  async saveUploadedFile(
    file: Express.Multer.File,
    folderIdParam: string | undefined,
    uploadedBy: string | undefined,
  ) {
    if (!file?.buffer?.length) throw new BadRequestException('Файл не получен');
    const mime = (file.mimetype || '').toLowerCase();
    if (!IMAGE_MIMES.has(mime)) throw new BadRequestException('Допустимы только изображения (JPEG, PNG, WebP, GIF)');
    const trashId = await this.getTrashFolderId();
    let folderId: number | null = null;
    if (folderIdParam != null && folderIdParam !== '') {
      const n = Number.parseInt(folderIdParam, 10);
      if (!Number.isFinite(n)) throw new BadRequestException('Некорректный folder_id');
      if (n === trashId) throw new BadRequestException('Нельзя загружать файлы прямо в корзину');
      const folder = await this.prisma.mediaFolder.findUnique({ where: { id: n } });
      if (!folder) throw new BadRequestException('Папка не найдена');
      if (folder.isTrash) throw new BadRequestException('Нельзя загружать файлы в корзину');
      folderId = n;
    } else {
      const uploads = await this.prisma.mediaFolder.findFirst({
        where: { parentId: null, isTrash: false, name: 'Загрузки' },
      });
      folderId = uploads?.id ?? null;
    }

    const storedName = `${randomUUID()}${this.extFromMime(mime, file.originalname)}`;
    const absDir = join(this.mediaRoot, 'media');
    mkdirSync(absDir, { recursive: true });
    const absPath = join(absDir, storedName);
    await fs.writeFile(absPath, file.buffer);

    const url = `${PUBLIC_PREFIX}${storedName}`;
    const row = await this.prisma.mediaFile.create({
      data: {
        kind: 'PHOTO',
        url,
        originalFilename: file.originalname,
        sizeBytes: BigInt(file.size),
        uploadedBy: uploadedBy ?? null,
        folderId,
      },
    });
    return row;
  }

  async moveFileToTrash(id: number) {
    const trashId = await this.getTrashFolderId();
    const file = await this.prisma.mediaFile.findUnique({ where: { id } });
    if (!file) throw new NotFoundException('Файл не найден');
    if (file.folderId === trashId) throw new BadRequestException('Файл уже в корзине');
    return this.prisma.mediaFile.update({
      where: { id },
      data: {
        previousFolderId: file.folderId,
        folderId: trashId,
      },
    });
  }

  async restoreFile(id: number) {
    const trashId = await this.getTrashFolderId();
    const file = await this.prisma.mediaFile.findUnique({ where: { id } });
    if (!file) throw new NotFoundException('Файл не найден');
    if (file.folderId !== trashId) throw new BadRequestException('Восстановление только из корзины');
    return this.prisma.mediaFile.update({
      where: { id },
      data: {
        folderId: file.previousFolderId,
        previousFolderId: null,
      },
    });
  }

  async moveFile(id: number, targetFolderId: number | null | undefined) {
    const trashId = await this.getTrashFolderId();
    const file = await this.prisma.mediaFile.findUnique({ where: { id } });
    if (!file) throw new NotFoundException('Файл не найден');
    if (file.folderId === trashId) {
      throw new BadRequestException('Восстановите файл из корзины или удалите навсегда');
    }
    if (targetFolderId === trashId) {
      return this.moveFileToTrash(id);
    }
    if (targetFolderId != null) {
      const folder = await this.prisma.mediaFolder.findUnique({ where: { id: targetFolderId } });
      if (!folder) throw new BadRequestException('Папка не найдена');
      if (folder.isTrash) throw new BadRequestException('Используйте «В корзину»');
    }
    return this.prisma.mediaFile.update({
      where: { id },
      data: { folderId: targetFolderId ?? null, previousFolderId: null },
    });
  }

  async permanentDelete(id: number) {
    const trashId = await this.getTrashFolderId();
    const file = await this.prisma.mediaFile.findUnique({ where: { id } });
    if (!file) throw new NotFoundException('Файл не найден');
    if (file.folderId !== trashId) {
      throw new BadRequestException('Безвозвратное удаление только из корзины');
    }
    const disk = this.diskPathFromPublicUrl(file.url);
    await this.prisma.mediaFile.delete({ where: { id } });
    if (existsSync(disk)) await fs.unlink(disk).catch(() => undefined);
  }

  async emptyTrash() {
    const trashId = await this.getTrashFolderId();
    const files = await this.prisma.mediaFile.findMany({ where: { folderId: trashId } });
    for (const f of files) {
      const disk = this.diskPathFromPublicUrl(f.url);
      await this.prisma.mediaFile.delete({ where: { id: f.id } });
      if (existsSync(disk)) await fs.unlink(disk).catch(() => undefined);
    }
    return { removed: files.length };
  }
}
