import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DataSource, Prisma } from '@prisma/client';
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

  async findAllAdmin(regionId?: number, blockId?: number, search?: string) {
    return this.prisma.building.findMany({
      where: {
        ...(regionId ? { regionId } : {}),
        ...(blockId ? { blockId } : {}),
        ...(search?.trim()
          ? { name: { contains: search.trim(), mode: 'insensitive' } }
          : {}),
      },
      include: {
        block: { select: { id: true, name: true, regionId: true } },
        region: { select: { id: true, code: true, name: true } },
        buildingType: { select: { id: true, name: true } },
        addresses: true,
      },
      orderBy: [{ id: 'desc' }],
      take: 500,
    });
  }

  async getAdminOptions(regionId?: number, blockSearch?: string) {
    const [regions, buildingTypes, blocks] = await Promise.all([
      this.prisma.feedRegion.findMany({
        orderBy: { name: 'asc' },
        select: { id: true, code: true, name: true },
      }),
      this.prisma.buildingType.findMany({
        orderBy: { name: 'asc' },
        select: { id: true, name: true },
      }),
      this.prisma.block.findMany({
        where: {
          ...(regionId ? { regionId } : {}),
          ...(blockSearch?.trim()
            ? { name: { contains: blockSearch.trim(), mode: 'insensitive' } }
            : {}),
        },
        orderBy: { name: 'asc' },
        select: { id: true, name: true, regionId: true },
        take: 200,
      }),
    ]);
    return { regions, buildingTypes, blocks };
  }

  private parseDateOrNull(value?: string | null): Date | null | undefined {
    if (value === undefined) return undefined;
    if (value === null || value === '') return null;
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      throw new BadRequestException('Неверный формат даты, ожидается YYYY-MM-DD');
    }
    return parsed;
  }

  private normalizeAddressPart(value?: string | null): string | null | undefined {
    if (value === undefined) return undefined;
    const n = value?.trim() ?? '';
    return n === '' ? null : n;
  }

  private normalizeDecimal(value?: number | null): Prisma.Decimal | null | undefined {
    if (value === undefined) return undefined;
    if (value === null) return null;
    return new Prisma.Decimal(value);
  }

  private async ensureRegionAndBlock(regionId: number, blockId: number) {
    const [region, block] = await Promise.all([
      this.prisma.feedRegion.findUnique({ where: { id: regionId } }),
      this.prisma.block.findUnique({ where: { id: blockId }, select: { id: true, regionId: true } }),
    ]);
    if (!region) throw new NotFoundException('Регион не найден');
    if (!block) throw new NotFoundException('ЖК не найден');
    if (block.regionId !== regionId) {
      throw new BadRequestException('ЖК не принадлежит выбранному региону');
    }
  }

  async createAdmin(dto: {
    regionId: number;
    blockId: number;
    buildingTypeId?: number | null;
    name?: string | null;
    queue?: string | null;
    deadline?: string | null;
    deadlineKey?: string | null;
    subsidy?: boolean;
    latitude?: number | null;
    longitude?: number | null;
    street?: string | null;
    house?: string | null;
    housing?: string | null;
  }) {
    await this.ensureRegionAndBlock(dto.regionId, dto.blockId);
    if (dto.buildingTypeId != null) {
      const bt = await this.prisma.buildingType.findUnique({ where: { id: dto.buildingTypeId } });
      if (!bt) throw new NotFoundException('Тип корпуса не найден');
    }

    const street = this.normalizeAddressPart(dto.street);
    const house = this.normalizeAddressPart(dto.house);
    const housing = this.normalizeAddressPart(dto.housing);
    const hasAddress = !!(street || house || housing);

    return this.prisma.$transaction(async (tx) => {
      const created = await tx.building.create({
        data: {
          regionId: dto.regionId,
          blockId: dto.blockId,
          buildingTypeId: dto.buildingTypeId ?? null,
          name: dto.name?.trim() || null,
          queue: dto.queue?.trim() || null,
          deadline: this.parseDateOrNull(dto.deadline),
          deadlineKey: this.parseDateOrNull(dto.deadlineKey),
          subsidy: dto.subsidy ?? false,
          latitude: this.normalizeDecimal(dto.latitude),
          longitude: this.normalizeDecimal(dto.longitude),
          dataSource: DataSource.MANUAL,
        },
      });

      if (hasAddress) {
        await tx.buildingAddress.create({
          data: {
            buildingId: created.id,
            street: street ?? null,
            house: house ?? null,
            housing: housing ?? null,
          },
        });
      }

      return tx.building.findUniqueOrThrow({
        where: { id: created.id },
        include: {
          block: { select: { id: true, name: true, regionId: true } },
          region: { select: { id: true, code: true, name: true } },
          buildingType: { select: { id: true, name: true } },
          addresses: true,
        },
      });
    });
  }

  async updateAdmin(
    id: number,
    dto: {
      regionId?: number;
      blockId?: number;
      buildingTypeId?: number | null;
      name?: string | null;
      queue?: string | null;
      deadline?: string | null;
      deadlineKey?: string | null;
      subsidy?: boolean;
      latitude?: number | null;
      longitude?: number | null;
      street?: string | null;
      house?: string | null;
      housing?: string | null;
    },
  ) {
    const current = await this.prisma.building.findUnique({
      where: { id },
      include: { addresses: { orderBy: { id: 'asc' }, take: 1 } },
    });
    if (!current) throw new NotFoundException('Корпус не найден');
    if (current.dataSource !== DataSource.MANUAL) {
      throw new ConflictException('Разрешено редактировать только ручные корпуса');
    }

    const nextRegionId = dto.regionId ?? current.regionId;
    const nextBlockId = dto.blockId ?? current.blockId;
    if (dto.regionId !== undefined || dto.blockId !== undefined) {
      await this.ensureRegionAndBlock(nextRegionId, nextBlockId);
    }
    if (dto.buildingTypeId != null) {
      const bt = await this.prisma.buildingType.findUnique({ where: { id: dto.buildingTypeId } });
      if (!bt) throw new NotFoundException('Тип корпуса не найден');
    }

    const street = this.normalizeAddressPart(dto.street);
    const house = this.normalizeAddressPart(dto.house);
    const housing = this.normalizeAddressPart(dto.housing);
    const addressTouched =
      dto.street !== undefined || dto.house !== undefined || dto.housing !== undefined;

    return this.prisma.$transaction(async (tx) => {
      await tx.building.update({
        where: { id },
        data: {
          ...(dto.regionId !== undefined ? { regionId: dto.regionId } : {}),
          ...(dto.blockId !== undefined ? { blockId: dto.blockId } : {}),
          ...(dto.buildingTypeId !== undefined ? { buildingTypeId: dto.buildingTypeId } : {}),
          ...(dto.name !== undefined ? { name: dto.name?.trim() || null } : {}),
          ...(dto.queue !== undefined ? { queue: dto.queue?.trim() || null } : {}),
          ...(dto.deadline !== undefined ? { deadline: this.parseDateOrNull(dto.deadline) } : {}),
          ...(dto.deadlineKey !== undefined
            ? { deadlineKey: this.parseDateOrNull(dto.deadlineKey) }
            : {}),
          ...(dto.subsidy !== undefined ? { subsidy: dto.subsidy } : {}),
          ...(dto.latitude !== undefined ? { latitude: this.normalizeDecimal(dto.latitude) } : {}),
          ...(dto.longitude !== undefined ? { longitude: this.normalizeDecimal(dto.longitude) } : {}),
        },
      });

      if (addressTouched) {
        const firstAddress = current.addresses[0];
        const hasAddress = !!(street || house || housing);
        if (firstAddress) {
          if (hasAddress) {
            await tx.buildingAddress.update({
              where: { id: firstAddress.id },
              data: { street: street ?? null, house: house ?? null, housing: housing ?? null },
            });
          } else {
            await tx.buildingAddress.delete({ where: { id: firstAddress.id } });
          }
        } else if (hasAddress) {
          await tx.buildingAddress.create({
            data: { buildingId: id, street: street ?? null, house: house ?? null, housing: housing ?? null },
          });
        }
      }

      return tx.building.findUniqueOrThrow({
        where: { id },
        include: {
          block: { select: { id: true, name: true, regionId: true } },
          region: { select: { id: true, code: true, name: true } },
          buildingType: { select: { id: true, name: true } },
          addresses: true,
        },
      });
    });
  }

  async deleteAdmin(id: number) {
    const current = await this.prisma.building.findUnique({ where: { id } });
    if (!current) throw new NotFoundException('Корпус не найден');
    if (current.dataSource !== DataSource.MANUAL) {
      throw new ConflictException('Разрешено удалять только ручные корпуса');
    }
    const listings = await this.prisma.listing.count({ where: { buildingId: id } });
    if (listings > 0) {
      throw new ConflictException('Нельзя удалить: есть связанные объявления');
    }
    await this.prisma.building.delete({ where: { id } });
  }
}
