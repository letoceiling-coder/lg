import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class RegionsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    const rows = await this.prisma.feedRegion.findMany({
      where: { isEnabled: true },
      orderBy: { name: 'asc' },
      select: {
        id: true,
        code: true,
        name: true,
        lastImportedAt: true,
      },
    });
    // В БД/фиде коды в нижнем регистре (msk); публичный API отдаёт канонический верхний регистр,
    // чтобы витрина и счётчики стабильно выбирали Москву (MSK), как у TrendAgent.
    return rows.map((r) => ({
      ...r,
      code: (r.code ?? '').toUpperCase(),
    }));
  }

  async findAllAdmin() {
    return this.prisma.feedRegion.findMany({
      orderBy: { id: 'asc' },
    });
  }

  async updateAdmin(
    id: number,
    data: { name?: string; baseUrl?: string | null; isEnabled?: boolean },
  ) {
    return this.prisma.feedRegion.update({
      where: { id },
      data: {
        ...(data.name !== undefined ? { name: data.name } : {}),
        ...(data.baseUrl !== undefined ? { baseUrl: data.baseUrl || null } : {}),
        ...(data.isEnabled !== undefined ? { isEnabled: data.isEnabled } : {}),
      },
    });
  }
}
