import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ReferenceService {
  constructor(private readonly prisma: PrismaService) {}

  async getRoomTypes() {
    return this.prisma.roomType.findMany({ orderBy: { id: 'asc' } });
  }

  async getFinishings() {
    return this.prisma.finishing.findMany({ orderBy: { id: 'asc' } });
  }

  async getBuildingTypes() {
    return this.prisma.buildingType.findMany({ orderBy: { id: 'asc' } });
  }
}
