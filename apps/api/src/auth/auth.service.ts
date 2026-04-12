import {
  BadRequestException,
  ConflictException,
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService, type JwtSignOptions } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { LinkEmailDto, LoginDto, RegisterDto, TokensDto } from './dto';
import { verifyTelegramLoginWidget } from './telegram-login.util';
import { normalizeLoginPhone, phoneLookupVariants } from './phone-normalize.util';

interface JwtPayload {
  sub: string;
  email: string;
  role: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
  ) {}

  async login(dto: LoginDto): Promise<TokensDto> {
    const email = dto.email?.trim();
    const phoneRaw = dto.phone?.trim();
    if (!email && !phoneRaw) {
      throw new BadRequestException('Укажите email или телефон');
    }
    if (email && phoneRaw) {
      throw new BadRequestException('Укажите только email или только телефон');
    }

    let user =
      email != null && email.length > 0
        ? await this.prisma.user.findUnique({ where: { email } })
        : null;

    if (!user && phoneRaw) {
      const variants = phoneLookupVariants(phoneRaw);
      if (variants.length === 0) {
        throw new BadRequestException('Неверный формат телефона');
      }
      user = await this.prisma.user.findFirst({
        where: { phone: { in: variants } },
      });
    }

    if (!user || !user.passwordHash) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Account is disabled');
    }

    const isMatch = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isMatch) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return this.issueTokensForUser(user.id);
  }

  async register(dto: RegisterDto): Promise<TokensDto> {
    const email = dto.email.trim().toLowerCase();
    const phoneNorm = normalizeLoginPhone(dto.phone);
    if (!phoneNorm) {
      throw new BadRequestException('Неверный формат телефона');
    }
    const fullName = dto.fullName.trim();
    if (!fullName) {
      throw new BadRequestException('Укажите имя');
    }

    const [byEmail, byPhone] = await Promise.all([
      this.prisma.user.findUnique({ where: { email }, select: { id: true } }),
      this.prisma.user.findFirst({
        where: { phone: { in: phoneLookupVariants(dto.phone) } },
        select: { id: true },
      }),
    ]);
    if (byEmail) {
      throw new ConflictException('Пользователь с таким email уже зарегистрирован');
    }
    if (byPhone) {
      throw new ConflictException('Пользователь с таким телефоном уже зарегистрирован');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);

    let user;
    try {
      user = await this.prisma.user.create({
        data: {
          email,
          phone: phoneNorm,
          passwordHash,
          fullName,
          role: 'client',
          isActive: true,
        },
      });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        throw new ConflictException('Email или телефон уже занят');
      }
      throw e;
    }

    return this.issueTokensForUser(user.id);
  }

  /** Публичный username бота для Telegram Login Widget (без токена). */
  async getTelegramWidgetConfig(): Promise<{ botUsername: string | null }> {
    const row = await this.prisma.siteSetting.findUnique({
      where: { key: 'telegram_login_bot_username' },
      select: { value: true },
    });
    const v = row?.value?.trim();
    return { botUsername: v && v.length > 0 ? v.replace(/^@/, '') : null };
  }

  /**
   * Вход через Telegram Login Widget: проверка hash по токену бота из site_settings,
   * создание пользователя client при первом входе.
   * Объединение с аккаунтом по email — через {@link linkTelegram} в личном кабинете.
   */
  async telegramLogin(body: Record<string, unknown>): Promise<TokensDto> {
    const { tgId, fullName, username } = await this.parseAndVerifyTelegramLogin(body);

    let user = await this.prisma.user.findUnique({ where: { telegramId: tgId } });

    if (!user) {
      user = await this.prisma.user.create({
        data: {
          email: null,
          passwordHash: null,
          fullName,
          role: 'client',
          telegramId: tgId,
          telegramUsername: username,
          isActive: true,
        },
      });
    } else {
      if (!user.isActive) {
        throw new UnauthorizedException('Аккаунт отключён');
      }
      const patch: { telegramUsername?: string | null; fullName?: string | null } = {};
      if (username !== null && username !== user.telegramUsername) {
        patch.telegramUsername = username;
      }
      if (fullName && fullName !== user.fullName) {
        patch.fullName = fullName;
      }
      if (Object.keys(patch).length > 0) {
        user = await this.prisma.user.update({ where: { id: user.id }, data: patch });
      }
    }

    return this.issueTokensForUser(user.id);
  }

  /**
   * Привязка Telegram к текущему аккаунту (JWT).
   * Если этот Telegram уже был у «пустого» аккаунта (только Telegram, без email и пароля),
   * избранное переносится на текущего пользователя, сессии старого аккаунта сбрасываются.
   */
  async linkTelegram(userId: string, body: Record<string, unknown>): Promise<TokensDto> {
    const { tgId, fullName, username } = await this.parseAndVerifyTelegramLogin(body);

    const me = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!me?.isActive) {
      throw new UnauthorizedException('Пользователь не найден или отключён');
    }

    if (me.telegramId === tgId) {
      const patch: { telegramUsername?: string | null; fullName?: string | null } = {};
      if (username !== null && username !== me.telegramUsername) {
        patch.telegramUsername = username;
      }
      if (fullName && fullName !== me.fullName) {
        patch.fullName = fullName;
      }
      if (Object.keys(patch).length > 0) {
        await this.prisma.user.update({ where: { id: me.id }, data: patch });
      }
      return this.issueTokensForUser(me.id);
    }

    const other = await this.prisma.user.findUnique({ where: { telegramId: tgId } });
    if (other && other.id !== me.id) {
      const otherHasCredentials = !!(other.email?.trim() || other.passwordHash);
      if (otherHasCredentials) {
        throw new ConflictException(
          'Этот Telegram уже привязан к другому аккаунту (с email или паролем).',
        );
      }

      await this.prisma.$transaction(async (tx) => {
        await tx.session.deleteMany({ where: { userId: other.id } });
        const favs = await tx.favorite.findMany({ where: { userId: other.id } });
        for (const f of favs) {
          try {
            await tx.favorite.create({
              data: { userId: me.id, blockId: f.blockId, listingId: f.listingId },
            });
          } catch (e) {
            if (
              e instanceof Prisma.PrismaClientKnownRequestError &&
              e.code === 'P2002'
            ) {
              continue;
            }
            throw e;
          }
        }
        await tx.favorite.deleteMany({ where: { userId: other.id } });
        await tx.user.update({
          where: { id: other.id },
          data: { telegramId: null, telegramUsername: null },
        });
        const data: {
          telegramId: bigint;
          telegramUsername: string | null;
          fullName?: string | null;
        } = { telegramId: tgId, telegramUsername: username };
        if (fullName && !me.fullName) {
          data.fullName = fullName;
        }
        await tx.user.update({ where: { id: me.id }, data });
      });

      return this.issueTokensForUser(me.id);
    }

    const data: {
      telegramId: bigint;
      telegramUsername: string | null;
      fullName?: string | null;
    } = { telegramId: tgId, telegramUsername: username };
    if (fullName && !me.fullName) {
      data.fullName = fullName;
    }
    await this.prisma.user.update({ where: { id: me.id }, data });
    return this.issueTokensForUser(me.id);
  }

  /** Добавить email и пароль к аккаунту, вошедшему только через Telegram (JWT). */
  async linkEmail(userId: string, dto: LinkEmailDto): Promise<TokensDto> {
    const email = dto.email.trim().toLowerCase();
    const me = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!me?.isActive) {
      throw new UnauthorizedException('Пользователь не найден или отключён');
    }
    if (me.email?.trim()) {
      throw new ConflictException('В этом аккаунте уже указан email');
    }
    const taken = await this.prisma.user.findUnique({ where: { email } });
    if (taken && taken.id !== me.id) {
      throw new ConflictException('Этот email уже занят другим аккаунтом');
    }
    const passwordHash = await bcrypt.hash(dto.password, 10);
    await this.prisma.user.update({
      where: { id: me.id },
      data: { email, passwordHash },
    });
    return this.issueTokensForUser(me.id);
  }

  private async parseAndVerifyTelegramLogin(body: Record<string, unknown>): Promise<{
    tgId: bigint;
    fullName: string | null;
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
      throw new ServiceUnavailableException(
        'Вход через Telegram не настроен: укажите токен бота в админке → Настройки → Интеграции',
      );
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

    const fullName =
      [strMap.first_name, strMap.last_name].filter(Boolean).join(' ').trim() || null;
    const username = strMap.username?.trim() || null;

    return { tgId, fullName, username };
  }

  private async issueTokensForUser(userId: string): Promise<TokensDto> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.isActive) {
      throw new UnauthorizedException('User not found or disabled');
    }
    const tokens = await this.generateTokens({
      sub: user.id,
      email: user.email ?? '',
      role: user.role,
    });
    await this.saveRefreshToken(user.id, tokens.refreshToken);
    return tokens;
  }

  private async getSiteSettingValue(key: string): Promise<string | null> {
    const row = await this.prisma.siteSetting.findUnique({
      where: { key },
      select: { value: true },
    });
    const v = row?.value?.trim();
    return v && v.length > 0 ? v : null;
  }

  async refresh(refreshToken: string): Promise<TokensDto> {
    let payload: JwtPayload;
    try {
      payload = await this.jwtService.verifyAsync(refreshToken, {
        secret: this.config.get<string>('JWT_REFRESH_SECRET'),
      });
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const session = await this.prisma.session.findFirst({
      where: { userId: payload.sub },
      orderBy: { createdAt: 'desc' },
    });

    if (!session) {
      throw new UnauthorizedException('Session not found');
    }

    const isValid = await bcrypt.compare(refreshToken, session.refreshTokenHash);
    if (!isValid) {
      throw new UnauthorizedException('Refresh token mismatch');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
    });
    if (!user || !user.isActive) {
      throw new UnauthorizedException('User not found or disabled');
    }

    await this.prisma.session.delete({ where: { id: session.id } });
    return this.issueTokensForUser(user.id);
  }

  async logout(userId: string): Promise<void> {
    await this.prisma.session.deleteMany({ where: { userId } });
  }

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        phone: true,
        fullName: true,
        role: true,
        telegramId: true,
        telegramUsername: true,
        isActive: true,
        createdAt: true,
      },
    });
    if (!user) throw new UnauthorizedException('User not found');
    const { telegramId: _tg, ...rest } = user;
    return { ...rest, telegramLinked: _tg !== null };
  }

  private async generateTokens(payload: JwtPayload): Promise<TokensDto> {
    const accessExpiresIn = this.config.get<string>('JWT_ACCESS_EXPIRES_IN', '15m');
    const refreshExpiresIn = this.config.get<string>('JWT_REFRESH_EXPIRES_IN', '30d');

    const signOpts = (secret: string | undefined, expiresIn: string): JwtSignOptions =>
      ({ secret, expiresIn } as JwtSignOptions);
    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(
        { sub: payload.sub, email: payload.email, role: payload.role },
        signOpts(this.config.get<string>('JWT_ACCESS_SECRET'), accessExpiresIn),
      ),
      this.jwtService.signAsync(
        { sub: payload.sub, email: payload.email, role: payload.role },
        signOpts(this.config.get<string>('JWT_REFRESH_SECRET'), refreshExpiresIn),
      ),
    ]);
    return { accessToken, refreshToken };
  }

  private async saveRefreshToken(
    userId: string,
    refreshToken: string,
  ): Promise<void> {
    const hash = await bcrypt.hash(refreshToken, 10);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    await this.prisma.session.create({
      data: { userId, refreshTokenHash: hash, expiresAt },
    });
  }
}
