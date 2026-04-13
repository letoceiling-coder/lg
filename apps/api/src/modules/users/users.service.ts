import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { Prisma, UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { verifyTelegramLoginWidget } from '../../auth/telegram-login.util';
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

type TelegramLinkPayload = {
  uid: string;
  exp: number;
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

function signTelegramLink(data: string, secret: string): string {
  return createHmac('sha256', secret).update(data).digest('base64url');
}

function createTelegramLinkToken(userId: string, secret: string): string {
  const payload: TelegramLinkPayload = {
    uid: userId,
    exp: Math.floor(Date.now() / 1000) + 60 * 30,
  };
  const body = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
  const sig = signTelegramLink(body, secret);
  return `${body}.${sig}`;
}

function verifyTelegramLinkToken(token: string, secret: string): TelegramLinkPayload | null {
  const [body, sig] = token.split('.');
  if (!body || !sig) return null;
  const expected = signTelegramLink(body, secret);
  const sigBuf = Buffer.from(sig);
  const expBuf = Buffer.from(expected);
  if (sigBuf.length !== expBuf.length || !timingSafeEqual(sigBuf, expBuf)) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as TelegramLinkPayload;
    if (!payload?.uid || typeof payload.uid !== 'string') return null;
    if (!payload?.exp || typeof payload.exp !== 'number') return null;
    if (payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  private telegramLinkSecret(): string {
    return process.env.JWT_ACCESS_SECRET || 'livegrid-telegram-link';
  }

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

  async createTelegramLink(id: string) {
    await this.findOne(id);
    const [loginUsername, legacyUsername] = await Promise.all([
      this.prisma.siteSetting.findUnique({
        where: { key: 'telegram_login_bot_username' },
        select: { value: true },
      }),
      this.prisma.siteSetting.findUnique({
        where: { key: 'telegram_bot_username' },
        select: { value: true },
      }),
    ]);
    const botUsername = String(loginUsername?.value ?? legacyUsername?.value ?? '')
      .trim()
      .replace(/^@+/, '');
    if (!botUsername) {
      throw new BadRequestException('Telegram bot username is not configured');
    }
    const token = createTelegramLinkToken(id, this.telegramLinkSecret());
    return {
      botUsername,
      url: `https://t.me/${botUsername}?start=tg_link_${token}`,
    };
  }

  async unlinkTelegram(id: string) {
    await this.findOne(id);
    const updated = await this.prisma.user.update({
      where: { id },
      data: { telegramId: null, telegramUsername: null },
      select: USER_LIST_SELECT,
    });
    return this.toAdminUserView(updated);
  }

  async linkTelegramByToken(
    token: string,
    telegram: { id: bigint; username?: string | null },
  ): Promise<{ ok: true; userId: string; fullName: string | null } | { ok: false }> {
    const payload = verifyTelegramLinkToken(token, this.telegramLinkSecret());
    if (!payload) return { ok: false };
    const user = await this.prisma.user.findUnique({
      where: { id: payload.uid },
      select: { id: true, fullName: true },
    });
    if (!user) return { ok: false };
    try {
      await this.prisma.user.update({
        where: { id: user.id },
        data: {
          telegramId: telegram.id,
          telegramUsername: telegram.username?.trim() || null,
        },
      });
      return { ok: true, userId: user.id, fullName: user.fullName };
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        throw new ConflictException('Этот Telegram уже привязан к другому пользователю');
      }
      throw e;
    }
  }

  async bindTelegramFromWidget(id: string, body: Record<string, unknown>) {
    const { tgId, username } = await this.parseAndVerifyTelegramWidget(body);
    await this.findOne(id);
    const existing = await this.prisma.user.findUnique({
      where: { telegramId: tgId },
      select: { id: true },
    });
    if (existing && existing.id !== id) {
      throw new ConflictException('Этот Telegram уже привязан к другому пользователю');
    }
    const updated = await this.prisma.user.update({
      where: { id },
      data: { telegramId: tgId, telegramUsername: username },
      select: USER_LIST_SELECT,
    });
    return this.toAdminUserView(updated);
  }

  private async parseAndVerifyTelegramWidget(body: Record<string, unknown>): Promise<{
    tgId: bigint;
    username: string | null;
  }> {
    const strMap: Record<string, string> = {};
    for (const [k, v] of Object.entries(body)) {
      if (v === undefined || v === null) continue;
      strMap[k] = typeof v === 'string' ? v : String(v);
    }
    if (!strMap.id || !strMap.auth_date || !strMap.hash) {
      throw new BadRequestException('Нужны поля id, auth_date и hash');
    }

    const botToken = await this.getSiteSettingValue('telegram_bot_token');
    if (!botToken) {
      throw new ServiceUnavailableException('Токен Telegram бота не настроен');
    }
    if (!verifyTelegramLoginWidget(strMap, botToken)) {
      throw new UnauthorizedException('Неверная подпись Telegram');
    }

    const authTs = parseInt(strMap.auth_date, 10);
    if (!Number.isFinite(authTs) || Math.abs(Date.now() / 1000 - authTs) > 86400) {
      throw new UnauthorizedException('Устаревшие данные авторизации');
    }

    let tgId: bigint;
    try {
      tgId = BigInt(strMap.id);
    } catch {
      throw new BadRequestException('Некорректный id');
    }
    return { tgId, username: strMap.username?.trim() || null };
  }

  private async getSiteSettingValue(key: string): Promise<string | null> {
    const row = await this.prisma.siteSetting.findUnique({
      where: { key },
      select: { value: true },
    });
    const v = row?.value?.trim();
    return v && v.length > 0 ? v : null;
  }
}
