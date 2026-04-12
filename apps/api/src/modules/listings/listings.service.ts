import { randomUUID } from 'node:crypto';
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, $Enums } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { QueryListingsDto } from './dto/query-listings.dto';
import type {
  CreateManualApartmentDto,
  UpdateManualApartmentDto,
} from './dto/manual-apartment.dto';

const MEDIA_LIB_PREFIX = '/uploads/media/';

function assertMediaLibraryUrl(u: string | undefined | null, label: string) {
  if (u == null || u === '') return;
  if (!u.startsWith(MEDIA_LIB_PREFIX)) {
    throw new BadRequestException(
      `${label}: разрешены только ссылки из медиатеки (${MEDIA_LIB_PREFIX}…)`,
    );
  }
}

function validateManualApartmentMedia(apt: {
  planUrl?: string | null;
  finishingPhotoUrl?: string | null;
  extraPhotoUrls?: unknown;
}) {
  assertMediaLibraryUrl(apt.planUrl ?? undefined, 'Планировка');
  assertMediaLibraryUrl(apt.finishingPhotoUrl ?? undefined, 'Фото отделки');
  if (apt.extraPhotoUrls == null) return;
  if (!Array.isArray(apt.extraPhotoUrls)) {
    throw new BadRequestException('extraPhotoUrls: ожидается массив строк');
  }
  if (apt.extraPhotoUrls.length > 24) {
    throw new BadRequestException('Не более 24 дополнительных фото');
  }
  let i = 0;
  for (const u of apt.extraPhotoUrls) {
    i++;
    if (typeof u !== 'string') {
      throw new BadRequestException(`Дополнительное фото #${i}: неверный формат`);
    }
    assertMediaLibraryUrl(u, `Дополнительное фото #${i}`);
  }
}

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

  async createManualApartment(dto: CreateManualApartmentDto) {
    const region = await this.prisma.feedRegion.findUnique({
      where: { id: dto.regionId },
      select: { id: true },
    });
    if (!region) throw new BadRequestException('Регион не найден');

    if (dto.blockId != null) {
      const block = await this.prisma.block.findUnique({
        where: { id: dto.blockId },
        select: { id: true, regionId: true },
      });
      if (!block) throw new BadRequestException('ЖК не найден');
      if (block.regionId !== dto.regionId) {
        throw new BadRequestException('ЖК относится к другому региону');
      }
    }

    const externalId = `manual-${randomUUID()}`;
    const status = (dto.status ?? 'DRAFT') as $Enums.ListingStatus;
    const a = dto.apartment;
    validateManualApartmentMedia(a);

    return this.prisma.listing.create({
      data: {
        regionId: dto.regionId,
        kind: 'APARTMENT',
        blockId: dto.blockId ?? null,
        externalId,
        price: new Prisma.Decimal(dto.price),
        currency: 'RUB',
        status,
        dataSource: 'MANUAL',
        isPublished: dto.isPublished ?? false,
        apartment: {
          create: {
            areaTotal: new Prisma.Decimal(a.areaTotal),
            areaKitchen:
              a.areaKitchen != null ? new Prisma.Decimal(a.areaKitchen) : null,
            floor: a.floor ?? null,
            floorsTotal: a.floorsTotal ?? null,
            roomTypeId: a.roomTypeId ?? null,
            finishingId: a.finishingId ?? null,
            planUrl: a.planUrl ?? null,
            finishingPhotoUrl: a.finishingPhotoUrl ?? null,
            extraPhotoUrls:
              a.extraPhotoUrls != null && a.extraPhotoUrls.length > 0
                ? (a.extraPhotoUrls as Prisma.InputJsonValue)
                : undefined,
            buildingName: a.buildingName ?? null,
            number: a.number ?? null,
          },
        },
      },
      include: {
        apartment: { include: { roomType: true, finishing: true } },
        block: { select: { id: true, name: true, slug: true } },
        region: { select: { id: true, code: true, name: true } },
      },
    });
  }

  async updateManualApartment(id: number, dto: UpdateManualApartmentDto) {
    const row = await this.requireManualListing(id);

    if (dto.apartment) {
      validateManualApartmentMedia(dto.apartment);
    }

    if (dto.blockId !== undefined && dto.blockId != null) {
      const block = await this.prisma.block.findUnique({
        where: { id: dto.blockId },
        select: { id: true, regionId: true },
      });
      if (!block) throw new BadRequestException('ЖК не найден');
      if (block.regionId !== row.regionId) {
        throw new BadRequestException('ЖК относится к другому региону');
      }
    }

    const listingPatch: Prisma.ListingUpdateInput = {};
    if (dto.price !== undefined) listingPatch.price = new Prisma.Decimal(dto.price);
    if (dto.status !== undefined) {
      listingPatch.status = dto.status as $Enums.ListingStatus;
    }
    if (dto.isPublished !== undefined) listingPatch.isPublished = dto.isPublished;
    if (dto.blockId !== undefined) {
      if (dto.blockId === null) {
        listingPatch.block = { disconnect: true };
      } else {
        listingPatch.block = { connect: { id: dto.blockId } };
      }
    }

    const aptPatch: Prisma.ListingApartmentUpdateInput = {};
    if (dto.apartment) {
      const p = dto.apartment;
      if (p.areaTotal !== undefined) aptPatch.areaTotal = new Prisma.Decimal(p.areaTotal);
      if (p.areaKitchen !== undefined) {
        aptPatch.areaKitchen =
          p.areaKitchen != null ? new Prisma.Decimal(p.areaKitchen) : null;
      }
      if (p.floor !== undefined) aptPatch.floor = p.floor;
      if (p.floorsTotal !== undefined) aptPatch.floorsTotal = p.floorsTotal;
      if (p.roomTypeId !== undefined) {
        aptPatch.roomType =
          p.roomTypeId == null ? { disconnect: true } : { connect: { id: p.roomTypeId } };
      }
      if (p.finishingId !== undefined) {
        aptPatch.finishing =
          p.finishingId == null ? { disconnect: true } : { connect: { id: p.finishingId } };
      }
      if (p.planUrl !== undefined) aptPatch.planUrl = p.planUrl;
      if (p.finishingPhotoUrl !== undefined) aptPatch.finishingPhotoUrl = p.finishingPhotoUrl;
      if (p.extraPhotoUrls !== undefined) {
        aptPatch.extraPhotoUrls =
          p.extraPhotoUrls != null && p.extraPhotoUrls.length > 0
            ? (p.extraPhotoUrls as Prisma.InputJsonValue)
            : Prisma.DbNull;
      }
      if (p.buildingName !== undefined) aptPatch.buildingName = p.buildingName;
      if (p.number !== undefined) aptPatch.number = p.number;
    }

    const hasListing = Object.keys(listingPatch).length > 0;
    const hasApt = Object.keys(aptPatch).length > 0;
    if (!hasListing && !hasApt) {
      throw new BadRequestException('Укажите хотя бы одно поле для обновления');
    }

    return this.prisma.listing.update({
      where: { id },
      data: {
        ...listingPatch,
        ...(Object.keys(aptPatch).length > 0 ? { apartment: { update: aptPatch } } : {}),
      },
      include: {
        apartment: { include: { roomType: true, finishing: true } },
        block: { select: { id: true, name: true, slug: true } },
        region: { select: { id: true, code: true, name: true } },
      },
    });
  }

  async deleteManualListing(id: number) {
    await this.requireManualListing(id);
    await this.prisma.listing.delete({ where: { id } });
    return { deleted: true, id };
  }

  private async requireManualListing(id: number) {
    const row = await this.prisma.listing.findUnique({
      where: { id },
      select: { id: true, dataSource: true, regionId: true },
    });
    if (!row) throw new NotFoundException('Объявление не найдено');
    if (row.dataSource !== 'MANUAL') {
      throw new BadRequestException('Доступно только для ручных объявлений (MANUAL)');
    }
    return row;
  }
}
