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

@Injectable()
export class BlocksService {
  private readonly logger = new Logger(BlocksService.name);
  private catalogMvAvailable: boolean | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
  ) {}

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
      district_names, subway_names, builder_names,
      is_promoted, sales_start_from, sales_start_to, block_slugs, require_active_listings,
    } = query;

    const where: Prisma.BlockWhereInput = {};
    if (region_id) where.regionId = region_id;
    if (district_id) where.districtId = district_id;
    if (builder_id) where.builderId = builder_id;
    if (status && Object.values(BlockStatus).includes(status as BlockStatus)) {
      where.status = status as BlockStatus;
    }
    if (search?.trim()) {
      const q = search.trim();
      where.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { addresses: { some: { address: { contains: q, mode: 'insensitive' } } } },
        { district: { name: { contains: q, mode: 'insensitive' } } },
        { builder: { name: { contains: q, mode: 'insensitive' } } },
        { subways: { some: { subway: { name: { contains: q, mode: 'insensitive' } } } } },
      ];
    }
    if (subway_id) {
      where.subways = { some: { subwayId: subway_id } };
    }

    if (district_names) {
      const names = district_names.split(',').map((n) => n.trim()).filter(Boolean);
      if (names.length) {
        where.district = { name: { in: names } };
      }
    }
    if (builder_names) {
      const names = builder_names.split(',').map((n) => n.trim()).filter(Boolean);
      if (names.length) {
        where.builder = { name: { in: names } };
      }
    }
    if (subway_names) {
      const names = subway_names.split(',').map((n) => n.trim()).filter(Boolean);
      if (names.length) {
        where.subways = { some: { subway: { name: { in: names } } } };
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

    if (require_active_listings === true) {
      where.listings = {
        some: {
          status: ListingStatus.ACTIVE,
          kind: ListingKind.APARTMENT,
          isPublished: true,
        },
      };
    }

    if (price_min != null || price_max != null) {
      const priceFilter: Prisma.DecimalNullableFilter = { not: null };
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
      const priceFilteredBlockIds = qualifying
        .map((r) => r.blockId)
        .filter((id): id is number => id != null);

      if (priceFilteredBlockIds.length === 0) {
        return { where, noMatch: true };
      }
      where.id = { in: priceFilteredBlockIds };
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
            where: { status: ListingStatus.ACTIVE, kind: ListingKind.APARTMENT, isPublished: true },
          },
        },
      },
    } as const;

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

  private async listingPriceBoundsByBlockIds(
    blockIds: number[],
  ): Promise<Map<number, { min: number; max: number }>> {
    const map = new Map<number, { min: number; max: number }>();
    if (!blockIds.length) return map;
    if (await this.isCatalogMvAvailable()) {
      try {
        const rows = await this.prisma.$queryRaw<
          Array<{ block_id: number; min_p: unknown; max_p: unknown }>
        >`
          SELECT mv.block_id, MIN(mv.price) AS min_p, MAX(mv.price) AS max_p
          FROM catalog_apartment_active_mv mv
          WHERE mv.block_id IN (${Prisma.join(blockIds)})
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
        price: { not: null },
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
          where: { status: ListingStatus.ACTIVE, kind: ListingKind.APARTMENT, isPublished: true },
        },
      },
    },
  };

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
}
