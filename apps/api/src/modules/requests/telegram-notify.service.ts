import { Injectable, Logger, NotFoundException, OnModuleInit } from '@nestjs/common';
import * as https from 'node:https';
import {
  Block,
  Listing,
  RequestType,
  TelegramNotifyAccessStatus,
  type Request as DbRequest,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { MetricsService } from '../../monitoring/metrics.service';
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
    private readonly metrics: MetricsService,
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
    const obj = await this.resolveRequestObject(row);
    const lines = [
      '<b>Новая заявка LiveGrid</b>',
      '',
      `<b>Имя:</b> ${escapeHtml(row.name || '—')}`,
      `<b>Телефон:</b> ${escapeHtml(row.phone || '—')}`,
      `<b>Тип заявки:</b> ${escapeHtml(typeLabel)}`,
      `<b>Объект:</b> ${escapeHtml(obj.label)}`,
      obj.url ? `<b>Ссылка:</b> ${escapeHtml(obj.url)}` : null,
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
      const callback = this.extractCallbackQuery(update);
      if (callback?.data) {
        await this.handleCallbackQuery(callback);
        return;
      }

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
        await this.sendSearchCityStep(token, message.chat.id);
        return;
      }

      if (command === '/catalog') {
        await this.sendCatalogPage(token, message.chat.id, 1);
        return;
      }

      if (command === '/favorites') {
        await this.sendFavorites(token, message.chat.id, message.from?.id ?? null);
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

  private extractCallbackQuery(update: unknown): {
    id: string;
    data: string;
    chatId: bigint;
  } | null {
    if (!update || typeof update !== 'object') return null;
    const raw = update as Record<string, unknown>;
    const callback = raw.callback_query as Record<string, unknown> | undefined;
    if (!callback) return null;
    const id = typeof callback.id === 'string' ? callback.id : '';
    const data = typeof callback.data === 'string' ? callback.data : '';
    const message = callback.message as Record<string, unknown> | undefined;
    const chat = message?.chat as Record<string, unknown> | undefined;
    const chatId = this.toBigInt(chat?.id);
    if (!id || !data || !chatId) return null;
    return { id, data, chatId };
  }

  private async handleCallbackQuery(callback: {
    id: string;
    data: string;
    chatId: bigint;
  }) {
    const token = await this.getCachedBotToken();
    if (!token) return;
    await this.telegramApi(token, 'answerCallbackQuery', { callback_query_id: callback.id });

    const parts = callback.data.split('|');
    if (parts[0] === 'cat' && parts[1] === 'p') {
      const page = Math.max(1, parseInt(parts[2] ?? '1', 10) || 1);
      await this.sendCatalogPage(token, callback.chatId, page);
      return;
    }
    if (parts[0] === 'sr') {
      const regionId = parseInt(parts[1] ?? '', 10);
      if (Number.isFinite(regionId) && regionId > 0) {
        await this.sendSearchDistrictStep(token, callback.chatId, regionId);
      }
      return;
    }
    if (parts[0] === 'sd') {
      const regionId = parseInt(parts[1] ?? '', 10);
      const districtId = Math.max(0, parseInt(parts[2] ?? '0', 10) || 0);
      if (Number.isFinite(regionId) && regionId > 0) {
        await this.sendSearchTypeStep(token, callback.chatId, regionId, districtId);
      }
      return;
    }
    if (parts[0] === 'st') {
      const regionId = parseInt(parts[1] ?? '', 10);
      const oldKindCode = (parts[2] ?? 'A').toUpperCase();
      const districtId = Math.max(0, parseInt(parts[2] ?? '0', 10) || 0);
      const kindCode = (parts[3] ?? oldKindCode).toUpperCase();
      if (Number.isFinite(regionId) && regionId > 0) {
        if (parts.length >= 4) {
          if (kindCode === 'A') {
            await this.sendSearchRoomsStep(token, callback.chatId, regionId, districtId, kindCode);
          } else {
            await this.sendSearchPriceStep(token, callback.chatId, regionId, districtId, kindCode, '0');
          }
        } else {
          // Backward compatibility for old callbacks without district step.
          await this.sendSearchPriceStep(token, callback.chatId, regionId, 0, kindCode, '0');
        }
      }
      return;
    }
    if (parts[0] === 'sm') {
      const regionId = parseInt(parts[1] ?? '', 10);
      const districtId = Math.max(0, parseInt(parts[2] ?? '0', 10) || 0);
      const kindCode = (parts[3] ?? 'A').toUpperCase();
      const roomCode = (parts[4] ?? '0').toUpperCase();
      if (Number.isFinite(regionId) && regionId > 0) {
        await this.sendSearchPriceStep(token, callback.chatId, regionId, districtId, kindCode, roomCode);
      }
      return;
    }
    if (parts[0] === 'sp') {
      const regionId = parseInt(parts[1] ?? '', 10);
      const oldKindCode = (parts[2] ?? 'A').toUpperCase();
      const oldPriceCode = (parts[3] ?? '0').toUpperCase();
      const districtId = Math.max(0, parseInt(parts[2] ?? '0', 10) || 0);
      const kindCode = (parts[3] ?? oldKindCode).toUpperCase();
      const roomCode = (parts[4] ?? '0').toUpperCase();
      const priceCode = (parts[5] ?? oldPriceCode).toUpperCase();
      if (Number.isFinite(regionId) && regionId > 0) {
        if (parts.length >= 6) {
          await this.sendSearchResults(token, callback.chatId, regionId, districtId, kindCode, roomCode, priceCode, 1);
        } else {
          // Backward compatibility for old callbacks without district/rooms.
          await this.sendSearchResults(token, callback.chatId, regionId, 0, kindCode, '0', priceCode, 1);
        }
      }
      return;
    }
    if (parts[0] === 'ss') {
      const regionId = parseInt(parts[1] ?? '', 10);
      const oldKindCode = (parts[2] ?? 'A').toUpperCase();
      const oldPriceCode = (parts[3] ?? '0').toUpperCase();
      const oldPage = Math.max(1, parseInt(parts[4] ?? '1', 10) || 1);
      const districtId = Math.max(0, parseInt(parts[2] ?? '0', 10) || 0);
      const kindCode = (parts[3] ?? oldKindCode).toUpperCase();
      const roomCode = (parts[4] ?? '0').toUpperCase();
      const priceCode = (parts[5] ?? oldPriceCode).toUpperCase();
      const page = Math.max(1, parseInt(parts[6] ?? String(oldPage), 10) || 1);
      if (Number.isFinite(regionId) && regionId > 0) {
        if (parts.length >= 7) {
          await this.sendSearchResults(
            token,
            callback.chatId,
            regionId,
            districtId,
            kindCode,
            roomCode,
            priceCode,
            page,
          );
        } else {
          // Backward compatibility for old callbacks without district/rooms.
          await this.sendSearchResults(token, callback.chatId, regionId, 0, kindCode, '0', priceCode, page);
        }
      }
    }
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
    let lastFailureKind: 'not_ok' | 'http_error' = 'http_error';
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const data = await this.telegramRequest<{ ok: boolean; error_code?: number; description?: string }>(
          token,
          'sendMessage',
          payload,
        );
        if (data.ok) return true;
        lastFailureKind = 'not_ok';
        this.logger.warn(
          `Telegram sendMessage failed [attempt ${attempt}/3]: ${data.error_code ?? ''} ${data.description ?? ''}`,
        );
      } catch (e) {
        if (this.isTelegramBadRequest(e)) {
          this.logger.warn(
            `Telegram sendMessage bad request (no retry): ${e instanceof Error ? e.message : String(e)}`,
          );
          this.metrics.recordTelegramSendFailure('sendMessage', 'bad_request');
          return false;
        }
        lastFailureKind = 'http_error';
        this.logger.warn(
          `Telegram sendMessage error [attempt ${attempt}/3]: ${e instanceof Error ? e.message : String(e)}`,
        );
      }
      await this.sleep(250 * attempt);
    }
    this.metrics.recordTelegramSendFailure('sendMessage', lastFailureKind);
    return false;
  }

  private async sendPhoto(
    token: string,
    chatId: bigint,
    photoUrl: string,
    caption: string,
    parseMode?: 'HTML',
    replyMarkup?: Record<string, unknown>,
  ): Promise<boolean> {
    const payload = {
      chat_id: chatId.toString(),
      photo: photoUrl,
      caption,
      ...(parseMode ? { parse_mode: parseMode } : {}),
      ...(replyMarkup ? { reply_markup: replyMarkup } : {}),
    };
    let lastFailureKind: 'not_ok' | 'http_error' = 'http_error';
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const data = await this.telegramRequest<{ ok: boolean; error_code?: number; description?: string }>(
          token,
          'sendPhoto',
          payload,
        );
        if (data.ok) return true;
        lastFailureKind = 'not_ok';
        this.logger.warn(
          `Telegram sendPhoto failed [attempt ${attempt}/3]: ${data.error_code ?? ''} ${data.description ?? ''}`,
        );
      } catch (e) {
        if (this.isTelegramBadRequest(e)) {
          this.logger.warn(
            `Telegram sendPhoto bad request (no retry): ${e instanceof Error ? e.message : String(e)}`,
          );
          this.metrics.recordTelegramSendFailure('sendPhoto', 'bad_request');
          return false;
        }
        lastFailureKind = 'http_error';
        this.logger.warn(
          `Telegram sendPhoto error [attempt ${attempt}/3]: ${e instanceof Error ? e.message : String(e)}`,
        );
      }
      await this.sleep(250 * attempt);
    }
    this.metrics.recordTelegramSendFailure('sendPhoto', lastFailureKind);
    return false;
  }

  private async sendCatalogPage(token: string, chatId: bigint, page: number) {
    const perPage = 5;
    const where = {
      listings: {
        some: {
          status: 'ACTIVE' as const,
          kind: 'APARTMENT' as const,
          isPublished: true,
        },
      },
    };
    const total = await this.prisma.block.count({ where });
    if (total === 0) {
      await this.sendMessage(token, chatId, 'Каталог пока пуст.', undefined, this.quickMenu());
      return;
    }
    const totalPages = Math.max(1, Math.ceil(total / perPage));
    const safePage = Math.min(Math.max(1, page), totalPages);
    const rows = await this.prisma.block.findMany({
      where,
      orderBy: { name: 'asc' },
      skip: (safePage - 1) * perPage,
      take: perPage,
      include: {
        addresses: { orderBy: { sortOrder: 'asc' }, take: 1 },
        images: { orderBy: { sortOrder: 'asc' }, take: 1 },
      },
    });
    const priceRows = await this.prisma.listing.groupBy({
      by: ['blockId'],
      where: {
        blockId: { in: rows.map((r) => r.id) },
        status: 'ACTIVE',
        kind: 'APARTMENT',
        isPublished: true,
        price: { not: null },
      },
      _min: { price: true },
    });
    const minPriceByBlock = new Map(
      priceRows
        .filter((r) => r.blockId != null && r._min.price != null)
        .map((r) => [r.blockId as number, Number(r._min.price)]),
    );

    await this.sendMessage(
      token,
      chatId,
      `Каталог ЖК — страница ${safePage}/${totalPages} (по 5).`,
      undefined,
      this.quickMenu(),
    );
    for (const row of rows) {
      const minPrice = minPriceByBlock.get(row.id);
      await this.sendBlockCard(token, chatId, row, minPrice ?? null);
    }

    const nav: Array<Array<{ text: string; callback_data: string }>> = [];
    const line: Array<{ text: string; callback_data: string }> = [];
    if (safePage > 1) line.push({ text: '⬅️ Назад', callback_data: `cat|p|${safePage - 1}` });
    if (safePage < totalPages) line.push({ text: 'Далее ➡️', callback_data: `cat|p|${safePage + 1}` });
    if (line.length) nav.push(line);
    if (nav.length) {
      await this.sendMessage(token, chatId, 'Навигация по каталогу:', undefined, { inline_keyboard: nav });
    }
  }

  private async sendSearchCityStep(token: string, chatId: bigint) {
    const regions = await this.prisma.feedRegion.findMany({
      where: { isEnabled: true },
      orderBy: { name: 'asc' },
      select: { id: true, name: true, code: true },
    });
    if (regions.length === 0) {
      await this.sendMessage(token, chatId, 'Нет доступных регионов для поиска.', undefined, this.quickMenu());
      return;
    }
    const rows: Array<Array<{ text: string; callback_data: string }>> = [];
    for (let i = 0; i < regions.length; i += 2) {
      const chunk = regions.slice(i, i + 2).map((r) => ({
        text: `${r.name} (${r.code.toUpperCase()})`,
        callback_data: `sr|${r.id}`,
      }));
      rows.push(chunk);
    }
    await this.sendMessage(
      token,
      chatId,
      'Поиск: выберите город/регион.',
      undefined,
      { inline_keyboard: rows },
    );
  }

  private async sendSearchDistrictStep(token: string, chatId: bigint, regionId: number) {
    const districts = await this.prisma.district.findMany({
      where: { regionId },
      orderBy: { name: 'asc' },
      take: 8,
      select: { id: true, name: true },
    });
    const keyboardRows: Array<Array<{ text: string; callback_data: string }>> = [
      [{ text: 'Весь город/регион', callback_data: `sd|${regionId}|0` }],
    ];
    for (const d of districts) {
      keyboardRows.push([{ text: d.name, callback_data: `sd|${regionId}|${d.id}` }]);
    }
    await this.sendMessage(
      token,
      chatId,
      'Поиск: выберите район (или весь город).',
      undefined,
      { inline_keyboard: keyboardRows },
    );
  }

  private async sendSearchTypeStep(
    token: string,
    chatId: bigint,
    regionId: number,
    districtId: number,
  ) {
    const types = [
      { code: 'A', label: 'Квартиры' },
      { code: 'H', label: 'Дома' },
      { code: 'L', label: 'Участки' },
      { code: 'C', label: 'Коммерция' },
      { code: 'P', label: 'Паркинг' },
    ];
    const keyboard = {
      inline_keyboard: types.map((t) => [
        { text: t.label, callback_data: `st|${regionId}|${districtId}|${t.code}` },
      ]),
    };
    await this.sendMessage(token, chatId, 'Поиск: выберите тип объекта.', undefined, keyboard);
  }

  private async sendSearchRoomsStep(
    token: string,
    chatId: bigint,
    regionId: number,
    districtId: number,
    kindCode: string,
  ) {
    const keyboard = {
      inline_keyboard: [
        [{ text: 'Любая комнатность', callback_data: `sm|${regionId}|${districtId}|${kindCode}|0` }],
        [{ text: 'Студия', callback_data: `sm|${regionId}|${districtId}|${kindCode}|S` }],
        [{ text: '1-комнатная', callback_data: `sm|${regionId}|${districtId}|${kindCode}|1` }],
        [{ text: '2-комнатная', callback_data: `sm|${regionId}|${districtId}|${kindCode}|2` }],
        [{ text: '3-комнатная и больше', callback_data: `sm|${regionId}|${districtId}|${kindCode}|3P` }],
      ],
    };
    await this.sendMessage(token, chatId, 'Поиск: выберите комнатность.', undefined, keyboard);
  }

  private async sendSearchPriceStep(
    token: string,
    chatId: bigint,
    regionId: number,
    districtId: number,
    kindCode: string,
    roomCode: string,
  ) {
    const ranges = [
      { code: '0', label: 'Любая цена' },
      { code: '1', label: 'до 5 млн ₽' },
      { code: '2', label: '5–10 млн ₽' },
      { code: '3', label: '10–20 млн ₽' },
      { code: '4', label: 'от 20 млн ₽' },
    ];
    const keyboard = {
      inline_keyboard: ranges.map((r) => [
        { text: r.label, callback_data: `sp|${regionId}|${districtId}|${kindCode}|${roomCode}|${r.code}` },
      ]),
    };
    await this.sendMessage(token, chatId, 'Поиск: выберите диапазон цены.', undefined, keyboard);
  }

  private async sendSearchResults(
    token: string,
    chatId: bigint,
    regionId: number,
    districtId: number,
    kindCode: string,
    roomCode: string,
    priceCode: string,
    page: number,
  ) {
    const perPage = 5;
    const kind = this.kindByCode(kindCode);
    const price = this.priceRangeByCode(priceCode);
    const roomTypeIds = await this.roomTypeIdsByCode(roomCode);
    const where: {
      regionId: number;
      districtId?: number;
      kind?: Listing['kind'];
      status: Listing['status'];
      isPublished: boolean;
      price?: { gte?: number; lte?: number; not: null };
      apartment?: { roomTypeId: { in: number[] } };
    } = {
      regionId,
      status: 'ACTIVE',
      isPublished: true,
      ...(districtId > 0 ? { districtId } : {}),
      ...(kind ? { kind } : {}),
      ...(price ? { price: { ...price, not: null } } : {}),
      ...(roomTypeIds.length > 0 && kind === 'APARTMENT'
        ? { apartment: { roomTypeId: { in: roomTypeIds } } }
        : {}),
    };
    const total = await this.prisma.listing.count({ where });
    if (total === 0) {
      await this.sendMessage(token, chatId, 'Ничего не найдено. Попробуйте другой фильтр.', undefined, this.quickMenu());
      return;
    }
    const totalPages = Math.max(1, Math.ceil(total / perPage));
    const safePage = Math.min(Math.max(1, page), totalPages);
    const rows = await this.prisma.listing.findMany({
      where,
      orderBy: { price: 'asc' },
      skip: (safePage - 1) * perPage,
      take: perPage,
      include: {
        apartment: { select: { roomTypeId: true, blockAddress: true, blockName: true, finishingPhotoUrl: true, planUrl: true } },
        block: {
          select: {
            name: true,
            slug: true,
            addresses: { select: { address: true }, take: 1, orderBy: { sortOrder: 'asc' } },
            images: { select: { url: true }, take: 1, orderBy: { sortOrder: 'asc' } },
          },
        },
      },
    });
    await this.sendMessage(
      token,
      chatId,
      `Результаты поиска (${this.searchSummary(kindCode, roomCode, priceCode, districtId)}) — страница ${safePage}/${totalPages}.`,
      undefined,
      this.quickMenu(),
    );
    for (const row of rows) {
      await this.sendListingCard(token, chatId, row);
    }
    const nav: Array<Array<{ text: string; callback_data: string }>> = [];
    const line: Array<{ text: string; callback_data: string }> = [];
    if (safePage > 1) {
      line.push({
        text: '⬅️ Назад',
        callback_data: `ss|${regionId}|${districtId}|${kindCode}|${roomCode}|${priceCode}|${safePage - 1}`,
      });
    }
    if (safePage < totalPages) {
      line.push({
        text: 'Далее ➡️',
        callback_data: `ss|${regionId}|${districtId}|${kindCode}|${roomCode}|${priceCode}|${safePage + 1}`,
      });
    }
    if (line.length) nav.push(line);
    if (nav.length) {
      await this.sendMessage(token, chatId, 'Навигация по результатам:', undefined, { inline_keyboard: nav });
    }
  }

  private async sendFavorites(token: string, chatId: bigint, telegramUserId: bigint | null) {
    if (!telegramUserId) {
      await this.sendMessage(token, chatId, 'Не удалось определить Telegram-пользователя.', undefined, this.quickMenu());
      return;
    }
    const user = await this.prisma.user.findUnique({
      where: { telegramId: telegramUserId },
      select: { id: true },
    });
    if (!user) {
      await this.sendMessage(
        token,
        chatId,
        'Избранное доступно после привязки Telegram к аккаунту на сайте.',
        undefined,
        this.quickMenu(),
      );
      return;
    }
    const favorites = await this.prisma.favorite.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      take: 20,
      include: {
        block: {
          include: {
            addresses: { orderBy: { sortOrder: 'asc' }, take: 1 },
            images: { orderBy: { sortOrder: 'asc' }, take: 1 },
          },
        },
        listing: {
          include: {
            apartment: { select: { blockAddress: true, blockName: true, finishingPhotoUrl: true, planUrl: true } },
            block: {
              select: {
                name: true,
                slug: true,
                addresses: { select: { address: true }, orderBy: { sortOrder: 'asc' }, take: 1 },
                images: { select: { url: true }, orderBy: { sortOrder: 'asc' }, take: 1 },
              },
            },
          },
        },
      },
    });
    if (favorites.length === 0) {
      await this.sendMessage(token, chatId, 'В избранном пока нет объектов.', undefined, this.quickMenu());
      return;
    }
    await this.sendMessage(token, chatId, `Ваше избранное: ${favorites.length} шт.`, undefined, this.quickMenu());
    for (const fav of favorites) {
      if (fav.block) {
        const minPrice = await this.minPriceForBlock(fav.block.id);
        await this.sendBlockCard(token, chatId, fav.block, minPrice);
      } else if (fav.listing) {
        await this.sendListingCard(token, chatId, fav.listing);
      }
    }
  }

  private async sendBlockCard(
    token: string,
    chatId: bigint,
    block: Block & { addresses?: Array<{ address: string }>; images?: Array<{ url: string }> },
    minPrice: number | null,
  ) {
    const title = block.name || `ЖК #${block.id}`;
    const address = block.addresses?.[0]?.address || 'Адрес не указан';
    const link = `${this.publicSiteUrl}/complex/${block.slug}`;
    const lines = [
      `<b>${escapeHtml(title)}</b>`,
      minPrice != null ? `<b>Цена от:</b> ${escapeHtml(this.formatPrice(minPrice))}` : '<b>Цена:</b> по запросу',
      `<b>Адрес:</b> ${escapeHtml(address)}`,
      `<b>Ссылка:</b> ${escapeHtml(link)}`,
    ];
    const caption = lines.join('\n');
    const photo = this.makePublicUrl(block.images?.[0]?.url ?? null);
    if (photo) {
      const sentPhoto = await this.sendPhoto(token, chatId, photo, caption, 'HTML');
      if (sentPhoto) return;
    }
    await this.sendMessage(token, chatId, caption, 'HTML');
  }

  private async sendListingCard(
    token: string,
    chatId: bigint,
    listing: Listing & {
      apartment?: {
        blockAddress: string | null;
        blockName: string | null;
        finishingPhotoUrl: string | null;
        planUrl: string | null;
      } | null;
      block?: {
        name: string;
        slug: string;
        addresses?: Array<{ address: string }>;
        images?: Array<{ url: string }>;
      } | null;
    },
  ) {
    const titleBase = listing.block?.name || listing.apartment?.blockName || `Объект #${listing.id}`;
    const title = `${this.kindLabel(listing.kind)}: ${titleBase}`;
    const address = listing.apartment?.blockAddress || listing.block?.addresses?.[0]?.address || 'Адрес не указан';
    const price = listing.price != null ? this.formatPrice(Number(listing.price)) : 'по запросу';
    const link =
      listing.kind === 'APARTMENT'
        ? `${this.publicSiteUrl}/apartment/${listing.id}`
        : listing.block?.slug
          ? `${this.publicSiteUrl}/complex/${listing.block.slug}`
          : `${this.publicSiteUrl}/catalog`;
    const lines = [
      `<b>${escapeHtml(title)}</b>`,
      `<b>Цена:</b> ${escapeHtml(price)}`,
      `<b>Адрес:</b> ${escapeHtml(address)}`,
      `<b>Ссылка:</b> ${escapeHtml(link)}`,
    ];
    const caption = lines.join('\n');
    const photo =
      this.makePublicUrl(listing.apartment?.finishingPhotoUrl ?? null) ||
      this.makePublicUrl(listing.apartment?.planUrl ?? null) ||
      this.makePublicUrl(listing.block?.images?.[0]?.url ?? null);
    if (photo) {
      const sentPhoto = await this.sendPhoto(token, chatId, photo, caption, 'HTML');
      if (sentPhoto) return;
    }
    await this.sendMessage(token, chatId, caption, 'HTML');
  }

  private async minPriceForBlock(blockId: number): Promise<number | null> {
    const row = await this.prisma.listing.aggregate({
      where: {
        blockId,
        status: 'ACTIVE',
        kind: 'APARTMENT',
        isPublished: true,
        price: { not: null },
      },
      _min: { price: true },
    });
    return row._min.price != null ? Number(row._min.price) : null;
  }

  private kindByCode(code: string): Listing['kind'] | null {
    const map: Record<string, Listing['kind']> = {
      A: 'APARTMENT',
      H: 'HOUSE',
      L: 'LAND',
      C: 'COMMERCIAL',
      P: 'PARKING',
    };
    return map[code] ?? null;
  }

  private kindLabel(kind: Listing['kind']): string {
    const map: Record<Listing['kind'], string> = {
      APARTMENT: 'Квартира',
      HOUSE: 'Дом',
      LAND: 'Участок',
      COMMERCIAL: 'Коммерция',
      PARKING: 'Паркинг',
    };
    return map[kind] ?? kind;
  }

  private priceRangeByCode(code: string): { gte?: number; lte?: number } | null {
    const million = 1_000_000;
    switch (code) {
      case '1':
        return { lte: 5 * million };
      case '2':
        return { gte: 5 * million, lte: 10 * million };
      case '3':
        return { gte: 10 * million, lte: 20 * million };
      case '4':
        return { gte: 20 * million };
      default:
        return null;
    }
  }

  private async roomTypeIdsByCode(code: string): Promise<number[]> {
    if (!code || code === '0') return [];
    const rows = await this.prisma.roomType.findMany({
      select: { id: true, name: true, nameOne: true },
    });
    const normalized = (v: string | null | undefined) => (v ?? '').toLowerCase();
    if (code === 'S') {
      return rows
        .filter((r) => {
          const n = `${normalized(r.name)} ${normalized(r.nameOne)}`;
          return /студ|studio|0/.test(n);
        })
        .map((r) => r.id);
    }
    if (code === '1') {
      return rows
        .filter((r) => {
          const n = `${normalized(r.name)} ${normalized(r.nameOne)}`;
          return /\b1\b|одн|однокомн/.test(n);
        })
        .map((r) => r.id);
    }
    if (code === '2') {
      return rows
        .filter((r) => {
          const n = `${normalized(r.name)} ${normalized(r.nameOne)}`;
          return /\b2\b|дву|двухкомн/.test(n);
        })
        .map((r) => r.id);
    }
    if (code === '3P') {
      return rows
        .filter((r) => {
          const n = `${normalized(r.name)} ${normalized(r.nameOne)}`;
          return /\b3\b|\b4\b|\b5\b|трехкомн|четырехкомн|многокомн/.test(n);
        })
        .map((r) => r.id);
    }
    return [];
  }

  private roomLabelByCode(code: string): string {
    switch (code) {
      case 'S':
        return 'студия';
      case '1':
        return '1-комн';
      case '2':
        return '2-комн';
      case '3P':
        return '3+ комн';
      default:
        return 'любая комнатность';
    }
  }

  private searchSummary(
    kindCode: string,
    roomCode: string,
    priceCode: string,
    districtId: number,
  ): string {
    const kind = this.kindByCode(kindCode);
    const kindLabel = kind ? this.kindLabel(kind) : 'любой тип';
    const roomLabel = kind === 'APARTMENT' ? this.roomLabelByCode(roomCode) : 'комнатность не выбрана';
    const priceLabel = this.priceLabelByCode(priceCode);
    const district = districtId > 0 ? `район #${districtId}` : 'весь город';
    return `${kindLabel}, ${roomLabel}, ${priceLabel}, ${district}`;
  }

  private priceLabelByCode(code: string): string {
    switch (code) {
      case '1':
        return 'до 5 млн';
      case '2':
        return '5-10 млн';
      case '3':
        return '10-20 млн';
      case '4':
        return 'от 20 млн';
      default:
        return 'любая цена';
    }
  }

  private formatPrice(v: number): string {
    return `${new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 }).format(v)} ₽`;
  }

  private makePublicUrl(url: string | null | undefined): string | null {
    if (!url) return null;
    if (/^https?:\/\//i.test(url)) return url;
    return `${this.publicSiteUrl}${url.startsWith('/') ? '' : '/'}${url}`;
  }

  private async resolveRequestObject(row: DbRequest): Promise<{ label: string; url: string | null }> {
    if (row.listingId != null) {
      const listing = await this.prisma.listing.findUnique({
        where: { id: row.listingId },
        include: { block: { select: { name: true, slug: true } } },
      });
      if (listing) {
        const label = listing.block?.name
          ? `${this.kindLabel(listing.kind)} · ${listing.block.name}`
          : `${this.kindLabel(listing.kind)} #${listing.id}`;
        const url =
          listing.kind === 'APARTMENT'
            ? `${this.publicSiteUrl}/apartment/${listing.id}`
            : listing.block?.slug
              ? `${this.publicSiteUrl}/complex/${listing.block.slug}`
              : row.sourceUrl ?? null;
        return { label, url };
      }
    }
    if (row.blockId != null) {
      const block = await this.prisma.block.findUnique({
        where: { id: row.blockId },
        select: { name: true, slug: true },
      });
      if (block) {
        return { label: block.name, url: `${this.publicSiteUrl}/complex/${block.slug}` };
      }
    }
    return { label: 'Не указан', url: row.sourceUrl ?? null };
  }

  private isTelegramBadRequest(error: unknown): boolean {
    const msg = error instanceof Error ? error.message : String(error);
    return /HTTP 400:/i.test(msg);
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
