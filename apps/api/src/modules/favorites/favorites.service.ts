import { Injectable, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class FavoritesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(userId: string) {
    return this.prisma.favorite.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        block: { select: { id: true, name: true, slug: true } },
        listing: { select: { id: true, kind: true, price: true } },
      },
    });
  }

  async addBlock(userId: string, blockId: number) {
    try {
      return await this.prisma.favorite.create({
        data: { userId, blockId },
      });
    } catch {
      throw new ConflictException('Already in favorites');
    }
  }

  async addListing(userId: string, listingId: number) {
    try {
      return await this.prisma.favorite.create({
        data: { userId, listingId },
      });
    } catch {
      throw new ConflictException('Already in favorites');
    }
  }

  async remove(userId: string, id: number) {
    await this.prisma.favorite.deleteMany({
      where: { id, userId },
    });
  }

  async ids(userId: string) {
    const rows = await this.prisma.favorite.findMany({
      where: { userId },
      select: { blockId: true, listingId: true },
    });
    return {
      blockIds: rows.filter(r => r.blockId != null).map(r => r.blockId!),
      listingIds: rows.filter(r => r.listingId != null).map(r => r.listingId!),
    };
  }
}
