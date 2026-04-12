import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class BuildersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(regionId?: number) {
    return this.prisma.builder.findMany({
      where: regionId ? { regionId } : undefined,
      orderBy: { name: 'asc' },
      select: { id: true, name: true, regionId: true, externalId: true, crmId: true, dataSource: true },
    });
  }

  async findOne(id: number) {
    return this.prisma.builder.findUniqueOrThrow({ where: { id } });
  }
}
