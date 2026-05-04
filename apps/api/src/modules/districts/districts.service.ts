import { Injectable } from '@nestjs/common';
import type { ListingStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

const ACTIVE_OR_RESERVED: ListingStatus[] = ['ACTIVE', 'RESERVED'];

@Injectable()
export class DistrictsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(regionId?: number, kind?: string) {
    const k = (kind ?? '').toUpperCase();

    /** Дома/дачи: район в listing_houses.district_name; district_id у listing часто пустой. */
    if (k === 'HOUSE' && regionId) {
      const listingBase = {
        regionId,
        kind: 'HOUSE' as const,
        status: { in: ACTIVE_OR_RESERVED },
        isPublished: true,
      };

      const houseNames = await this.prisma.listingHouse.findMany({
        where: {
          districtName: { not: null },
          NOT: { districtName: '' },
          listing: listingBase,
        },
        select: { districtName: true },
        distinct: ['districtName'],
      });

      const fromRelationIds = await this.prisma.listing.findMany({
        where: {
          ...listingBase,
          districtId: { not: null },
        },
        select: { districtId: true },
        distinct: ['districtId'],
      });
      const ids = fromRelationIds.map((r) => r.districtId).filter(Boolean) as number[];
      const fromDistrictRows =
        ids.length > 0
          ? await this.prisma.district.findMany({
              where: { id: { in: ids } },
              select: { name: true },
            })
          : [];

      const nameSet = new Set<string>();
      for (const r of houseNames) {
        const n = r.districtName?.trim();
        if (n) nameSet.add(n);
      }
      for (const r of fromDistrictRows) {
        if (r.name?.trim()) nameSet.add(r.name.trim());
      }

      const names = [...nameSet].sort((a, b) => a.localeCompare(b, 'ru'));
      return names.map((name) => ({
        id: 0,
        name,
        regionId,
        externalId: null as string | null,
        crmId: null as bigint | null,
      }));
    }

    // Квартиры и прочее: районы через справочник district_id
    if (kind && regionId) {
      const rows = await this.prisma.listing.findMany({
        where: {
          regionId,
          kind: kind as any,
          districtId: { not: null },
          status: { in: ACTIVE_OR_RESERVED },
          isPublished: true,
        },
        select: { districtId: true },
        distinct: ['districtId'],
      });
      const ids = rows.map((r) => r.districtId).filter(Boolean) as number[];
      if (!ids.length) return [];
      return this.prisma.district.findMany({
        where: { id: { in: ids } },
        orderBy: { name: 'asc' },
        select: { id: true, name: true, regionId: true, externalId: true, crmId: true },
      });
    }
    return this.prisma.district.findMany({
      where: regionId ? { regionId } : undefined,
      orderBy: { name: 'asc' },
      select: { id: true, name: true, regionId: true, externalId: true, crmId: true },
    });
  }
}
