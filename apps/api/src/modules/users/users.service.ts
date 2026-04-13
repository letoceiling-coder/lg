import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateUserDto, UpdateUserDto } from './dto/create-user.dto';

const USER_LIST_SELECT = {
  id: true,
  email: true,
  phone: true,
  fullName: true,
  role: true,
  telegramId: true,
  telegramUsername: true,
  isActive: true,
  createdAt: true,
} satisfies Prisma.UserSelect;

type UserListRow = Prisma.UserGetPayload<{ select: typeof USER_LIST_SELECT }>;
type AdminUserView = Omit<UserListRow, 'telegramId'> & {
  telegramId: string | null;
  telegramLinked: boolean;
};

const USER_ROLES: UserRole[] = [
  'admin',
  'editor',
  'manager',
  'agent',
  'client',
];

function parseUserRole(role?: string): UserRole | undefined {
  if (role === undefined || role === '') return undefined;
  if (USER_ROLES.includes(role as UserRole)) return role as UserRole;
  return undefined;
}

function parseTelegramId(raw: string): bigint {
  const value = raw.trim();
  if (!/^-?\d+$/.test(value)) {
    throw new BadRequestException('Invalid telegram id');
  }
  try {
    return BigInt(value);
  } catch {
    throw new BadRequestException('Invalid telegram id');
  }
}

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  private toAdminUserView(user: UserListRow): AdminUserView {
    const { telegramId, ...rest } = user;
    return {
      ...rest,
      telegramId: telegramId === null ? null : telegramId.toString(),
      telegramLinked: telegramId !== null,
    };
  }

  async findAll(
    role?: string,
    search?: string,
    page = 1,
    perPage = 20,
  ): Promise<{
    items: AdminUserView[];
    total: number;
    page: number;
    perPage: number;
  }> {
    const safePage = Math.max(1, page);
    const safePerPage = Math.min(100, Math.max(1, perPage));
    const skip = (safePage - 1) * safePerPage;

    const where: Prisma.UserWhereInput = {};
    const parsedRole = parseUserRole(role);
    if (parsedRole) where.role = parsedRole;

    const term = search?.trim();
    if (term) {
      where.OR = [
        { email: { contains: term, mode: 'insensitive' } },
        { fullName: { contains: term, mode: 'insensitive' } },
        { phone: { contains: term, mode: 'insensitive' } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        select: USER_LIST_SELECT,
        orderBy: { createdAt: 'desc' },
        skip,
        take: safePerPage,
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      items: items.map((item) => this.toAdminUserView(item)),
      total,
      page: safePage,
      perPage: safePerPage,
    };
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: USER_LIST_SELECT,
    });
    if (!user) throw new NotFoundException('User not found');
    return this.toAdminUserView(user);
  }

  async create(dto: CreateUserDto) {
    const passwordHash = await bcrypt.hash(dto.password, 10);
    let role: UserRole = 'client';
    if (dto.role !== undefined && dto.role !== '') {
      const parsed = parseUserRole(dto.role);
      if (!parsed) throw new BadRequestException('Invalid role');
      role = parsed;
    }
    const telegramUsername = dto.telegramUsername?.trim() || null;
    const telegramId = dto.telegramId?.trim() ? parseTelegramId(dto.telegramId) : null;

    try {
      const created = await this.prisma.user.create({
        data: {
          email: dto.email,
          phone: dto.phone,
          fullName: dto.fullName,
          role,
          telegramUsername,
          telegramId,
          isActive: dto.isActive ?? true,
          passwordHash,
        },
        select: USER_LIST_SELECT,
      });
      return this.toAdminUserView(created);
    } catch (e) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === 'P2002'
      ) {
        throw new ConflictException('Email, phone or Telegram already exists');
      }
      throw e;
    }
  }

  async update(id: string, dto: UpdateUserDto) {
    await this.findOne(id);

    const data: Prisma.UserUpdateInput = {};
    if (dto.email !== undefined) data.email = dto.email;
    if (dto.phone !== undefined) data.phone = dto.phone;
    if (dto.fullName !== undefined) data.fullName = dto.fullName;
    if (dto.isActive !== undefined) data.isActive = dto.isActive;
    if (dto.telegramUsername !== undefined) {
      data.telegramUsername = dto.telegramUsername.trim() || null;
    }
    if (dto.telegramId !== undefined) {
      const v = dto.telegramId.trim();
      data.telegramId = v === '' ? null : parseTelegramId(v);
    }
    if (dto.role !== undefined) {
      if (dto.role === '') {
        throw new BadRequestException('Invalid role');
      }
      const parsed = parseUserRole(dto.role);
      if (!parsed) throw new BadRequestException('Invalid role');
      data.role = parsed;
    }

    try {
      const updated = await this.prisma.user.update({
        where: { id },
        data,
        select: USER_LIST_SELECT,
      });
      return this.toAdminUserView(updated);
    } catch (e) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === 'P2002'
      ) {
        throw new ConflictException('Email, phone or Telegram already exists');
      }
      throw e;
    }
  }

  async resetPassword(id: string, newPassword: string) {
    await this.findOne(id);
    const passwordHash = await bcrypt.hash(newPassword, 10);
    await this.prisma.user.update({
      where: { id },
      data: { passwordHash },
    });
    return { success: true };
  }
}
