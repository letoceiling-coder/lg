import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { BlocksService } from '../blocks/blocks.service';
import { QueryBlocksDto } from '../blocks/dto/query-blocks.dto';

export type CatalogHintsResult = {
  complexes: Array<{
    id: number;
    slug: string;
    name: string;
    districtName: string | null;
    metroName: string | null;
    imageUrl: string | null;
  }>;
  metro: Array<{ id: number; name: string }>;
  districts: Array<{ id: number; name: string }>;
  streets: Array<{
    address: string;
    blockId: number;
    blockSlug: string;
    blockName: string;
  }>;
};

@Injectable()
export class SearchService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly blocks: BlocksService,
  ) {}

  async catalogHints(regionId: number, rawQ: string, limit = 15): Promise<CatalogHintsResult> {
    const q = rawQ.trim();
    if (q.length < 2) {
      return { complexes: [], metro: [], districts: [], streets: [] };
    }
    const take = Math.min(Math.max(limit, 1), 30);

    const queryDto: QueryBlocksDto = {
      region_id: regionId,
      search: q,
      page: 1,
      per_page: take,
      require_active_listings: true,
    };

    const { where, noMatch } = await this.blocks.buildCatalogBlockWhere(queryDto);

    const [complexRows, metroRows, districtRows, addressRows] = await Promise.all([
      noMatch
        ? Promise.resolve([])
        : this.prisma.block.findMany({
            where,
            take,
            orderBy: { name: 'asc' },
            select: {
              id: true,
              slug: true,
              name: true,
              district: { select: { name: true } },
              images: { orderBy: { sortOrder: 'asc' }, take: 1, select: { url: true } },
              subways: {
                orderBy: { distanceTime: 'asc' },
                take: 1,
                select: { subway: { select: { name: true } } },
              },
            },
          }),
      this.prisma.subway.findMany({
        where: {
          regionId,
          name: { contains: q, mode: 'insensitive' },
        },
        select: { id: true, name: true },
        take,
        orderBy: { name: 'asc' },
      }),
      this.prisma.district.findMany({
        where: {
          regionId,
          name: { contains: q, mode: 'insensitive' },
        },
        select: { id: true, name: true },
        take,
        orderBy: { name: 'asc' },
      }),
      this.prisma.blockAddress.findMany({
        where: {
          address: { contains: q, mode: 'insensitive' },
          block: { regionId },
        },
        take: take * 3,
        select: {
          address: true,
          block: { select: { id: true, slug: true, name: true } },
        },
      }),
    ]);

    const seenAddr = new Set<string>();
    const streets: CatalogHintsResult['streets'] = [];
    for (const r of addressRows) {
      const key = `${r.block.id}\0${r.address}`;
      if (seenAddr.has(key)) continue;
      seenAddr.add(key);
      streets.push({
        address: r.address,
        blockId: r.block.id,
        blockSlug: r.block.slug,
        blockName: r.block.name,
      });
      if (streets.length >= take) break;
    }

    return {
      complexes: complexRows.map((b) => ({
        id: b.id,
        slug: b.slug,
        name: b.name,
        districtName: b.district?.name ?? null,
        metroName: b.subways[0]?.subway.name ?? null,
        imageUrl: b.images[0]?.url ?? null,
      })),
      metro: metroRows,
      districts: districtRows,
      streets,
    };
  }
}
