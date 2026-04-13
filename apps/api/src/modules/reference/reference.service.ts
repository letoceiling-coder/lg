import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { PrismaService } from '../../prisma/prisma.service';

type RefKind = 'room-types' | 'finishings' | 'building-types';

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

  async getByKind(kind: RefKind) {
    if (kind === 'room-types') return this.getRoomTypes();
    if (kind === 'finishings') return this.getFinishings();
    if (kind === 'building-types') return this.getBuildingTypes();
    throw new BadRequestException('Unknown reference kind');
  }

  async findOneByKind(kind: RefKind, id: number) {
    if (kind === 'room-types') {
      const row = await this.prisma.roomType.findUnique({ where: { id } });
      if (!row) throw new NotFoundException('Элемент не найден');
      return row;
    }
    if (kind === 'finishings') {
      const row = await this.prisma.finishing.findUnique({ where: { id } });
      if (!row) throw new NotFoundException('Элемент не найден');
      return row;
    }
    if (kind === 'building-types') {
      const row = await this.prisma.buildingType.findUnique({ where: { id } });
      if (!row) throw new NotFoundException('Элемент не найден');
      return row;
    }
    throw new BadRequestException('Unknown reference kind');
  }

  private normalizeNullableText(value?: string | null): string | null | undefined {
    if (value === undefined) return undefined;
    const trimmed = value?.trim() ?? '';
    return trimmed === '' ? null : trimmed;
  }

  private parseCrmId(value?: string | null): bigint | null | undefined {
    if (value === undefined) return undefined;
    const trimmed = value?.trim() ?? '';
    if (!trimmed) return null;
    try {
      return BigInt(trimmed);
    } catch {
      throw new BadRequestException('crmId должен быть целым числом');
    }
  }

  async createByKind(
    kind: RefKind,
    dto: { name: string; externalId?: string | null; crmId?: string | null; nameOne?: string | null },
  ) {
    const name = dto.name.trim();
    if (!name) throw new BadRequestException('name не может быть пустым');
    const externalId = this.normalizeNullableText(dto.externalId);
    const crmId = this.parseCrmId(dto.crmId);
    const nameOne = this.normalizeNullableText(dto.nameOne);

    if (kind === 'room-types') {
      return this.prisma.roomType.create({
        data: { name, externalId: externalId ?? null, crmId: crmId ?? null, nameOne: nameOne ?? null },
      });
    }
    if (kind === 'finishings') {
      return this.prisma.finishing.create({
        data: { name, externalId: externalId ?? null, crmId: crmId ?? null },
      });
    }
    if (kind === 'building-types') {
      return this.prisma.buildingType.create({
        data: { name, externalId: externalId ?? null, crmId: crmId ?? null },
      });
    }
    throw new BadRequestException('Unknown reference kind');
  }

  async updateByKind(
    kind: RefKind,
    id: number,
    dto: { name: string; externalId?: string | null; crmId?: string | null; nameOne?: string | null },
  ) {
    const name = dto.name.trim();
    if (!name) throw new BadRequestException('name не может быть пустым');
    const externalId = this.normalizeNullableText(dto.externalId);
    const crmId = this.parseCrmId(dto.crmId);
    const nameOne = this.normalizeNullableText(dto.nameOne);

    if (kind === 'room-types') {
      return this.prisma.roomType.update({
        where: { id },
        data: { name, externalId: externalId ?? null, crmId: crmId ?? null, nameOne: nameOne ?? null },
      });
    }
    if (kind === 'finishings') {
      return this.prisma.finishing.update({
        where: { id },
        data: { name, externalId: externalId ?? null, crmId: crmId ?? null },
      });
    }
    if (kind === 'building-types') {
      return this.prisma.buildingType.update({
        where: { id },
        data: { name, externalId: externalId ?? null, crmId: crmId ?? null },
      });
    }
    throw new BadRequestException('Unknown reference kind');
  }

  async deleteByKind(kind: RefKind, id: number) {
    try {
      if (kind === 'room-types') {
        await this.prisma.roomType.delete({ where: { id } });
        return;
      }
      if (kind === 'finishings') {
        await this.prisma.finishing.delete({ where: { id } });
        return;
      }
      if (kind === 'building-types') {
        await this.prisma.buildingType.delete({ where: { id } });
        return;
      }
      throw new BadRequestException('Unknown reference kind');
    } catch (e) {
      if (
        e instanceof PrismaClientKnownRequestError &&
        (e.code === 'P2003' || e.code === 'P2014')
      ) {
        throw new ConflictException('Нельзя удалить: есть связанные объекты');
      }
      throw e;
    }
  }
}
