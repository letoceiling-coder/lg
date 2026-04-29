import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class DistrictsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(regionId?: number, kind?: string) {
    // When kind is specified, return only districts that have active listings of that type
    if (kind && regionId) {
      const rows = await this.prisma.listing.findMany({
        where: {
          regionId,
          kind: kind as any,
          districtId: { not: null },
          status: { in: ['ACTIVE', 'RESERVED'] },
          isPublished: true,
        },
        select: { districtId: true },
        distinct: ['districtId'],
      });
      const ids = rows.map(r => r.districtId).filter(Boolean) as number[];
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
