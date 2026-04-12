import { createHash, createHmac } from 'crypto';

/**
 * Проверка подписи Telegram Login Widget.
 * @see https://core.telegram.org/widgets/login#checking-authorization
 */
export function verifyTelegramLoginWidget(
  data: Record<string, string>,
  botToken: string,
): boolean {
  const hash = data.hash;
  if (!hash || !botToken) return false;

  const dataCheckString = Object.entries(data)
    .filter(([k]) => k !== 'hash')
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join('\n');

  const secretKey = createHash('sha256').update(botToken).digest();
  const computed = createHmac('sha256', secretKey).update(dataCheckString).digest('hex');
  return computed === hash;
}
