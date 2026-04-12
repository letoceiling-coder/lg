import { Injectable, Logger } from '@nestjs/common';
import type { Request as DbRequest, RequestType } from '@prisma/client';
import { ContentService } from '../content/content.service';

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

@Injectable()
export class TelegramNotifyService {
  private readonly logger = new Logger(TelegramNotifyService.name);
  private cache: { token: string; chatId: string; at: number } | null = null;
  private static readonly CACHE_MS = 20_000;

  constructor(private readonly content: ContentService) {}

  private async getCachedCredentials(): Promise<{ token: string; chatId: string }> {
    const now = Date.now();
    if (this.cache && now - this.cache.at < TelegramNotifyService.CACHE_MS) {
      return { token: this.cache.token, chatId: this.cache.chatId };
    }
    const { botToken, notifyChatId } = await this.content.getTelegramNotifyCredentials();
    this.cache = { token: botToken, chatId: notifyChatId, at: now };
    return { token: botToken, chatId: notifyChatId };
  }

  /** Сброс кэша после смены настроек в админке (опционально). */
  invalidateCache() {
    this.cache = null;
  }

  async isConfigured(): Promise<boolean> {
    const { token, chatId } = await this.getCachedCredentials();
    return Boolean(token && chatId);
  }

  /** Отправка уведомления о новой заявке. Возвращает true, если сообщение ушло успешно. */
  async notifyNewRequest(row: DbRequest): Promise<boolean> {
    const { token, chatId } = await this.getCachedCredentials();
    if (!token || !chatId) {
      return false;
    }

    const typeLabel = this.typeRu(row.type);
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
    const url = `https://api.telegram.org/bot${token}/sendMessage`;
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text,
          parse_mode: 'HTML',
          disable_web_page_preview: true,
        }),
      });
      if (!res.ok) {
        const body = await res.text().catch(() => '');
        this.logger.warn(`Telegram sendMessage failed: ${res.status} ${body}`);
        return false;
      }
      return true;
    } catch (e) {
      this.logger.warn(`Telegram sendMessage error: ${e instanceof Error ? e.message : String(e)}`);
      return false;
    }
  }

  private typeRu(t: RequestType): string {
    const map: Record<RequestType, string> = {
      CONSULTATION: 'Консультация',
      MORTGAGE: 'Ипотека',
      CALLBACK: 'Обратный звонок',
      SELECTION: 'Подбор',
      CONTACT: 'Контакты',
    };
    return map[t] ?? t;
  }
}
