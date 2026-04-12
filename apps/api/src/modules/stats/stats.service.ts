import { Injectable } from '@nestjs/common';
import { ListingStatus, ListingKind } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

const HERO_LISTING_KINDS: ListingKind[] = [
  ListingKind.APARTMENT,
  ListingKind.HOUSE,
  ListingKind.LAND,
  ListingKind.COMMERCIAL,
];

@Injectable()
export class StatsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Публичные счётчики активных опубликованных лотов по типу (для табов на главной). */
  async listingKindCounts(regionId: number): Promise<Record<string, number>> {
    const rows = await this.prisma.listing.groupBy({
      by: ['kind'],
      where: {
        regionId,
        status: ListingStatus.ACTIVE,
        isPublished: true,
        kind: { in: HERO_LISTING_KINDS },
      },
      _count: { _all: true },
    });
    const out: Record<string, number> = {
      APARTMENT: 0,
      HOUSE: 0,
      LAND: 0,
      COMMERCIAL: 0,
    };
    for (const r of rows) {
      const k = String(r.kind);
      if (k in out) out[k] = r._count._all;
    }
    return out;
  }

  async getCounters() {
    const [blocks, apartments, builders, regions] = await Promise.all([
      this.prisma.block.count(),
      this.prisma.listing.count({
        where: { status: ListingStatus.ACTIVE, kind: ListingKind.APARTMENT, isPublished: true },
      }),
      this.prisma.builder.count(),
      this.prisma.feedRegion.count({ where: { isEnabled: true } }),
    ]);

    return { blocks, apartments, builders, regions };
  }
}
