import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class SubwaysService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(regionId?: number) {
    return this.prisma.subway.findMany({
      where: regionId ? { regionId } : undefined,
      orderBy: { name: 'asc' },
      select: { id: true, name: true, regionId: true, externalId: true, crmId: true },
    });
  }
}
