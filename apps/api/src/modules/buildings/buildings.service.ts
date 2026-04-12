import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class BuildingsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(blockId?: number) {
    return this.prisma.building.findMany({
      where: blockId !== undefined ? { blockId } : {},
      include: {
        buildingType: true,
        addresses: true,
        block: { select: { id: true, name: true } },
      },
      orderBy: { id: 'asc' },
    });
  }

  async findOne(id: number) {
    const building = await this.prisma.building.findUnique({
      where: { id },
      include: {
        block: true,
        buildingType: true,
        addresses: true,
        region: true,
      },
    });
    if (!building) throw new NotFoundException('Building not found');
    return building;
  }
}
