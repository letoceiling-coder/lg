import {
  BadRequestException,
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService, type JwtSignOptions } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto, TokensDto } from './dto';
import { verifyTelegramLoginWidget } from './telegram-login.util';

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
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

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

    const tokens = await this.generateTokens({
      sub: user.id,
      email: user.email ?? '',
      role: user.role,
    });

    await this.saveRefreshToken(user.id, tokens.refreshToken);
    return tokens;
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
   */
  async telegramLogin(body: Record<string, unknown>): Promise<TokensDto> {
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

    let user = await this.prisma.user.findUnique({ where: { telegramId: tgId } });
    const fullName =
      [strMap.first_name, strMap.last_name].filter(Boolean).join(' ').trim() || null;
    const username = strMap.username?.trim() || null;

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

    const tokens = await this.generateTokens({
      sub: user.id,
      email: user.email ?? '',
      role: user.role,
    });

    await this.prisma.session.delete({ where: { id: session.id } });
    await this.saveRefreshToken(user.id, tokens.refreshToken);

    return tokens;
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
        telegramUsername: true,
        isActive: true,
        createdAt: true,
      },
    });
    if (!user) throw new UnauthorizedException('User not found');
    return user;
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
