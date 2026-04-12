import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
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

  async createAdmin(dto: {
    code: string;
    name: string;
    baseUrl?: string | null;
    isEnabled?: boolean;
  }) {
    const code = dto.code.trim().toLowerCase();
    const dup = await this.prisma.feedRegion.findUnique({ where: { code } });
    if (dup) {
      throw new ConflictException(`Регион с кодом «${code}» уже существует`);
    }
    return this.prisma.feedRegion.create({
      data: {
        code,
        name: dto.name.trim(),
        baseUrl:
          dto.baseUrl != null && String(dto.baseUrl).trim() !== ''
            ? String(dto.baseUrl).trim()
            : null,
        isEnabled: dto.isEnabled ?? false,
      },
    });
  }

  async deleteAdmin(id: number) {
    const row = await this.prisma.feedRegion.findUnique({ where: { id } });
    if (!row) throw new NotFoundException('Регион не найден');

    const [districts, subways, builders, blocks, buildings, listings, batches] =
      await Promise.all([
        this.prisma.district.count({ where: { regionId: id } }),
        this.prisma.subway.count({ where: { regionId: id } }),
        this.prisma.builder.count({ where: { regionId: id } }),
        this.prisma.block.count({ where: { regionId: id } }),
        this.prisma.building.count({ where: { regionId: id } }),
        this.prisma.listing.count({ where: { regionId: id } }),
        this.prisma.importBatch.count({ where: { regionId: id } }),
      ]);
    const linked = districts + subways + builders + blocks + buildings + listings + batches;
    if (linked > 0) {
      throw new ConflictException(
        'Нельзя удалить регион: есть связанные районы, метро, застройщики, ЖК, объявления или история импорта.',
      );
    }
    await this.prisma.feedRegion.delete({ where: { id } });
  }
}
