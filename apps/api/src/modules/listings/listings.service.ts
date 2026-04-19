import { randomUUID } from 'node:crypto';
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, $Enums } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { GeoSpatialService } from '../geo/geo-spatial.service';
import { QueryListingsDto } from './dto/query-listings.dto';
import type {
  CreateManualApartmentDto,
  UpdateManualApartmentDto,
} from './dto/manual-apartment.dto';
import type { CreateManualHouseDto, UpdateManualHouseDto } from './dto/manual-house.dto';
import type { CreateManualLandDto, UpdateManualLandDto } from './dto/manual-land.dto';
import type {
  CreateManualCommercialDto,
  UpdateManualCommercialDto,
} from './dto/manual-commercial.dto';
import type {
  CreateManualParkingDto,
  UpdateManualParkingDto,
} from './dto/manual-parking.dto';

const MEDIA_LIB_PREFIX = '/uploads/media/';
type ActorContext = { userId: string; role: string };

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

function validateManualGalleryMedia(data: {
  photoUrl?: string | null;
  extraPhotoUrls?: unknown;
}, label: string) {
  assertMediaLibraryUrl(data.photoUrl ?? undefined, `${label}: основное фото`);
  if (data.extraPhotoUrls == null) return;
  if (!Array.isArray(data.extraPhotoUrls)) {
    throw new BadRequestException(`${label}: extraPhotoUrls ожидается массив строк`);
  }
  if (data.extraPhotoUrls.length > 24) {
    throw new BadRequestException(`${label}: не более 24 дополнительных фото`);
  }
  let i = 0;
  for (const u of data.extraPhotoUrls) {
    i += 1;
    if (typeof u !== 'string') {
      throw new BadRequestException(`${label}: дополнительное фото #${i} имеет неверный формат`);
    }
    assertMediaLibraryUrl(u, `${label}: дополнительное фото #${i}`);
  }
}

@Injectable()
export class ListingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly geo: GeoSpatialService,
  ) {}

  async findAll(query: QueryListingsDto, actor?: ActorContext) {
    const page = query.page ?? 1;
    const per_page = query.per_page ?? 20;
    const where = await this.buildWhere(query);
    if (actor?.role === 'agent') {
      where.dataSource = 'MANUAL';
      where.externalId = { startsWith: this.agentExternalIdPrefix(actor.userId) };
    }
    const orderBy = this.parseSort(query.sort);

    const include = {
      apartment: {
        include: {
          roomType: true,
          finishing: true,
          buildingType: true,
        },
      },
      house: true,
      land: true,
      commercial: true,
      parking: true,
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
        house: true,
        land: true,
        commercial: true,
        parking: true,
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

  private async buildWhere(query: QueryListingsDto): Promise<Prisma.ListingWhereInput> {
    const where: Prisma.ListingWhereInput = {};

    if (query.region_id != null) where.regionId = query.region_id;

    const geoRes = await this.geo.resolveGeoBlockIds({
      region_id: query.region_id,
      geo_lat: query.geo_lat,
      geo_lng: query.geo_lng,
      geo_radius_m: query.geo_radius_m,
      geo_polygon: query.geo_polygon,
      geo_preset: query.geo_preset,
    });
    if (geoRes.noMatch) {
      where.id = { lt: 0 };
      return where;
    }
    const geoIds = geoRes.ids;
    if (geoIds && query.block_id != null && !geoIds.includes(query.block_id)) {
      where.id = { lt: 0 };
      return where;
    }
    if (query.kind) where.kind = query.kind as $Enums.ListingKind;
    if (query.statuses?.trim()) {
      const statusList = query.statuses
        .split(',')
        .map((s) => s.trim())
        .filter((s) => s.length > 0) as $Enums.ListingStatus[];
      if (statusList.length === 1) {
        where.status = statusList[0];
      } else if (statusList.length > 1) {
        where.status = { in: statusList };
      }
    } else if (query.status) {
      where.status = query.status as $Enums.ListingStatus;
    }
    if (query.is_published !== undefined) {
      where.isPublished = query.is_published;
    }
    if (query.data_source) where.dataSource = query.data_source as $Enums.DataSource;
    if (query.builder_id != null) where.builderId = query.builder_id;
    if (query.district_id != null) where.districtId = query.district_id;

    const priceFilter: Prisma.DecimalNullableFilter<'Listing'> = {};
    if (query.price_min != null) priceFilter.gte = query.price_min;
    if (query.price_max != null) priceFilter.lte = query.price_max;
    if (Object.keys(priceFilter).length) where.price = priceFilter;

    if (query.subway_id != null) {
      where.block = {
        ...(query.block_id != null
          ? { id: query.block_id }
          : geoIds
            ? { id: { in: geoIds } }
            : {}),
        subways: { some: { subwayId: query.subway_id } },
      };
    } else if (query.block_id != null) {
      where.blockId = query.block_id;
    } else if (geoIds) {
      where.blockId = { in: geoIds };
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

  async createManualApartment(dto: CreateManualApartmentDto, actorUserId?: string, actorRole?: string) {
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

    const externalId = actorRole === 'agent' && actorUserId
      ? `${this.agentExternalIdPrefix(actorUserId)}${randomUUID()}`
      : `manual-${randomUUID()}`;
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

  async createManualHouse(dto: CreateManualHouseDto, actorUserId?: string, actorRole?: string) {
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

    const externalId = actorRole === 'agent' && actorUserId
      ? `${this.agentExternalIdPrefix(actorUserId)}${randomUUID()}`
      : `manual-${randomUUID()}`;
    const status = (dto.status ?? 'DRAFT') as $Enums.ListingStatus;
    const h = dto.house;
    validateManualGalleryMedia(h, 'Дом');

    return this.prisma.listing.create({
      data: {
        regionId: dto.regionId,
        kind: 'HOUSE',
        blockId: dto.blockId ?? null,
        externalId,
        price: new Prisma.Decimal(dto.price),
        currency: 'RUB',
        status,
        dataSource: 'MANUAL',
        isPublished: dto.isPublished ?? false,
        house: {
          create: {
            houseType: h.houseType ?? null,
            areaTotal: h.areaTotal != null ? new Prisma.Decimal(h.areaTotal) : null,
            areaLand: h.areaLand != null ? new Prisma.Decimal(h.areaLand) : null,
            floorsCount: h.floorsCount ?? null,
            bedrooms: h.bedrooms ?? null,
            bathrooms: h.bathrooms ?? null,
            hasGarage: h.hasGarage ?? null,
            yearBuilt: h.yearBuilt ?? null,
            photoUrl: h.photoUrl ?? null,
            extraPhotoUrls:
              h.extraPhotoUrls != null && h.extraPhotoUrls.length > 0
                ? (h.extraPhotoUrls as Prisma.InputJsonValue)
                : undefined,
          },
        },
      },
      include: {
        house: true,
        block: { select: { id: true, name: true, slug: true } },
        region: { select: { id: true, code: true, name: true } },
      },
    });
  }

  async createManualLand(dto: CreateManualLandDto, actorUserId?: string, actorRole?: string) {
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

    const externalId = actorRole === 'agent' && actorUserId
      ? `${this.agentExternalIdPrefix(actorUserId)}${randomUUID()}`
      : `manual-${randomUUID()}`;
    const status = (dto.status ?? 'DRAFT') as $Enums.ListingStatus;
    const l = dto.land;
    validateManualGalleryMedia(l, 'Участок');

    return this.prisma.listing.create({
      data: {
        regionId: dto.regionId,
        kind: 'LAND',
        blockId: dto.blockId ?? null,
        externalId,
        price: new Prisma.Decimal(dto.price),
        currency: 'RUB',
        status,
        dataSource: 'MANUAL',
        isPublished: dto.isPublished ?? false,
        land: {
          create: {
            areaSotki: l.areaSotki != null ? new Prisma.Decimal(l.areaSotki) : null,
            landCategory: l.landCategory ?? null,
            cadastralNumber: l.cadastralNumber ?? null,
            hasCommunications: l.hasCommunications ?? null,
            photoUrl: l.photoUrl ?? null,
            extraPhotoUrls:
              l.extraPhotoUrls != null && l.extraPhotoUrls.length > 0
                ? (l.extraPhotoUrls as Prisma.InputJsonValue)
                : undefined,
          },
        },
      },
      include: {
        land: true,
        block: { select: { id: true, name: true, slug: true } },
        region: { select: { id: true, code: true, name: true } },
      },
    });
  }

  async createManualCommercial(dto: CreateManualCommercialDto, actorUserId?: string, actorRole?: string) {
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

    const externalId = actorRole === 'agent' && actorUserId
      ? `${this.agentExternalIdPrefix(actorUserId)}${randomUUID()}`
      : `manual-${randomUUID()}`;
    const status = (dto.status ?? 'DRAFT') as $Enums.ListingStatus;
    const c = dto.commercial;

    return this.prisma.listing.create({
      data: {
        regionId: dto.regionId,
        kind: 'COMMERCIAL',
        blockId: dto.blockId ?? null,
        externalId,
        price: new Prisma.Decimal(dto.price),
        currency: 'RUB',
        status,
        dataSource: 'MANUAL',
        isPublished: dto.isPublished ?? false,
        commercial: {
          create: {
            commercialType: c.commercialType ?? null,
            area: c.area != null ? new Prisma.Decimal(c.area) : null,
            floor: c.floor ?? null,
            hasSeparateEntrance: c.hasSeparateEntrance ?? null,
          },
        },
      },
      include: {
        commercial: true,
        block: { select: { id: true, name: true, slug: true } },
        region: { select: { id: true, code: true, name: true } },
      },
    });
  }

  async createManualParking(dto: CreateManualParkingDto, actorUserId?: string, actorRole?: string) {
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

    const externalId = actorRole === 'agent' && actorUserId
      ? `${this.agentExternalIdPrefix(actorUserId)}${randomUUID()}`
      : `manual-${randomUUID()}`;
    const status = (dto.status ?? 'DRAFT') as $Enums.ListingStatus;
    const p = dto.parking;

    return this.prisma.listing.create({
      data: {
        regionId: dto.regionId,
        kind: 'PARKING',
        blockId: dto.blockId ?? null,
        externalId,
        price: new Prisma.Decimal(dto.price),
        currency: 'RUB',
        status,
        dataSource: 'MANUAL',
        isPublished: dto.isPublished ?? false,
        parking: {
          create: {
            parkingType: p.parkingType ?? null,
            area: p.area != null ? new Prisma.Decimal(p.area) : null,
            floor: p.floor ?? null,
            number: p.number ?? null,
          },
        },
      },
      include: {
        parking: true,
        block: { select: { id: true, name: true, slug: true } },
        region: { select: { id: true, code: true, name: true } },
      },
    });
  }

  async updateManualApartment(id: number, dto: UpdateManualApartmentDto, actorUserId?: string, actorRole?: string) {
    const row = await this.requireManualListing(id, actorUserId, actorRole);

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

  async updateManualHouse(id: number, dto: UpdateManualHouseDto, actorUserId?: string, actorRole?: string) {
    const row = await this.requireManualListing(id, actorUserId, actorRole);
    const current = await this.prisma.listing.findUnique({
      where: { id },
      select: { id: true, kind: true },
    });
    if (!current || current.kind !== 'HOUSE') {
      throw new BadRequestException('Операция доступна только для ручных домов (MANUAL + HOUSE)');
    }
    if (dto.house) {
      validateManualGalleryMedia(dto.house, 'Дом');
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

    const housePatch: Prisma.ListingHouseUpdateInput = {};
    if (dto.house) {
      const h = dto.house;
      if (h.houseType !== undefined) housePatch.houseType = h.houseType;
      if (h.areaTotal !== undefined) {
        housePatch.areaTotal = h.areaTotal != null ? new Prisma.Decimal(h.areaTotal) : null;
      }
      if (h.areaLand !== undefined) {
        housePatch.areaLand = h.areaLand != null ? new Prisma.Decimal(h.areaLand) : null;
      }
      if (h.floorsCount !== undefined) housePatch.floorsCount = h.floorsCount;
      if (h.bedrooms !== undefined) housePatch.bedrooms = h.bedrooms;
      if (h.bathrooms !== undefined) housePatch.bathrooms = h.bathrooms;
      if (h.hasGarage !== undefined) housePatch.hasGarage = h.hasGarage;
      if (h.yearBuilt !== undefined) housePatch.yearBuilt = h.yearBuilt;
      if (h.photoUrl !== undefined) housePatch.photoUrl = h.photoUrl;
      if (h.extraPhotoUrls !== undefined) {
        housePatch.extraPhotoUrls =
          h.extraPhotoUrls != null && h.extraPhotoUrls.length > 0
            ? (h.extraPhotoUrls as Prisma.InputJsonValue)
            : Prisma.DbNull;
      }
    }

    const hasListing = Object.keys(listingPatch).length > 0;
    const hasHouse = Object.keys(housePatch).length > 0;
    if (!hasListing && !hasHouse) {
      throw new BadRequestException('Укажите хотя бы одно поле для обновления');
    }

    return this.prisma.listing.update({
      where: { id },
      data: {
        ...listingPatch,
        ...(hasHouse ? { house: { update: housePatch } } : {}),
      },
      include: {
        house: true,
        block: { select: { id: true, name: true, slug: true } },
        region: { select: { id: true, code: true, name: true } },
      },
    });
  }

  async updateManualLand(id: number, dto: UpdateManualLandDto, actorUserId?: string, actorRole?: string) {
    const row = await this.requireManualListing(id, actorUserId, actorRole);
    const current = await this.prisma.listing.findUnique({
      where: { id },
      select: { id: true, kind: true },
    });
    if (!current || current.kind !== 'LAND') {
      throw new BadRequestException('Операция доступна только для ручных участков (MANUAL + LAND)');
    }
    if (dto.land) {
      validateManualGalleryMedia(dto.land, 'Участок');
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

    const landPatch: Prisma.ListingLandUpdateInput = {};
    if (dto.land) {
      const l = dto.land;
      if (l.areaSotki !== undefined) {
        landPatch.areaSotki = l.areaSotki != null ? new Prisma.Decimal(l.areaSotki) : null;
      }
      if (l.landCategory !== undefined) landPatch.landCategory = l.landCategory;
      if (l.cadastralNumber !== undefined) landPatch.cadastralNumber = l.cadastralNumber;
      if (l.hasCommunications !== undefined) landPatch.hasCommunications = l.hasCommunications;
      if (l.photoUrl !== undefined) landPatch.photoUrl = l.photoUrl;
      if (l.extraPhotoUrls !== undefined) {
        landPatch.extraPhotoUrls =
          l.extraPhotoUrls != null && l.extraPhotoUrls.length > 0
            ? (l.extraPhotoUrls as Prisma.InputJsonValue)
            : Prisma.DbNull;
      }
    }

    const hasListing = Object.keys(listingPatch).length > 0;
    const hasLand = Object.keys(landPatch).length > 0;
    if (!hasListing && !hasLand) {
      throw new BadRequestException('Укажите хотя бы одно поле для обновления');
    }

    return this.prisma.listing.update({
      where: { id },
      data: {
        ...listingPatch,
        ...(hasLand ? { land: { update: landPatch } } : {}),
      },
      include: {
        land: true,
        block: { select: { id: true, name: true, slug: true } },
        region: { select: { id: true, code: true, name: true } },
      },
    });
  }

  async updateManualCommercial(id: number, dto: UpdateManualCommercialDto, actorUserId?: string, actorRole?: string) {
    const row = await this.requireManualListing(id, actorUserId, actorRole);
    const current = await this.prisma.listing.findUnique({
      where: { id },
      select: { id: true, kind: true },
    });
    if (!current || current.kind !== 'COMMERCIAL') {
      throw new BadRequestException('Операция доступна только для ручной коммерции (MANUAL + COMMERCIAL)');
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

    const commercialPatch: Prisma.ListingCommercialUpdateInput = {};
    if (dto.commercial) {
      const c = dto.commercial;
      if (c.commercialType !== undefined) commercialPatch.commercialType = c.commercialType;
      if (c.area !== undefined) {
        commercialPatch.area = c.area != null ? new Prisma.Decimal(c.area) : null;
      }
      if (c.floor !== undefined) commercialPatch.floor = c.floor;
      if (c.hasSeparateEntrance !== undefined) {
        commercialPatch.hasSeparateEntrance = c.hasSeparateEntrance;
      }
    }

    const hasListing = Object.keys(listingPatch).length > 0;
    const hasCommercial = Object.keys(commercialPatch).length > 0;
    if (!hasListing && !hasCommercial) {
      throw new BadRequestException('Укажите хотя бы одно поле для обновления');
    }

    return this.prisma.listing.update({
      where: { id },
      data: {
        ...listingPatch,
        ...(hasCommercial ? { commercial: { update: commercialPatch } } : {}),
      },
      include: {
        commercial: true,
        block: { select: { id: true, name: true, slug: true } },
        region: { select: { id: true, code: true, name: true } },
      },
    });
  }

  async updateManualParking(id: number, dto: UpdateManualParkingDto, actorUserId?: string, actorRole?: string) {
    const row = await this.requireManualListing(id, actorUserId, actorRole);
    const current = await this.prisma.listing.findUnique({
      where: { id },
      select: { id: true, kind: true },
    });
    if (!current || current.kind !== 'PARKING') {
      throw new BadRequestException('Операция доступна только для ручного паркинга (MANUAL + PARKING)');
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

    const parkingPatch: Prisma.ListingParkingUpdateInput = {};
    if (dto.parking) {
      const p = dto.parking;
      if (p.parkingType !== undefined) parkingPatch.parkingType = p.parkingType;
      if (p.area !== undefined) {
        parkingPatch.area = p.area != null ? new Prisma.Decimal(p.area) : null;
      }
      if (p.floor !== undefined) parkingPatch.floor = p.floor;
      if (p.number !== undefined) parkingPatch.number = p.number;
    }

    const hasListing = Object.keys(listingPatch).length > 0;
    const hasParking = Object.keys(parkingPatch).length > 0;
    if (!hasListing && !hasParking) {
      throw new BadRequestException('Укажите хотя бы одно поле для обновления');
    }

    return this.prisma.listing.update({
      where: { id },
      data: {
        ...listingPatch,
        ...(hasParking ? { parking: { update: parkingPatch } } : {}),
      },
      include: {
        parking: true,
        block: { select: { id: true, name: true, slug: true } },
        region: { select: { id: true, code: true, name: true } },
      },
    });
  }

  async deleteManualListing(id: number, actorUserId?: string, actorRole?: string) {
    await this.requireManualListing(id, actorUserId, actorRole);
    await this.prisma.listing.delete({ where: { id } });
    return { deleted: true, id };
  }

  async updateAdminListing(
    id: number,
    dto: { status?: 'DRAFT' | 'ACTIVE' | 'SOLD' | 'RESERVED'; isPublished?: boolean },
  ) {
    if (dto.status === undefined && dto.isPublished === undefined) {
      throw new BadRequestException('Укажите хотя бы одно поле: status или isPublished');
    }
    const exists = await this.prisma.listing.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!exists) throw new NotFoundException('Объявление не найдено');

    return this.prisma.listing.update({
      where: { id },
      data: {
        ...(dto.status !== undefined ? { status: dto.status } : {}),
        ...(dto.isPublished !== undefined ? { isPublished: dto.isPublished } : {}),
      },
      include: {
        apartment: { include: { roomType: true, finishing: true } },
        house: true,
        land: true,
        commercial: true,
        parking: true,
        block: { select: { id: true, name: true, slug: true } },
        region: { select: { id: true, code: true, name: true } },
      },
    });
  }

  private agentExternalIdPrefix(userId: string) {
    return `manual-${userId}-`;
  }

  private assertAgentCanManage(rowExternalId: string | null, actorUserId?: string, actorRole?: string) {
    if (actorRole !== 'agent') return;
    if (!actorUserId) throw new BadRequestException('Требуется пользователь агента');
    const pref = this.agentExternalIdPrefix(actorUserId);
    if (!rowExternalId?.startsWith(pref)) {
      throw new BadRequestException('Агент может изменять только свои ручные объявления');
    }
  }

  private async requireManualListing(id: number, actorUserId?: string, actorRole?: string) {
    const row = await this.prisma.listing.findUnique({
      where: { id },
      select: { id: true, dataSource: true, regionId: true, externalId: true },
    });
    if (!row) throw new NotFoundException('Объявление не найдено');
    if (row.dataSource !== 'MANUAL') {
      throw new BadRequestException('Доступно только для ручных объявлений (MANUAL)');
    }
    this.assertAgentCanManage(row.externalId, actorUserId, actorRole);
    return row;
  }
}
