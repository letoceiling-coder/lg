import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { UpsertSellerDto } from './dto/seller.dto';

type ActorContext = { userId: string; role: string };

const SELLER_SELECT = {
  id: true,
  fullName: true,
  phone: true,
  phoneAlt: true,
  email: true,
  address: true,
  notes: true,
  createdById: true,
  updatedById: true,
  createdAt: true,
  updatedAt: true,
  createdBy: { select: { id: true, fullName: true, email: true, role: true } },
  listings: {
    select: { id: true, kind: true, price: true, status: true, dataSource: true, externalId: true },
    orderBy: { updatedAt: 'desc' },
    take: 20,
  },
} satisfies Prisma.SellerSelect;

@Injectable()
export class SellersService {
  constructor(private readonly prisma: PrismaService) {}

  private canManageAll(actor: ActorContext): boolean {
    return actor.role === 'admin' || actor.role === 'editor' || actor.role === 'manager';
  }

  private clean(dto: UpsertSellerDto) {
    const data = {
      fullName: dto.fullName?.trim() || null,
      phone: dto.phone?.trim() || null,
      phoneAlt: dto.phoneAlt?.trim() || null,
      email: dto.email?.trim() || null,
      address: dto.address?.trim() || null,
      notes: dto.notes?.trim() || null,
    };
    if (!Object.values(data).some((v) => v !== null)) {
      throw new BadRequestException('Укажите хотя бы ФИО, телефон или другую информацию о продавце');
    }
    return data;
  }

  private async assertAccess(id: number, actor: ActorContext) {
    if (this.canManageAll(actor)) return;
    const seller = await this.prisma.seller.findUnique({
      where: { id },
      select: { id: true, createdById: true },
    });
    if (!seller) throw new NotFoundException('Продавец не найден');
    if (seller.createdById !== actor.userId) {
      throw new ForbiddenException('Нет доступа к продавцу');
    }
  }

  async findAll(actor: ActorContext, search?: string, page = 1, perPage = 30) {
    const safePage = Math.max(1, page);
    const safePerPage = Math.min(100, Math.max(1, perPage));
    const where: Prisma.SellerWhereInput = {};
    if (!this.canManageAll(actor)) where.createdById = actor.userId;

    const term = search?.trim();
    if (term) {
      where.OR = [
        { fullName: { contains: term, mode: 'insensitive' } },
        { phone: { contains: term, mode: 'insensitive' } },
        { phoneAlt: { contains: term, mode: 'insensitive' } },
        { email: { contains: term, mode: 'insensitive' } },
        { address: { contains: term, mode: 'insensitive' } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.seller.findMany({
        where,
        select: {
          ...SELLER_SELECT,
          _count: { select: { listings: true } },
        },
        orderBy: { updatedAt: 'desc' },
        skip: (safePage - 1) * safePerPage,
        take: safePerPage,
      }),
      this.prisma.seller.count({ where }),
    ]);

    return {
      items,
      meta: { page: safePage, perPage: safePerPage, total, totalPages: Math.ceil(total / safePerPage) },
    };
  }

  async findOne(id: number, actor: ActorContext) {
    await this.assertAccess(id, actor);
    const seller = await this.prisma.seller.findUnique({
      where: { id },
      select: SELLER_SELECT,
    });
    if (!seller) throw new NotFoundException('Продавец не найден');
    return seller;
  }

  async create(dto: UpsertSellerDto, actor: ActorContext) {
    const data = this.clean(dto);
    return this.prisma.seller.create({
      data: {
        ...data,
        createdBy: { connect: { id: actor.userId } },
        updatedBy: { connect: { id: actor.userId } },
      },
      select: SELLER_SELECT,
    });
  }

  async update(id: number, dto: UpsertSellerDto, actor: ActorContext) {
    await this.assertAccess(id, actor);
    const data = this.clean(dto);
    return this.prisma.seller.update({
      where: { id },
      data: {
        ...data,
        updatedBy: { connect: { id: actor.userId } },
      },
      select: SELLER_SELECT,
    });
  }
}
