import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request as DbRequest, RequestType } from '@prisma/client';

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

  constructor(private readonly config: ConfigService) {}

  isConfigured(): boolean {
    const token = this.config.get<string>('TELEGRAM_BOT_TOKEN')?.trim();
    const chatId = this.config.get<string>('TELEGRAM_NOTIFY_CHAT_ID')?.trim();
    return Boolean(token && chatId);
  }

  /** Отправка уведомления о новой заявке. Возвращает true, если сообщение ушло успешно. */
  async notifyNewRequest(row: DbRequest): Promise<boolean> {
    const token = this.config.get<string>('TELEGRAM_BOT_TOKEN')?.trim();
    const chatId = this.config.get<string>('TELEGRAM_NOTIFY_CHAT_ID')?.trim();
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
