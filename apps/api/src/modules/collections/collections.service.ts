import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CollectionItemKind, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class CollectionsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(userId: string) {
    return this.prisma.userCollection.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
      include: { _count: { select: { items: true } } },
    });
  }

  async create(userId: string, name: string) {
    const trimmed = name.trim();
    if (!trimmed) throw new BadRequestException('Укажите название');
    return this.prisma.userCollection.create({
      data: { userId, name: trimmed },
    });
  }

  async getOne(userId: string, id: string) {
    const col = await this.prisma.userCollection.findFirst({
      where: { id, userId },
      include: {
        items: { orderBy: { createdAt: 'desc' } },
      },
    });
    if (!col) throw new NotFoundException('Подборка не найдена');

    const items = await Promise.all(
      col.items.map(async (it) => {
        if (it.kind === CollectionItemKind.BLOCK) {
          const b = await this.prisma.block.findUnique({
            where: { id: it.entityId },
            select: { name: true, slug: true },
          });
          return {
            id: it.id,
            kind: it.kind,
            entityId: it.entityId,
            title: b?.name ?? `ЖК #${it.entityId}`,
            slug: b?.slug ?? null,
          };
        }
        const l = await this.prisma.listing.findUnique({
          where: { id: it.entityId },
          select: { id: true, kind: true },
        });
        return {
          id: it.id,
          kind: it.kind,
          entityId: it.entityId,
          title: l ? `Объявление #${l.id}` : `Лот #${it.entityId}`,
          listingKind: l?.kind ?? null,
        };
      }),
    );

    return { id: col.id, name: col.name, createdAt: col.createdAt, updatedAt: col.updatedAt, items };
  }

  async remove(userId: string, id: string) {
    const res = await this.prisma.userCollection.deleteMany({ where: { id, userId } });
    if (res.count === 0) throw new NotFoundException('Подборка не найдена');
  }

  async addItem(userId: string, collectionId: string, kind: CollectionItemKind, entityId: number) {
    const col = await this.prisma.userCollection.findFirst({
      where: { id: collectionId, userId },
      select: { id: true },
    });
    if (!col) throw new NotFoundException('Подборка не найдена');

    if (kind === CollectionItemKind.BLOCK) {
      const b = await this.prisma.block.findUnique({ where: { id: entityId }, select: { id: true } });
      if (!b) throw new BadRequestException('ЖК не найден');
    } else {
      const l = await this.prisma.listing.findUnique({ where: { id: entityId }, select: { id: true } });
      if (!l) throw new BadRequestException('Объявление не найдено');
    }

    try {
      return await this.prisma.userCollectionItem.create({
        data: { collectionId, kind, entityId },
      });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        throw new ConflictException('Объект уже в этой подборке');
      }
      throw e;
    }
  }

  async removeItem(userId: string, collectionId: string, itemId: string) {
    const col = await this.prisma.userCollection.findFirst({
      where: { id: collectionId, userId },
      select: { id: true },
    });
    if (!col) throw new NotFoundException('Подборка не найдена');
    const res = await this.prisma.userCollectionItem.deleteMany({
      where: { id: itemId, collectionId },
    });
    if (res.count === 0) throw new NotFoundException('Элемент не найден');
  }
}
