import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, $Enums } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { QueryListingsDto } from './dto/query-listings.dto';

@Injectable()
export class ListingsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: QueryListingsDto) {
    const page = query.page ?? 1;
    const per_page = query.per_page ?? 20;
    const where = this.buildWhere(query);
    const orderBy = this.parseSort(query.sort);

    const include = {
      apartment: {
        include: {
          roomType: true,
          finishing: true,
          buildingType: true,
        },
      },
      block: { select: { name: true, slug: true } },
      building: { select: { name: true } },
      builder: { select: { name: true } },
      region: { select: { code: true, name: true } },
    } satisfies Prisma.ListingInclude;

    const [data, total] = await Promise.all([
      this.prisma.listing.findMany({
        where,
        orderBy,
        skip: (page - 1) * per_page,
        take: per_page,
        include,
      }),
      this.prisma.listing.count({ where }),
    ]);

    return {
      data,
      meta: { page, per_page, total, total_pages: Math.ceil(total / per_page) },
    };
  }

  async findOne(id: number) {
    const listing = await this.prisma.listing.findUnique({
      where: { id },
      include: {
        apartment: {
          include: {
            roomType: true,
            finishing: true,
            buildingType: true,
            banks: true,
            contracts: true,
          },
        },
        block: {
          include: {
            addresses: { orderBy: { sortOrder: 'asc' } },
            images: { orderBy: { sortOrder: 'asc' }, take: 4 },
            subways: {
              include: { subway: { select: { id: true, name: true } } },
              orderBy: { distanceTime: 'asc' },
              take: 3,
            },
          },
        },
        building: true,
        builder: true,
        district: true,
        region: true,
      },
    });
    if (!listing) throw new NotFoundException('Listing not found');
    return listing;
  }

  private buildWhere(query: QueryListingsDto): Prisma.ListingWhereInput {
    const where: Prisma.ListingWhereInput = {};

    if (query.region_id != null) where.regionId = query.region_id;
    if (query.kind) where.kind = query.kind as $Enums.ListingKind;
    if (query.status) where.status = query.status as $Enums.ListingStatus;
    if (query.data_source) where.dataSource = query.data_source as $Enums.DataSource;
    if (query.block_id != null) where.blockId = query.block_id;
    if (query.builder_id != null) where.builderId = query.builder_id;
    if (query.district_id != null) where.districtId = query.district_id;

    const priceFilter: Prisma.DecimalNullableFilter<'Listing'> = {};
    if (query.price_min != null) priceFilter.gte = query.price_min;
    if (query.price_max != null) priceFilter.lte = query.price_max;
    if (Object.keys(priceFilter).length) where.price = priceFilter;

    if (query.subway_id != null) {
      where.block = {
        ...(query.block_id != null ? { id: query.block_id } : {}),
        subways: { some: { subwayId: query.subway_id } },
      };
    }

    const apartmentParts = this.buildApartmentWhereParts(query);
    if (apartmentParts.length) {
      where.apartment = { AND: apartmentParts };
    }

    if (query.search?.trim()) {
      const term = query.search.trim();
      const searchOr: Prisma.ListingWhereInput[] = [
        { block: { name: { contains: term, mode: 'insensitive' } } },
        { apartment: { blockName: { contains: term, mode: 'insensitive' } } },
      ];
      where.AND = [...(Array.isArray(where.AND) ? where.AND : where.AND ? [where.AND] : []), { OR: searchOr }];
    }

    return where;
  }

  private buildApartmentWhereParts(query: QueryListingsDto): Prisma.ListingApartmentWhereInput[] {
    const parts: Prisma.ListingApartmentWhereInput[] = [];

    const roomIds = this.parseIdList(query.rooms);
    if (roomIds?.length) parts.push({ roomTypeId: { in: roomIds } });

    const finishingIds = this.parseIdList(query.finishing);
    if (finishingIds?.length) parts.push({ finishingId: { in: finishingIds } });

    const buildingTypeIds = this.parseIdList(query.building_type);
    if (buildingTypeIds?.length) parts.push({ buildingTypeId: { in: buildingTypeIds } });

    if (query.floor_min != null) {
      parts.push({ floor: { gte: query.floor_min } });
    }
    if (query.floor_max != null) {
      parts.push({ floor: { lte: query.floor_max } });
    }

    if (query.area_total_min != null) {
      parts.push({ areaTotal: { gte: query.area_total_min } });
    }
    if (query.area_total_max != null) {
      parts.push({ areaTotal: { lte: query.area_total_max } });
    }

    if (query.area_kitchen_min != null) {
      parts.push({ areaKitchen: { gte: query.area_kitchen_min } });
    }
    if (query.area_kitchen_max != null) {
      parts.push({ areaKitchen: { lte: query.area_kitchen_max } });
    }

    if (query.not_first_floor) {
      parts.push({ floor: { gt: 1 } });
    }

    if (query.not_last_floor) {
      parts.push({
        floor: { lt: this.prisma.listingApartment.fields.floorsTotal },
      });
    }

    return parts;
  }

  private parseIdList(raw?: string): number[] | undefined {
    if (!raw?.trim()) return undefined;
    const ids = raw
      .split(',')
      .map((s) => parseInt(s.trim(), 10))
      .filter((n) => !Number.isNaN(n));
    return ids.length ? ids : undefined;
  }

  private parseSort(sort?: string): Prisma.ListingOrderByWithRelationInput {
    switch (sort) {
      case 'price_asc':
        return { price: 'asc' };
      case 'price_desc':
        return { price: 'desc' };
      case 'area_asc':
        return { apartment: { areaTotal: 'asc' } };
      case 'area_desc':
        return { apartment: { areaTotal: 'desc' } };
      case 'floor_asc':
        return { apartment: { floor: 'asc' } };
      case 'floor_desc':
        return { apartment: { floor: 'desc' } };
      case 'created_desc':
        return { createdAt: 'desc' };
      default:
        return { createdAt: 'desc' };
    }
  }
}
