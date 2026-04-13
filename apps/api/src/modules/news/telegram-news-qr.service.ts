import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { SiteSettingFieldType } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { INTEGRATIONS_SITE_SETTINGS_GROUP } from '../content/content-defaults';
import { PrismaService } from '../../prisma/prisma.service';

type QrPhase = 'starting' | 'awaiting_scan' | 'awaiting_password' | 'success' | 'error' | 'cancelled';

type ActiveQrFlow = {
  flowId: string;
  phase: QrPhase;
  loginUrl?: string;
  expiresAtMs?: number;
  passwordHint?: string | null;
  errorMessage?: string;
  startedAt: number;
};

type PasswordWait = {
  flowId: string;
  resolve: (v: string) => void;
  reject: (e: Error) => void;
  timer: NodeJS.Timeout;
};

@Injectable()
export class TelegramNewsQrAuthService {
  private readonly log = new Logger(TelegramNewsQrAuthService.name);
  private active: ActiveQrFlow | null = null;
  private passwordWait: PasswordWait | null = null;
  private runGeneration = 0;
  private disconnectInFlight: (() => Promise<void>) | null = null;

  constructor(private readonly prisma: PrismaService) {}

  startQrLogin(): { flowId: string } {
    const apiIdRaw = (process.env.TG_API_ID ?? '').trim();
    const apiHash = (process.env.TG_API_HASH ?? '').trim();
    const apiId = Number(apiIdRaw);
    if (!Number.isInteger(apiId) || apiId <= 0 || !apiHash) {
      throw new BadRequestException(
        'Сначала задайте TG_API_ID и TG_API_HASH на сервере (https://my.telegram.org → .env).',
      );
    }

    if (this.active) {
      const age = Date.now() - this.active.startedAt;
      const terminal = ['success', 'error', 'cancelled'].includes(this.active.phase);
      if (!terminal || age < 15_000) {
        throw new ConflictException(
          'Уже запущено подключение по QR. Дождитесь завершения или отмените его.',
        );
      }
    }

    const flowId = randomUUID();
    this.active = { flowId, phase: 'starting', startedAt: Date.now() };
    const gen = ++this.runGeneration;
    void this.runQrAuth(flowId, apiId, apiHash, gen);
    return { flowId };
  }

  getQrLoginState(flowId: string) {
    if (!this.active || this.active.flowId !== flowId) {
      throw new NotFoundException('Сессия подключения не найдена или истекла. Запустите заново.');
    }
    const { phase, loginUrl, expiresAtMs, passwordHint, errorMessage } = this.active;
    return { phase, loginUrl, expiresAtMs, passwordHint: passwordHint ?? null, errorMessage: errorMessage ?? null };
  }

  submitQrPassword(flowId: string, password: string) {
    if (!this.active || this.active.flowId !== flowId) {
      throw new NotFoundException('Сессия подключения не найдена.');
    }
    if (this.active.phase !== 'awaiting_password') {
      throw new BadRequestException('Сейчас не ожидается пароль 2FA.');
    }
    if (!this.passwordWait || this.passwordWait.flowId !== flowId) {
      throw new BadRequestException('Окно ввода пароля недоступно.');
    }
    clearTimeout(this.passwordWait.timer);
    this.passwordWait.resolve(password.trim());
    this.passwordWait = null;
    return { ok: true };
  }

  async cancelQrLogin(flowId: string) {
    if (!this.active || this.active.flowId !== flowId) {
      return { ok: false };
    }
    this.active = { ...this.active, phase: 'cancelled', errorMessage: 'Отменено' };
    if (this.passwordWait?.flowId === flowId) {
      clearTimeout(this.passwordWait.timer);
      this.passwordWait.reject(new Error('CANCELLED'));
      this.passwordWait = null;
    }
    this.runGeneration += 1;
    if (this.disconnectInFlight) {
      try {
        await this.disconnectInFlight();
      } catch {
        /* ignore */
      }
      this.disconnectInFlight = null;
    }
    return { ok: true };
  }

  private setActive(patch: Partial<ActiveQrFlow>) {
    if (!this.active) return;
    this.active = { ...this.active, ...patch };
  }

  private async runQrAuth(flowId: string, apiId: number, apiHash: string, generation: number): Promise<void> {
    const { TelegramClient } = await import('telegram');
    const { StringSession } = await import('telegram/sessions');

    const session = new StringSession('');
    const client = new TelegramClient(session, apiId, apiHash, { connectionRetries: 3 });
    this.disconnectInFlight = async () => {
      try {
        await client.disconnect();
      } catch {
        /* ignore */
      }
    };

    try {
      if (generation !== this.runGeneration) return;
      await client.connect();
      if (generation !== this.runGeneration) return;

      await client.signInUserWithQrCode(
        { apiId, apiHash },
        {
          qrCode: async ({ token, expires }) => {
            if (generation !== this.runGeneration || !this.active || this.active.flowId !== flowId) return;
            const buf = Buffer.isBuffer(token) ? token : Buffer.from(token as Buffer);
            const loginUrl = `tg://login?token=${buf.toString('base64url')}`;
            const expiresAtMs =
              typeof expires === 'number' && Number.isFinite(expires)
                ? expires < 2_000_000_000
                  ? expires * 1000
                  : expires
                : Date.now() + 30_000;
            this.setActive({ phase: 'awaiting_scan', loginUrl, expiresAtMs });
            await new Promise((r) => setTimeout(r, 25_000));
          },
          password: async (hint?: string) => {
            if (generation !== this.runGeneration) throw new Error('CANCELLED');
            this.setActive({ phase: 'awaiting_password', passwordHint: hint ?? null });
            return await new Promise<string>((resolve, reject) => {
              const timer = setTimeout(() => {
                if (this.passwordWait?.flowId === flowId) {
                  this.passwordWait = null;
                }
                reject(
                  new BadRequestException(
                    'Истёк таймаут ввода пароля 2FA. Запустите подключение по QR снова.',
                  ),
                );
              }, 120_000);
              this.passwordWait = { flowId, resolve, reject, timer };
            });
          },
          onError: async (err: Error) => {
            this.log.warn(`Telegram QR onError: ${err.message}`);
            return false;
          },
        },
      );

      if (generation !== this.runGeneration || !this.active || this.active.flowId !== flowId) return;

      const saved = session.save();
      await this.prisma.siteSetting.upsert({
        where: { key: 'tg_news_mtproto_session' },
        update: { value: saved },
        create: {
          key: 'tg_news_mtproto_session',
          value: saved,
          groupName: INTEGRATIONS_SITE_SETTINGS_GROUP,
          label: 'MTProto: string session (импорт новостей из Telegram)',
          fieldType: SiteSettingFieldType.SECRET,
          sortOrder: 15,
        },
      });

      this.setActive({ phase: 'success', loginUrl: undefined, expiresAtMs: undefined });
      this.log.log(`Telegram MTProto session saved (QR), flow ${flowId}`);
    } catch (e) {
      if (generation !== this.runGeneration) return;
      const msg =
        e instanceof BadRequestException
          ? e.message
          : e instanceof Error
            ? e.message
            : String(e);
      if (this.active?.flowId === flowId) {
        this.setActive({ phase: 'error', errorMessage: msg, loginUrl: undefined });
      }
      this.log.warn(`Telegram QR auth failed: ${msg}`);
    } finally {
      if (this.passwordWait?.flowId === flowId) {
        clearTimeout(this.passwordWait.timer);
        this.passwordWait.reject(new Error('FLOW_END'));
        this.passwordWait = null;
      }
      try {
        await client.disconnect();
      } catch {
        /* ignore */
      }
      if (this.disconnectInFlight) {
        this.disconnectInFlight = null;
      }
    }
  }
}
