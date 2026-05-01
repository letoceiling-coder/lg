import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import {
  BlockStatus,
  DataSource,
  ListingKind,
  ListingStatus,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { QueryBlocksDto } from './dto/query-blocks.dto';
import { CreateBlockDto } from './dto/create-block.dto';
import { catalogBlockWhereToSql } from './catalog-block-where-sql';
import { CacheService } from '../../common/cache/cache.service';
import { GeoSpatialService } from '../geo/geo-spatial.service';
import { CatalogMeilisearchService } from '../meilisearch/catalog-meilisearch.service';

function intersectBlockIdFilter(current: Prisma.BlockWhereInput['id'], ids: number[]): number[] {
  if (!current || typeof current !== 'object' || !('in' in current)) {
    return ids;
  }
  const existing = (current as { in: number[] }).in;
  if (!Array.isArray(existing) || existing.length === 0) return ids;
  const s = new Set(ids);
  return existing.filter((id) => s.has(id));
}



function parseDeadlineFilterTokens(deadlineRaw: string): Array<{ kind: 'year' | 'month' | 'quarter' | 'completed' | 'exact'; value: string }> {
  return deadlineRaw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .map((v) => {
      const low = v.toLowerCase();
      if (low === 'сдан') return { kind: 'completed' as const, value: v };
      if (/^\d{4}$/.test(v)) return { kind: 'year' as const, value: v };
      if (/^\d{4}\s+\d{2}$/.test(v)) return { kind: 'month' as const, value: v };
      if (/^Q[1-4]\s+\d{4}$/i.test(v)) return { kind: 'quarter' as const, value: v.toUpperCase() };
      if (/^\d{4}\s+Q[1-4]$/i.test(v)) {
        const parts = v.toUpperCase().split(/\s+/);
        return { kind: 'quarter' as const, value: `${parts[1]} ${parts[0]}` };
      }
      if (/^[кk][1-4]\s+\d{4}$/i.test(v)) {
        const parts = v.toUpperCase().replace('К','K').split(/\s+/);
        return { kind: 'quarter' as const, value: `${parts[0].replace('K','Q')} ${parts[1]}` };
      }
      if (/^\d{4}\s+[кk][1-4]$/i.test(v)) {
        const parts = v.toUpperCase().replace('К','K').split(/\s+/);
        return { kind: 'quarter' as const, value: `${parts[1].replace('K','Q')} ${parts[0]}` };
      }
      return { kind: 'exact' as const, value: v };
    });
}
@Injectable()
export class BlocksService {
  private readonly logger = new Logger(BlocksService.name);
  private catalogMvAvailable: boolean | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
    private readonly geo: GeoSpatialService,
    private readonly catalogSearch: CatalogMeilisearchService,
  ) {}


  private buildDeadlineWhere(deadlineRaw: string): Prisma.BlockWhereInput | null {
    const tokens = parseDeadlineFilterTokens(deadlineRaw);
    if (tokens.length === 0) return null;

    const ors: Prisma.BlockWhereInput[] = [];

    for (const t of tokens) {
      if (t.kind === 'completed') {
        ors.push({ status: BlockStatus.COMPLETED });
        continue;
      }
      if (t.kind === 'year') {
        const y = Number.parseInt(t.value, 10);
        if (Number.isFinite(y)) {
          const from = new Date(Date.UTC(y, 0, 1, 0, 0, 0));
          const to = new Date(Date.UTC(y + 1, 0, 1, 0, 0, 0));
          ors.push({ buildings: { some: { deadlineKey: { gte: from, lt: to } } } });
        }
        continue;
      }
      if (t.kind === 'month') {
        const m = t.value.match(/^(\d{4})\s+(\d{2})$/);
        if (m) {
          const y = Number.parseInt(m[1], 10);
          const mm = Number.parseInt(m[2], 10);
          if (mm >= 1 && mm <= 12) {
            const from = new Date(Date.UTC(y, mm - 1, 1, 0, 0, 0));
            const to = new Date(Date.UTC(mm === 12 ? y + 1 : y, mm === 12 ? 0 : mm, 1, 0, 0, 0));
            ors.push({ buildings: { some: { deadlineKey: { gte: from, lt: to } } } });
          }
        }
        continue;
      }
      if (t.kind === 'quarter') {
        const m = t.value.match(/^Q([1-4])\s+(\d{4})$/);
        if (m) {
          const q = Number.parseInt(m[1], 10);
          const y = Number.parseInt(m[2], 10);
          const startMonth = (q - 1) * 3;
          const from = new Date(Date.UTC(y, startMonth, 1, 0, 0, 0));
          const to = new Date(Date.UTC(startMonth + 3 >= 12 ? y + 1 : y, (startMonth + 3) % 12, 1, 0, 0, 0));
          ors.push({ buildings: { some: { deadlineKey: { gte: from, lt: to } } } });
        }
        continue;
      }
      // exact: match computed deadline label stored on block? fallback to building.deadlineKey string equality not possible.
      // We treat exact as a raw string match against buildings.deadlineKey formatted in UI elsewhere isn't stored.
      // Keep for future, currently ignored.
    }

    if (ors.length === 0) return null;
    return { OR: ors };
  }

  /**
   * Shared block filters for catalog list, counts, and stats.
   * Returns `noMatch: true` when price filter excludes all blocks.
   */
  async buildCatalogBlockWhere(query: QueryBlocksDto): Promise<{
    where: Prisma.BlockWhereInput;
    noMatch: boolean;
  }> {
    const {
      region_id, district_id, builder_id, subway_id, status, search,
      price_min, price_max,
      area_min, area_max, floor_min, floor_max,
      district_names, subway_names, builder_names,
      is_promoted, sales_start_from, sales_start_to, block_slugs, require_active_listings,
      geo_lat, geo_lng, geo_radius_m, geo_polygon, geo_preset,
      rooms,
      deadline,
      finishing,
    } = query;

    const where: Prisma.BlockWhereInput = {};
    if (region_id) where.regionId = region_id;
    if (district_id) where.districtId = district_id;
    if (builder_id) where.builderId = builder_id;
    if (status && Object.values(BlockStatus).includes(status as BlockStatus)) {
      where.status = status as BlockStatus;
    }

    const geoRes = await this.geo.resolveGeoBlockIds({
      region_id,
      geo_lat,
      geo_lng,
      geo_radius_m,
      geo_polygon,
      geo_preset,
    });
    if (geoRes.noMatch) {
      return { where: {}, noMatch: true };
    }
    if (geoRes.ids) {
      where.id = { in: geoRes.ids };
    }

    if (search?.trim()) {
      const q = search.trim();
      let meiliIds: number[] | null = null;
      if (region_id && this.catalogSearch.isEnabled()) {
        meiliIds = await this.catalogSearch.searchBlockIds(region_id, q, 2000);
      }
      if (meiliIds !== null) {
        const merged = intersectBlockIdFilter(where.id, meiliIds);
        if (merged.length === 0) {
          return { where: {}, noMatch: true };
        }
        where.id = { in: merged };
      } else {
        where.OR = [
          { name: { contains: q, mode: Prisma.QueryMode.insensitive } },
          { addresses: { some: { address: { contains: q, mode: Prisma.QueryMode.insensitive } } } },
          { district: { name: { contains: q, mode: Prisma.QueryMode.insensitive } } },
          { builder: { name: { contains: q, mode: Prisma.QueryMode.insensitive } } },
          { subways: { some: { subway: { name: { contains: q, mode: Prisma.QueryMode.insensitive } } } } },
        ];
      }
    }
    if (subway_id) {
      where.subways = { some: { subwayId: subway_id } };
    }

    if (district_names) {
      const names = district_names.split(',').map((n) => n.trim()).filter(Boolean);
      if (names.length) {
        const clause: Prisma.BlockWhereInput = {
          OR: names.map((name) => ({ district: { name: { contains: name, mode: Prisma.QueryMode.insensitive } } })),
        };
        where.AND = Array.isArray(where.AND) ? [...where.AND, clause] : [clause];
      }
    }
    if (builder_names) {
      const names = builder_names.split(',').map((n) => n.trim()).filter(Boolean);
      if (names.length) {
        const clause: Prisma.BlockWhereInput = {
          OR: names.map((name) => ({ builder: { name: { contains: name, mode: Prisma.QueryMode.insensitive } } })),
        };
        where.AND = Array.isArray(where.AND) ? [...where.AND, clause] : [clause];
      }
    }
    if (subway_names) {
      const names = subway_names.split(',').map((n) => n.trim()).filter(Boolean);
      if (names.length) {
        const clause: Prisma.BlockWhereInput = {
          OR: names.map((name) => ({ subways: { some: { subway: { name: { contains: name, mode: Prisma.QueryMode.insensitive } } } } })),
        };
        where.AND = Array.isArray(where.AND) ? [...where.AND, clause] : [clause];
      }
    }

    if (is_promoted === true) {
      where.isPromoted = true;
    }

    if (block_slugs?.trim()) {
      const slugs = block_slugs
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      if (slugs.length) {
        where.slug = { in: slugs };
      }
    }

    if (sales_start_from || sales_start_to) {
      const range: Prisma.DateTimeNullableFilter = { not: null };
      if (sales_start_from) {
        const from = new Date(`${sales_start_from}T00:00:00.000Z`);
        if (!Number.isNaN(from.getTime())) range.gte = from;
      }
      if (sales_start_to) {
        const to = new Date(`${sales_start_to}T23:59:59.999Z`);
        if (!Number.isNaN(to.getTime())) range.lte = to;
      }
      where.salesStartDate = range;
    }

    if (deadline && deadline.trim()) {
      const dw = this.buildDeadlineWhere(deadline);
      if (dw) {
        where.AND = Array.isArray(where.AND) ? [...where.AND, dw] : [dw];
      }
    }

    if (require_active_listings === true) {
      where.listings = {
        some: {
          status: ListingStatus.ACTIVE,
          kind: ListingKind.APARTMENT,
          isPublished: true,
        },
      };
    }


    const roomCategories = this.parseRoomCategories(rooms);
    if (roomCategories.length) {
      const roomTypeIds = await this.resolveRoomTypeIdsByCategories(roomCategories);
      if (roomTypeIds.length === 0) {
        return { where, noMatch: true };
      }
      const listingWhere: Prisma.ListingWhereInput = {
        status: { in: [ListingStatus.ACTIVE, ListingStatus.RESERVED] },
        kind: ListingKind.APARTMENT,
        isPublished: true,
        apartment: {
          is: {
            roomTypeId: { in: roomTypeIds },
          },
        },
      };
      if (region_id) {
        listingWhere.regionId = region_id;
      }
      const grouped = await this.prisma.listing.groupBy({
        by: ['blockId'],
        where: listingWhere,
      });
      const blockIds = grouped.map((g) => g.blockId).filter((id): id is number => id != null);
      if (blockIds.length === 0) {
        return { where, noMatch: true };
      }
      where.id = { in: intersectBlockIdFilter(where.id, blockIds) };
      if ((where.id as { in?: number[] } | undefined)?.in?.length === 0) {
        return { where, noMatch: true };
      }
    }

    if (price_min != null || price_max != null) {
      const priceFilter: Prisma.DecimalNullableFilter = { not: null, gt: 0 };
      if (price_min != null) priceFilter.gte = price_min;
      if (price_max != null) priceFilter.lte = price_max;
      const priceWhere: Prisma.ListingWhereInput = {
        status: ListingStatus.ACTIVE,
        kind: ListingKind.APARTMENT,
        price: priceFilter,
        isPublished: true,
        ...(region_id ? { block: { regionId: region_id } } : {}),
      };

      const qualifying = await this.prisma.listing.groupBy({
        by: ['blockId'],
        where: priceWhere,
      });
      let priceFilteredBlockIds = qualifying
        .map((r) => r.blockId)
        .filter((id): id is number => id != null);

      const curIn =
        where.id && typeof where.id === 'object' && 'in' in where.id
          ? (where.id as { in: number[] }).in
          : undefined;
      if (curIn?.length) {
        const set = new Set(priceFilteredBlockIds);
        priceFilteredBlockIds = curIn.filter((id) => set.has(id));
      }

      if (priceFilteredBlockIds.length === 0) {
        return { where, noMatch: true };
      }
      where.id = { in: priceFilteredBlockIds };
    }


    if (area_min != null || area_max != null) {
      const areaWhere: Prisma.ListingWhereInput = {
        status: ListingStatus.ACTIVE,
        kind: ListingKind.APARTMENT,
        isPublished: true,
        apartment: {
          is: {
            areaTotal: {
              not: null,
              ...(area_min != null ? { gte: area_min } : {}),
              ...(area_max != null ? { lte: area_max } : {}),
            } as Prisma.DecimalNullableFilter,
          },
        },
        ...(region_id ? { block: { regionId: region_id } } : {}),
      };
      const areaRows = await this.prisma.listing.groupBy({ by: ['blockId'], where: areaWhere });
      const areaIds = areaRows.map((r) => r.blockId).filter((id): id is number => id != null);
      if (areaIds.length === 0) return { where, noMatch: true };
      where.id = { in: intersectBlockIdFilter(where.id, areaIds) };
      if ((where.id as { in?: number[] } | undefined)?.in?.length === 0) return { where, noMatch: true };
    }

    if (floor_min != null || floor_max != null) {
      const floorWhere: Prisma.ListingWhereInput = {
        status: ListingStatus.ACTIVE,
        kind: ListingKind.APARTMENT,
        isPublished: true,
        apartment: {
          is: {
            floor: {
              not: null,
              ...(floor_min != null ? { gte: floor_min } : {}),
              ...(floor_max != null ? { lte: floor_max } : {}),
            } as Prisma.IntNullableFilter,
          },
        },
        ...(region_id ? { block: { regionId: region_id } } : {}),
      };
      const floorRows = await this.prisma.listing.groupBy({ by: ['blockId'], where: floorWhere });
      const floorIds = floorRows.map((r) => r.blockId).filter((id): id is number => id != null);
      if (floorIds.length === 0) return { where, noMatch: true };
      where.id = { in: intersectBlockIdFilter(where.id, floorIds) };
      if ((where.id as { in?: number[] } | undefined)?.in?.length === 0) return { where, noMatch: true };
    }

    const finishingIds = this.parseCommaSeparatedIds(finishing);
    if (finishingIds.length) {
      const finishingWhere: Prisma.ListingWhereInput = {
        status: ListingStatus.ACTIVE,
        kind: ListingKind.APARTMENT,
        isPublished: true,
        apartment: {
          is: {
            finishingId: { in: finishingIds },
          },
        },
        ...(region_id ? { block: { regionId: region_id } } : {}),
      };
      const finRows = await this.prisma.listing.groupBy({ by: ['blockId'], where: finishingWhere });
      const finBlockIds = finRows.map((r) => r.blockId).filter((id): id is number => id != null);
      if (finBlockIds.length === 0) return { where, noMatch: true };
      where.id = { in: intersectBlockIdFilter(where.id, finBlockIds) };
      if ((where.id as { in?: number[] } | undefined)?.in?.length === 0) return { where, noMatch: true };
    }

    return { where, noMatch: false };
  }

  /** Count blocks + active apartment listings matching the same filters as GET /blocks */
  async countCatalog(query: QueryBlocksDto): Promise<{ blocks: number; apartments: number }> {
    const cacheKey = this.makeCacheKey('api:catalog:counts:', query);
    const cached = await this.cache.getJson<{ blocks: number; apartments: number }>(cacheKey);
    if (cached) return cached;

    const { where, noMatch } = await this.buildCatalogBlockWhere(query);
    if (noMatch) {
      const empty = { blocks: 0, apartments: 0 };
      await this.cache.setJson(cacheKey, empty, 60);
      return empty;
    }

    const roomIds =
      query.room_type_ids
        ?.split(',')
        .map((s) => parseInt(s.trim(), 10))
        .filter((n) => Number.isFinite(n)) ?? [];

    const listingWhere: Prisma.ListingWhereInput = {
      status: ListingStatus.ACTIVE,
      kind: ListingKind.APARTMENT,
      isPublished: true,
      ...(query.region_id != null ? { regionId: query.region_id } : {}),
      block: where,
    };
    if (roomIds.length) {
      listingWhere.apartment = { roomTypeId: { in: roomIds } };
    }

    const whereSql = catalogBlockWhereToSql(where);
    if (whereSql != null && (await this.isCatalogMvAvailable())) {
      try {
        const roomFilterSql =
          roomIds.length > 0 ? Prisma.sql` AND mv.room_type_id IN (${Prisma.join(roomIds)})` : Prisma.empty;
        const rows = await this.prisma.$queryRaw<{ apartments: bigint; blocks: bigint }[]>`
          SELECT
            COUNT(*)::bigint AS apartments,
            COUNT(DISTINCT mv.block_id)::bigint AS blocks
          FROM catalog_apartment_active_mv mv
          INNER JOIN blocks b ON b.id = mv.block_id
          WHERE ${whereSql}
          ${roomFilterSql}
        `;
        const row = rows[0];
        const result = {
          blocks: Number(row?.blocks ?? 0n),
          apartments: Number(row?.apartments ?? 0n),
        };
        await this.cache.setJson(cacheKey, result, 60);
        return result;
      } catch (e: unknown) {
        this.logger.warn(`MV count fallback to base tables: ${e instanceof Error ? e.message : String(e)}`);
      }
    }

    const listingTotal = await this.prisma.listing.count({ where: listingWhere });

    const grouped = await this.prisma.listing.groupBy({
      by: ['blockId'],
      where: listingWhere,
    });
    const blocksWithListings = grouped.filter((g) => g.blockId != null).length;

    const result = { blocks: blocksWithListings, apartments: listingTotal };
    await this.cache.setJson(cacheKey, result, 60);
    return result;
  }

  async findAll(query: QueryBlocksDto) {
    const cacheKey = this.makeCacheKey('api:catalog:blocks:', query);
    const cached = await this.cache.getJson<{
      data: unknown[];
      meta: { page: number; per_page: number; total: number; total_pages: number };
    }>(cacheKey);
    if (cached) return cached;

    const { page = 1, per_page = 20, sort } = query;

    const { where, noMatch } = await this.buildCatalogBlockWhere(query);
    if (noMatch) {
      const empty = { data: [], meta: { page, per_page, total: 0, total_pages: 0 } };
      await this.cache.setJson(cacheKey, empty, 45);
      return empty;
    }

    const listInclude = {
      region: { select: { id: true, code: true, name: true } },
      district: { select: { id: true, name: true } },
      builder: { select: { id: true, name: true } },
      addresses: { orderBy: { sortOrder: 'asc' as const } },
      images: { orderBy: { sortOrder: 'asc' as const }, take: 3 },
      subways: {
        include: { subway: { select: { id: true, name: true } } },
        orderBy: { distanceTime: 'asc' as const },
        take: 3,
      },
      _count: {
        select: {
          listings: {
            // «В продаже» = ACTIVE + RESERVED. Совпадает с layouts на сайте.
            where: {
              status: { in: [ListingStatus.ACTIVE, ListingStatus.RESERVED] },
              kind: ListingKind.APARTMENT,
              isPublished: true,
            },
          },
        },
      },
    } satisfies Prisma.BlockInclude;

    const total = await this.prisma.block.count({ where });
    if (total === 0) {
      const empty = { data: [], meta: { page, per_page, total: 0, total_pages: 0 } };
      await this.cache.setJson(cacheKey, empty, 45);
      return empty;
    }

    const isPriceSort = sort === 'price_asc' || sort === 'price_desc';

    let rows: Awaited<ReturnType<typeof this.prisma.block.findMany>>;
    let priceByBlock: Map<number, { min: number; max: number }>;

    if (isPriceSort) {
      const whereSql = catalogBlockWhereToSql(where);
      const skip = (page - 1) * per_page;
      const listingAgg = Prisma.sql`
        SELECT block_id, MIN(price) AS min_p, MAX(price) AS max_p
        FROM listings
        WHERE status = ${ListingStatus.ACTIVE}::"ListingStatus"
          AND kind = ${ListingKind.APARTMENT}::"ListingKind"
          AND is_published = true
          AND price IS NOT NULL
        GROUP BY block_id
      `;

      if (whereSql != null) {
        const pageRows =
          sort === 'price_asc'
            ? await this.prisma.$queryRaw<{ id: number; min_p: unknown; max_p: unknown }[]>`
                SELECT b.id, lp.min_p, lp.max_p
                FROM blocks b
                LEFT JOIN (${listingAgg}) lp ON lp.block_id = b.id
                WHERE ${whereSql}
                ORDER BY lp.min_p ASC NULLS LAST, b.id ASC
                LIMIT ${per_page} OFFSET ${skip}
              `
            : await this.prisma.$queryRaw<{ id: number; min_p: unknown; max_p: unknown }[]>`
                SELECT b.id, lp.min_p, lp.max_p
                FROM blocks b
                LEFT JOIN (${listingAgg}) lp ON lp.block_id = b.id
                WHERE ${whereSql}
                ORDER BY lp.min_p DESC NULLS LAST, b.id ASC
                LIMIT ${per_page} OFFSET ${skip}
              `;

        priceByBlock = new Map();
        for (const r of pageRows) {
          if (r.min_p != null && r.max_p != null) {
            priceByBlock.set(r.id, { min: Number(r.min_p), max: Number(r.max_p) });
          }
        }
        const pageIds = pageRows.map((r) => r.id);
        if (!pageIds.length) {
          return {
            data: [],
            meta: { page, per_page, total, total_pages: Math.ceil(total / per_page) },
          };
        }
        const fetched = await this.prisma.block.findMany({
          where: { id: { in: pageIds } },
          include: listInclude,
        });
        const byId = new Map(fetched.map((b) => [b.id, b]));
        rows = pageIds.map((id) => byId.get(id)).filter((b): b is NonNullable<typeof b> => b != null);
      } else {
        const idRows = await this.prisma.block.findMany({
          where,
          select: { id: true },
        });
        const ids = idRows.map((r) => r.id);
        priceByBlock = await this.listingPriceBoundsByBlockIds(ids);
        const dir = sort === 'price_asc' ? 1 : -1;
        const sortedIds = [...ids].sort((a, b) => {
          const pa = priceByBlock.get(a)?.min;
          const pb = priceByBlock.get(b)?.min;
          const na = pa == null ? (dir === 1 ? Number.POSITIVE_INFINITY : Number.NEGATIVE_INFINITY) : pa;
          const nb = pb == null ? (dir === 1 ? Number.POSITIVE_INFINITY : Number.NEGATIVE_INFINITY) : pb;
          if (na !== nb) return (na - nb) * dir;
          return a - b;
        });
        const pageIds = sortedIds.slice((page - 1) * per_page, page * per_page);
        if (!pageIds.length) {
          return {
            data: [],
            meta: { page, per_page, total, total_pages: Math.ceil(total / per_page) },
          };
        }
        const fetched = await this.prisma.block.findMany({
          where: { id: { in: pageIds } },
          include: listInclude,
        });
        const byId = new Map(fetched.map((b) => [b.id, b]));
        rows = pageIds.map((id) => byId.get(id)).filter((b): b is NonNullable<typeof b> => b != null);
      }
    } else {
      const orderBy = this.parseSort(sort);
      rows = await this.prisma.block.findMany({
        where,
        orderBy,
        skip: (page - 1) * per_page,
        take: per_page,
        include: listInclude,
      });
      priceByBlock = await this.listingPriceBoundsByBlockIds(rows.map((b) => b.id));
    }

    const data = rows.map((b) => {
      const p = priceByBlock.get(b.id);
      return {
        ...b,
        listingPriceMin: p?.min ?? null,
        listingPriceMax: p?.max ?? null,
      };
    });

    const result = {
      data,
      meta: { page, per_page, total, total_pages: Math.ceil(total / per_page) },
    };
    await this.cache.setJson(cacheKey, result, 45);
    return result;
  }

  /**
   * Минимальная «вменяемая» цена объекта в рублях. Всё, что меньше — мусор из фида,
   * не должно попадать в агрегаты «от …» и в фасеты каталога.
   */
  private static readonly MIN_REASONABLE_PRICE_RUB = 100_000;

  private async listingPriceBoundsByBlockIds(
    blockIds: number[],
  ): Promise<Map<number, { min: number; max: number }>> {
    const map = new Map<number, { min: number; max: number }>();
    if (!blockIds.length) return map;
    const minPrice = BlocksService.MIN_REASONABLE_PRICE_RUB;
    if (await this.isCatalogMvAvailable()) {
      try {
        const rows = await this.prisma.$queryRaw<
          Array<{ block_id: number; min_p: unknown; max_p: unknown }>
        >`
          SELECT mv.block_id, MIN(mv.price) AS min_p, MAX(mv.price) AS max_p
          FROM catalog_apartment_active_mv mv
          WHERE mv.block_id IN (${Prisma.join(blockIds)})
            AND mv.price >= ${minPrice}
          GROUP BY mv.block_id
        `;
        for (const row of rows) {
          if (row.block_id == null || row.min_p == null) continue;
          map.set(Number(row.block_id), {
            min: Number(row.min_p),
            max: row.max_p != null ? Number(row.max_p) : Number(row.min_p),
          });
        }
        return map;
      } catch (e: unknown) {
        this.logger.warn(`MV price bounds fallback to base tables: ${e instanceof Error ? e.message : String(e)}`);
      }
    }
    const agg = await this.prisma.listing.groupBy({
      by: ['blockId'],
      where: {
        blockId: { in: blockIds },
        status: ListingStatus.ACTIVE,
        kind: ListingKind.APARTMENT,
        price: { gte: minPrice },
        isPublished: true,
      },
      _min: { price: true },
      _max: { price: true },
    });
    for (const row of agg) {
      if (row.blockId == null || row._min.price == null) continue;
      map.set(row.blockId, {
        min: Number(row._min.price),
        max: row._max.price != null ? Number(row._max.price) : Number(row._min.price),
      });
    }
    return map;
  }

  private async isCatalogMvAvailable(): Promise<boolean> {
    if (this.catalogMvAvailable != null) return this.catalogMvAvailable;
    try {
      const rows = await this.prisma.$queryRaw<Array<{ reg: string | null }>>`
        SELECT to_regclass('public.catalog_apartment_active_mv') AS reg
      `;
      this.catalogMvAvailable = Boolean(rows[0]?.reg);
    } catch {
      this.catalogMvAvailable = false;
    }
    return this.catalogMvAvailable;
  }



  private parseCommaSeparatedIds(raw?: string): number[] {
    if (!raw?.trim()) return [];
    return Array.from(
      new Set(
        raw
          .split(',')
          .map((s) => Number.parseInt(s.trim(), 10))
          .filter((n) => Number.isFinite(n)),
      ),
    );
  }

  private parseRoomCategories(raw?: string): number[] {
    if (!raw) return [];
    return Array.from(
      new Set(
        raw
          .split(',')
          .map((s) => Number.parseInt(s.trim(), 10))
          .filter((n) => Number.isFinite(n) && n >= 0 && n <= 4),
      ),
    );
  }

  private roomCategoryFromName(name?: string | null): number | null {
    const n = (name ?? '').toLowerCase();
    if (!n) return null;
    if (n.includes('студ')) return 0;
    const m = n.match(/(\d)/);
    if (m) {
      const r = Number.parseInt(m[1], 10);
      return r > 4 ? 4 : r;
    }
    return null;
  }

  private async resolveRoomTypeIdsByCategories(categories: number[]): Promise<number[]> {
    if (categories.length === 0) return [];
    const roomTypes = await this.prisma.roomType.findMany({
      select: { id: true, name: true, nameOne: true },
    });
    const wanted = new Set(categories);
    const ids: number[] = [];
    for (const rt of roomTypes) {
      const cat = this.roomCategoryFromName(rt.nameOne ?? rt.name);
      if (cat != null && wanted.has(cat)) ids.push(rt.id);
    }
    return Array.from(new Set(ids));
  }

  async invalidateCatalogCache() {
    await this.cache.delByPrefix('api:catalog:');
  }

  private makeCacheKey(prefix: string, query: QueryBlocksDto): string {
    const entries = Object.entries(query as Record<string, unknown>)
      .filter(([, value]) => value !== undefined && value !== null && value !== '')
      .sort(([a], [b]) => a.localeCompare(b));
    return `${prefix}${JSON.stringify(entries)}`;
  }

  private readonly blockDetailInclude = {
    region: true,
    district: true,
    builder: true,
    addresses: { orderBy: { sortOrder: 'asc' as const } },
    images: { orderBy: { sortOrder: 'asc' as const } },
    subways: {
      include: { subway: true },
      orderBy: { distanceTime: 'asc' as const },
    },
    buildings: {
      include: { buildingType: true, addresses: true },
      orderBy: { name: 'asc' as const },
    },
    _count: {
      select: {
        listings: {
          // «В продаже» = ACTIVE + RESERVED. SOLD исключаем, isPublished обязателен.
          where: {
            status: { in: [ListingStatus.ACTIVE, ListingStatus.RESERVED] },
            kind: ListingKind.APARTMENT,
            isPublished: true,
          },
        },
      },
    },
  } satisfies Prisma.BlockInclude;

  async findOne(id: number) {
    const block = await this.prisma.block.findUnique({
      where: { id },
      include: this.blockDetailInclude,
    });
    if (!block) throw new NotFoundException('Block not found');
    const prices = await this.listingPriceBoundsByBlockIds([id]);
    const p = prices.get(id);
    return { ...block, listingPriceMin: p?.min ?? null, listingPriceMax: p?.max ?? null };
  }

  async findBySlug(slug: string) {
    const block = await this.prisma.block.findUnique({
      where: { slug },
      include: this.blockDetailInclude,
    });
    if (!block) throw new NotFoundException('Block not found');
    const prices = await this.listingPriceBoundsByBlockIds([block.id]);
    const p = prices.get(block.id);
    return { ...block, listingPriceMin: p?.min ?? null, listingPriceMax: p?.max ?? null };
  }

  private parseBlockStatus(raw?: string): BlockStatus {
    if (raw && Object.values(BlockStatus).includes(raw as BlockStatus)) {
      return raw as BlockStatus;
    }
    return BlockStatus.BUILDING;
  }

  private parseSalesStartDate(raw?: string | null): Date | null {
    if (raw === undefined || raw === null || raw === '') return null;
    const d = new Date(`${raw}T00:00:00.000Z`);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  private parseDataSource(raw?: string): DataSource {
    if (raw && Object.values(DataSource).includes(raw as DataSource)) {
      return raw as DataSource;
    }
    return DataSource.MANUAL;
  }

  async create(dto: CreateBlockDto) {
    const slug = dto.slug || this.generateSlug(dto.name);
    const created = await this.prisma.block.create({
      data: {
        regionId: dto.regionId,
        name: dto.name,
        slug,
        description: dto.description,
        districtId: dto.districtId,
        builderId: dto.builderId,
        status: this.parseBlockStatus(dto.status),
        latitude: dto.latitude,
        longitude: dto.longitude,
        isPromoted: dto.isPromoted ?? false,
        salesStartDate: this.parseSalesStartDate(dto.salesStartDate),
        dataSource: this.parseDataSource(dto.dataSource),
      },
    });
    await this.invalidateCatalogCache();
    return created;
  }

  async update(id: number, dto: Partial<CreateBlockDto>) {
    await this.findOne(id);
    const updated = await this.prisma.block.update({
      where: { id },
      data: {
        ...(dto.slug !== undefined && dto.slug !== '' && { slug: dto.slug }),
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.districtId !== undefined && { districtId: dto.districtId }),
        ...(dto.builderId !== undefined && { builderId: dto.builderId }),
        ...(dto.status !== undefined && { status: this.parseBlockStatus(dto.status) }),
        ...(dto.latitude !== undefined && { latitude: dto.latitude }),
        ...(dto.longitude !== undefined && { longitude: dto.longitude }),
        ...(dto.isPromoted !== undefined && { isPromoted: dto.isPromoted }),
        ...(dto.salesStartDate !== undefined && {
          salesStartDate: this.parseSalesStartDate(dto.salesStartDate),
        }),
        ...(dto.dataSource !== undefined && { dataSource: this.parseDataSource(dto.dataSource) }),
      },
    });
    await this.invalidateCatalogCache();
    return updated;
  }

  async remove(id: number) {
    await this.findOne(id);
    await this.prisma.block.delete({ where: { id } });
    await this.invalidateCatalogCache();
    return { deleted: true };
  }

  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[а-яё]/gi, (c) => {
        const map: Record<string, string> = {
          а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'yo', ж: 'zh',
          з: 'z', и: 'i', й: 'j', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o',
          п: 'p', р: 'r', с: 's', т: 't', у: 'u', ф: 'f', х: 'h', ц: 'c',
          ч: 'ch', ш: 'sh', щ: 'sch', ъ: '', ы: 'y', ь: '', э: 'e', ю: 'yu',
          я: 'ya',
        };
        return map[c.toLowerCase()] || c;
      })
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  }

  private parseSort(sort?: string) {
    switch (sort) {
      case 'name_asc': return { name: 'asc' as const };
      case 'name_desc': return { name: 'desc' as const };
      case 'created_desc': return { createdAt: 'desc' as const };
      case 'sales_start_asc': return { salesStartDate: 'asc' as const };
      default: return { name: 'asc' as const };
    }
  }

  async listDeadlines(regionId: number): Promise<string[]> {
    // Distinct deadline tokens for UI filters: `YYYY Qn` plus optional `Сдан`.
    const buildings = await this.prisma.building.findMany({
      where: {
        block: { regionId },
        OR: [{ deadlineKey: { not: null } }, { deadline: { not: null } }],
      },
      select: { deadlineKey: true, deadline: true },
    });

    const tokenSet = new Set<string>();

    for (const b of buildings) {
      const raw = (b.deadlineKey ?? b.deadline) as unknown;
      if (!raw) continue;
      const dt = raw instanceof Date ? raw : new Date(String(raw));
      if (Number.isNaN(dt.getTime())) continue;
      const q = Math.ceil((dt.getMonth() + 1) / 3);
      const y = dt.getFullYear();
      const nowY = new Date().getFullYear();
      // Guard against trash years from bad sources.
      if (y < nowY - 1 || y > nowY + 15) continue;
      tokenSet.add(`${y} Q${q}`);
    }

    const hasCompleted = await this.prisma.block.count({ where: { regionId, status: BlockStatus.COMPLETED } });
    if (hasCompleted > 0) tokenSet.add('Сдан');

    const toks = Array.from(tokenSet);
    toks.sort((a, b) => {
      const la = a.toLowerCase();
      const lb = b.toLowerCase();
      if (la === 'сдан' && lb === 'сдан') return 0;
      if (la === 'сдан') return 1;
      if (lb === 'сдан') return -1;
      const ma = a.match(/^(\d{4})\s+Q([1-4])$/i);
      const mb = b.match(/^(\d{4})\s+Q([1-4])$/i);
      if (ma && mb) {
        const ya = Number(ma[1]);
        const yb = Number(mb[1]);
        if (ya !== yb) return ya - yb;
        return Number(ma[2]) - Number(mb[2]);
      }
      if (ma) return -1;
      if (mb) return 1;
      return a.localeCompare(b, 'ru');
    });

    return toks;
  }

}
