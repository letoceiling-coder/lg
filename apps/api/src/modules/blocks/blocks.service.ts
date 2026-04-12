import { Injectable, NotFoundException } from '@nestjs/common';
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

@Injectable()
export class BlocksService {
  constructor(private readonly prisma: PrismaService) {}

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
    const { where, noMatch } = await this.buildCatalogBlockWhere(query);
    if (noMatch) {
      return { blocks: 0, apartments: 0 };
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

    const listingTotal = await this.prisma.listing.count({ where: listingWhere });

    const grouped = await this.prisma.listing.groupBy({
      by: ['blockId'],
      where: listingWhere,
    });
    const blocksWithListings = grouped.filter((g) => g.blockId != null).length;

    return { blocks: blocksWithListings, apartments: listingTotal };
  }

  async findAll(query: QueryBlocksDto) {
    const { page = 1, per_page = 20, sort } = query;

    const { where, noMatch } = await this.buildCatalogBlockWhere(query);
    if (noMatch) {
      return { data: [], meta: { page, per_page, total: 0, total_pages: 0 } };
    }

    const orderBy = this.parseSort(sort);

    const [rows, total] = await Promise.all([
      this.prisma.block.findMany({
        where,
        orderBy,
        skip: (page - 1) * per_page,
        take: per_page,
        include: {
          region: { select: { id: true, code: true, name: true } },
          district: { select: { id: true, name: true } },
          builder: { select: { id: true, name: true } },
          addresses: { orderBy: { sortOrder: 'asc' } },
          images: { orderBy: { sortOrder: 'asc' }, take: 3 },
          subways: {
            include: { subway: { select: { id: true, name: true } } },
            orderBy: { distanceTime: 'asc' },
            take: 3,
          },
          _count: {
            select: {
              listings: {
                where: { status: ListingStatus.ACTIVE, kind: ListingKind.APARTMENT, isPublished: true },
              },
            },
          },
        },
      }),
      this.prisma.block.count({ where }),
    ]);

    const blockIds = rows.map((b) => b.id);
    const priceByBlock = new Map<number, { min: number; max: number }>();
    if (blockIds.length) {
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
        priceByBlock.set(row.blockId, {
          min: Number(row._min.price),
          max: row._max.price != null ? Number(row._max.price) : Number(row._min.price),
        });
      }
    }

    const data = rows.map((b) => {
      const p = priceByBlock.get(b.id);
      return {
        ...b,
        listingPriceMin: p?.min ?? null,
        listingPriceMax: p?.max ?? null,
      };
    });

    return {
      data,
      meta: { page, per_page, total, total_pages: Math.ceil(total / per_page) },
    };
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
    return block;
  }

  async findBySlug(slug: string) {
    const block = await this.prisma.block.findUnique({
      where: { slug },
      include: this.blockDetailInclude,
    });
    if (!block) throw new NotFoundException('Block not found');
    return block;
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
    return this.prisma.block.create({
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
  }

  async update(id: number, dto: Partial<CreateBlockDto>) {
    await this.findOne(id);
    return this.prisma.block.update({
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
  }

  async remove(id: number) {
    await this.findOne(id);
    await this.prisma.block.delete({ where: { id } });
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
      case 'price_asc': return { name: 'asc' as const };
      case 'price_desc': return { name: 'desc' as const };
      case 'sales_start_asc': return { salesStartDate: 'asc' as const };
      default: return { name: 'asc' as const };
    }
  }
}
