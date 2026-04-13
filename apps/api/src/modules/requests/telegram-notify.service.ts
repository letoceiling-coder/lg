import { Injectable, Logger, NotFoundException, OnModuleInit } from '@nestjs/common';
import * as https from 'node:https';
import {
  RequestType,
  TelegramNotifyAccessStatus,
  type Request as DbRequest,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { ContentService } from '../content/content.service';
import { UsersService } from '../users/users.service';

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

@Injectable()
export class TelegramNotifyService implements OnModuleInit {
  private readonly logger = new Logger(TelegramNotifyService.name);
  private cache: { token: string; at: number } | null = null;
  private static readonly CACHE_MS = 20_000;
  private readonly webhookUrl = process.env.TELEGRAM_WEBHOOK_URL?.trim() ?? '';
  private readonly publicSiteUrl =
    (process.env.PUBLIC_SITE_URL?.trim().replace(/\/+$/, '') || 'https://lg.livegrid.ru');

  constructor(
    private readonly content: ContentService,
    private readonly prisma: PrismaService,
    private readonly users: UsersService,
  ) {}

  async onModuleInit() {
    await this.ensureWebhookConfigured();
    await this.ensureBotCommandsConfigured();
  }

  private async getCachedBotToken(): Promise<string> {
    const now = Date.now();
    if (this.cache && now - this.cache.at < TelegramNotifyService.CACHE_MS) {
      return this.cache.token;
    }
    const token = await this.content.getTelegramBotToken();
    this.cache = { token, at: now };
    return token;
  }

  invalidateCache() {
    this.cache = null;
  }

  async isConfigured(): Promise<boolean> {
    const token = await this.getCachedBotToken();
    if (!token) return false;
    const recipientsCount = await this.prisma.telegramNotifyRecipient.count({
      where: { isActive: true },
    });
    return recipientsCount > 0;
  }

  async notifyNewRequest(row: DbRequest): Promise<boolean> {
    const token = await this.getCachedBotToken();
    if (!token) {
      return false;
    }
    const recipients = await this.prisma.telegramNotifyRecipient.findMany({
      where: { isActive: true },
      select: { id: true, telegramChatId: true },
    });
    if (recipients.length === 0) return false;

    const typeLabel = this.requestTypeRu(row.type);
    const lines = [
      '<b>Новая заявка LiveGrid</b>',
      '',
      `<b>ID:</b> ${row.id}`,
      `<b>Тип:</b> ${escapeHtml(typeLabel)}`,
      row.name ? `<b>Имя:</b> ${escapeHtml(row.name)}` : null,
      row.phone ? `<b>Телефон:</b> ${escapeHtml(row.phone)}` : null,
      row.email ? `<b>Email:</b> ${escapeHtml(row.email)}` : null,
      row.blockId != null ? `<b>block_id:</b> ${row.blockId}` : null,
      row.listingId != null ? `<b>listing_id:</b> ${row.listingId}` : null,
      row.sourceUrl ? `<b>Страница:</b> ${escapeHtml(row.sourceUrl)}` : null,
      row.comment ? `<b>Комментарий:</b>\n${escapeHtml(row.comment)}` : null,
    ].filter(Boolean) as string[];

    const text = lines.join('\n');
    let sentCount = 0;
    for (const recipient of recipients) {
      const ok = await this.sendMessage(token, recipient.telegramChatId, text, 'HTML');
      if (ok) {
        sentCount += 1;
      } else {
        this.logger.warn(`Telegram send failed for recipient=${recipient.id}`);
      }
    }
    return sentCount > 0;
  }

  async listAccessRequests(status?: TelegramNotifyAccessStatus) {
    return this.prisma.telegramNotifyAccessRequest.findMany({
      where: status ? { status } : {},
      orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
    });
  }

  async listRecipients() {
    return this.prisma.telegramNotifyRecipient.findMany({
      orderBy: [{ isActive: 'desc' }, { createdAt: 'desc' }],
    });
  }

  async approveAccessRequest(id: number, reviewerId: string) {
    const req = await this.prisma.telegramNotifyAccessRequest.findUnique({ where: { id } });
    if (!req) throw new NotFoundException(`Telegram access request ${id} not found`);

    const now = new Date();
    const updatedRequest = await this.prisma.telegramNotifyAccessRequest.update({
      where: { id },
      data: {
        status: TelegramNotifyAccessStatus.APPROVED,
        reviewedBy: reviewerId,
        reviewedAt: now,
      },
    });

    await this.prisma.telegramNotifyRecipient.upsert({
      where: { telegramUserId: req.telegramUserId },
      update: {
        telegramChatId: req.telegramChatId,
        telegramUsername: req.telegramUsername,
        telegramFirstName: req.telegramFirstName,
        telegramLastName: req.telegramLastName,
        isActive: true,
        approvedBy: reviewerId,
        approvedAt: now,
      },
      create: {
        telegramUserId: req.telegramUserId,
        telegramChatId: req.telegramChatId,
        telegramUsername: req.telegramUsername,
        telegramFirstName: req.telegramFirstName,
        telegramLastName: req.telegramLastName,
        isActive: true,
        approvedBy: reviewerId,
        approvedAt: now,
      },
    });

    const token = await this.getCachedBotToken();
    if (token) {
      const displayName = [req.telegramFirstName, req.telegramLastName].filter(Boolean).join(' ').trim();
      const hello = displayName.length > 0 ? `, ${displayName}` : '';
      await this.sendMessage(
        token,
        req.telegramChatId,
        `Готово${hello}! Доступ к уведомлениям LiveGrid одобрен. Теперь вы будете получать новые заявки.`,
      );
    }

    return updatedRequest;
  }

  async rejectAccessRequest(id: number, reviewerId: string) {
    const req = await this.prisma.telegramNotifyAccessRequest.findUnique({ where: { id } });
    if (!req) throw new NotFoundException(`Telegram access request ${id} not found`);

    const updated = await this.prisma.telegramNotifyAccessRequest.update({
      where: { id },
      data: {
        status: TelegramNotifyAccessStatus.REJECTED,
        reviewedBy: reviewerId,
        reviewedAt: new Date(),
      },
    });

    const token = await this.getCachedBotToken();
    if (token) {
      await this.sendMessage(
        token,
        req.telegramChatId,
        'Запрос на доступ к уведомлениям отклонён. Обратитесь к администратору LiveGrid.',
      );
    }

    return updated;
  }

  async deactivateRecipient(id: number) {
    return this.prisma.telegramNotifyRecipient.update({
      where: { id },
      data: { isActive: false },
    });
  }

  async handleWebhookUpdate(update: unknown): Promise<void> {
    try {
      const message = this.extractMessage(update);
      if (!message?.text) return;

      const parts = message.text.trim().split(/\s+/);
      const raw = parts[0]?.toLowerCase();
      const command = raw?.split('@')[0] ?? '';
      const arg = parts[1] ?? '';
      if (!command) return;
      this.logger.log(`Telegram command received: ${command}`);

      const token = await this.getCachedBotToken();
      if (!token) return;

      if (command === '/start') {
        if (arg.startsWith('tg_link_') && message.from) {
          const tokenArg = arg.slice('tg_link_'.length);
          try {
            const linked = await this.users.linkTelegramByToken(tokenArg, {
              id: message.from.id,
              username: message.from.username ?? null,
            });
            if (linked.ok) {
              await this.sendMessage(
                token,
                message.chat.id,
                `Telegram успешно привязан к пользователю ${linked.fullName || linked.userId}.`,
                undefined,
                this.quickMenu(),
              );
            } else {
              await this.sendMessage(
                token,
                message.chat.id,
                'Ссылка привязки недействительна или устарела. Запросите новую в админке.',
                undefined,
                this.quickMenu(),
              );
            }
          } catch (e) {
            await this.sendMessage(
              token,
              message.chat.id,
              e instanceof Error
                ? e.message
                : 'Не удалось привязать Telegram. Обратитесь к администратору.',
              undefined,
              this.quickMenu(),
            );
          }
          return;
        }
        await this.sendMessage(
          token,
          message.chat.id,
          [
            'Добро пожаловать в LiveGrid Bot.',
            '',
            'Быстрое меню:',
            '/search — поиск по фильтрам',
            '/catalog — список ЖК (по 5)',
            '/favorites — избранное',
            '/contacts — контакты агентства',
          ].join('\n'),
          undefined,
          this.quickMenu(),
        );
        return;
      }

      if (command === '/contacts') {
        await this.sendMessage(
          token,
          message.chat.id,
          `Контакты агентства: ${this.publicSiteUrl}/contacts`,
          undefined,
          this.quickMenu(),
        );
        return;
      }

      if (command === '/search') {
        await this.sendMessage(
          token,
          message.chat.id,
          'Поиск скоро будет доступен: город → тип → цена → результат.',
          undefined,
          this.quickMenu(),
        );
        return;
      }

      if (command === '/catalog') {
        await this.sendMessage(
          token,
          message.chat.id,
          'Каталог (с пагинацией по 5) подключим следующим шагом.',
          undefined,
          this.quickMenu(),
        );
        return;
      }

      if (command === '/favorites') {
        await this.sendMessage(
          token,
          message.chat.id,
          'Избранное будет доступно после привязки Telegram-аккаунта.',
          undefined,
          this.quickMenu(),
        );
        return;
      }

      if (command === '/admin') {
        await this.requestAdminAccess(token, message);
        return;
      }

      await this.sendMessage(
        token,
        message.chat.id,
        'Неизвестная команда. Нажмите /start для меню.',
        undefined,
        this.quickMenu(),
      );
    } catch (e) {
      this.logger.warn(
        `Telegram webhook handle error: ${e instanceof Error ? e.message : String(e)}`,
      );
    }
  }

  private async requestAdminAccess(
    token: string,
    message: {
      text: string;
      chat: { id: bigint; type?: string };
      from?: { id: bigint; username?: string; first_name?: string; last_name?: string };
    },
  ) {
    if (!message.from) return;
    if (message.chat.type && message.chat.type !== 'private') {
      await this.sendMessage(token, message.chat.id, 'Команда /admin доступна только в личном чате с ботом.');
      return;
    }

    const existingRecipient = await this.prisma.telegramNotifyRecipient.findUnique({
      where: { telegramUserId: message.from.id },
      select: { isActive: true },
    });
    if (existingRecipient?.isActive) {
      await this.sendMessage(token, message.chat.id, 'Вы уже одобрены и получаете уведомления.');
      return;
    }

    const pending = await this.prisma.telegramNotifyAccessRequest.findFirst({
      where: {
        telegramUserId: message.from.id,
        status: TelegramNotifyAccessStatus.PENDING,
      },
      select: { id: true },
      orderBy: { createdAt: 'desc' },
    });
    if (pending) {
      await this.sendMessage(
        token,
        message.chat.id,
        `Заявка уже отправлена и ждёт одобрения (#${pending.id}).`,
      );
      return;
    }

    const created = await this.prisma.telegramNotifyAccessRequest.create({
      data: {
        telegramUserId: message.from.id,
        telegramChatId: message.chat.id,
        telegramUsername: message.from.username ?? null,
        telegramFirstName: message.from.first_name ?? null,
        telegramLastName: message.from.last_name ?? null,
        status: TelegramNotifyAccessStatus.PENDING,
      },
    });

    await this.sendMessage(
      token,
      message.chat.id,
      `Заявка на доступ отправлена (#${created.id}). После одобрения в админке вы начнёте получать уведомления.`,
    );
  }

  private extractMessage(update: unknown): {
    text: string;
    chat: { id: bigint; type?: string };
    from?: { id: bigint; username?: string; first_name?: string; last_name?: string };
  } | null {
    if (!update || typeof update !== 'object') return null;
    const raw = update as Record<string, unknown>;
    const message = raw.message ?? raw.edited_message ?? raw.channel_post;
    if (!message || typeof message !== 'object') return null;
    const msg = message as Record<string, unknown>;
    if (typeof msg.text !== 'string') return null;

    const chat = msg.chat as Record<string, unknown> | undefined;
    const chatId = this.toBigInt(chat?.id);
    if (!chatId) return null;

    const fromRaw = msg.from as Record<string, unknown> | undefined;
    const fromId = this.toBigInt(fromRaw?.id);

    return {
      text: msg.text,
      chat: { id: chatId, type: typeof chat?.type === 'string' ? chat.type : undefined },
      from: fromId
        ? {
            id: fromId,
            username: typeof fromRaw?.username === 'string' ? fromRaw.username : undefined,
            first_name: typeof fromRaw?.first_name === 'string' ? fromRaw.first_name : undefined,
            last_name: typeof fromRaw?.last_name === 'string' ? fromRaw.last_name : undefined,
          }
        : undefined,
    };
  }

  private toBigInt(value: unknown): bigint | null {
    if (typeof value === 'bigint') return value;
    if (typeof value === 'number' && Number.isFinite(value)) return BigInt(Math.trunc(value));
    if (typeof value === 'string' && value.trim() !== '') {
      try {
        return BigInt(value);
      } catch {
        return null;
      }
    }
    return null;
  }

  private async sendMessage(
    token: string,
    chatId: bigint,
    text: string,
    parseMode?: 'HTML',
    replyMarkup?: Record<string, unknown>,
  ): Promise<boolean> {
    const payload = {
      chat_id: chatId.toString(),
      text,
      ...(parseMode ? { parse_mode: parseMode } : {}),
      ...(replyMarkup ? { reply_markup: replyMarkup } : {}),
      disable_web_page_preview: true,
    };
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const data = await this.telegramRequest<{ ok: boolean; error_code?: number; description?: string }>(
          token,
          'sendMessage',
          payload,
        );
        if (data.ok) return true;
        this.logger.warn(
          `Telegram sendMessage failed [attempt ${attempt}/3]: ${data.error_code ?? ''} ${data.description ?? ''}`,
        );
      } catch (e) {
        this.logger.warn(
          `Telegram sendMessage error [attempt ${attempt}/3]: ${e instanceof Error ? e.message : String(e)}`,
        );
      }
      await this.sleep(250 * attempt);
    }
    return false;
  }

  private async ensureWebhookConfigured() {
    if (!this.webhookUrl) {
      this.logger.log('TELEGRAM_WEBHOOK_URL not set; webhook auto-registration skipped');
      return;
    }
    const token = await this.getCachedBotToken();
    if (!token) {
      this.logger.warn('telegram_bot_token is empty; webhook auto-registration skipped');
      return;
    }

    const info = await this.telegramApi<{ ok: boolean; result?: { url?: string } }>(
      token,
      'getWebhookInfo',
    );
    const currentUrl = info?.result?.url?.trim() ?? '';
    if (currentUrl === this.webhookUrl) {
      this.logger.log(`Telegram webhook already configured: ${this.webhookUrl}`);
      return;
    }

    const setResult = await this.telegramApi<{ ok: boolean; description?: string }>(
      token,
      'setWebhook',
      { url: this.webhookUrl },
    );
    if (setResult?.ok) {
      this.logger.log(`Telegram webhook configured: ${this.webhookUrl}`);
    } else {
      this.logger.warn(
        `Telegram setWebhook failed: ${setResult?.description ?? 'unknown error'}`,
      );
    }
  }

  private async ensureBotCommandsConfigured() {
    const token = await this.getCachedBotToken();
    if (!token) return;
    await this.telegramApi(token, 'setMyCommands', {
      commands: [
        { command: 'start', description: 'Главное меню' },
        { command: 'search', description: 'Поиск по фильтрам' },
        { command: 'catalog', description: 'Каталог ЖК' },
        { command: 'favorites', description: 'Избранное' },
        { command: 'contacts', description: 'Контакты агентства' },
      ],
    });
  }

  private async telegramApi<T>(
    token: string,
    method: string,
    body?: Record<string, unknown>,
  ): Promise<T | null> {
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        return await this.telegramRequest<T>(token, method, body);
      } catch (e) {
        this.logger.warn(
          `Telegram ${method} error [attempt ${attempt}/3]: ${e instanceof Error ? e.message : String(e)}`,
        );
      }
      await this.sleep(250 * attempt);
    }
    return null;
  }

  private telegramRequest<T>(
    token: string,
    method: string,
    body?: Record<string, unknown>,
  ): Promise<T> {
    const payload = body ? JSON.stringify(body) : undefined;
    return new Promise<T>((resolve, reject) => {
      const req = https.request(
        {
          protocol: 'https:',
          hostname: 'api.telegram.org',
          path: `/bot${token}/${method}`,
          method: body ? 'POST' : 'GET',
          headers: body
            ? {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(payload ?? '').toString(),
              }
            : undefined,
          family: 4,
        },
        (res) => {
          let chunks = '';
          res.setEncoding('utf8');
          res.on('data', (chunk) => {
            chunks += chunk;
          });
          res.on('end', () => {
            if ((res.statusCode ?? 500) >= 400) {
              reject(new Error(`HTTP ${res.statusCode ?? 500}: ${chunks || 'telegram api error'}`));
              return;
            }
            try {
              resolve(JSON.parse(chunks) as T);
            } catch {
              reject(new Error(`Invalid Telegram JSON: ${chunks}`));
            }
          });
        },
      );
      req.on('error', reject);
      req.setTimeout(8000, () => req.destroy(new Error('Telegram API timeout')));
      if (payload) req.write(payload);
      req.end();
    });
  }

  private requestTypeRu(t: RequestType): string {
    const map: Record<RequestType, string> = {
      CONSULTATION: 'Консультация',
      MORTGAGE: 'Ипотека',
      CALLBACK: 'Обратный звонок',
      SELECTION: 'Подбор',
      CONTACT: 'Контакты',
    };
    return map[t] ?? t;
  }

  private quickMenu() {
    return {
      keyboard: [
        [{ text: '/search' }, { text: '/catalog' }],
        [{ text: '/favorites' }, { text: '/contacts' }],
      ],
      resize_keyboard: true,
      is_persistent: true,
    };
  }

  private sleep(ms: number) {
    return new Promise<void>((resolve) => setTimeout(resolve, ms));
  }
}
