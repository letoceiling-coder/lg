/**
 * Загружается первым из main.ts до NestFactory — инициализация Sentry для API.
 * @see https://docs.sentry.io/platforms/javascript/guides/nestjs/
 */
import * as Sentry from '@sentry/nestjs';

const dsn = (process.env.SENTRY_DSN_API ?? process.env.SENTRY_DSN ?? '').trim();
const enabled = Boolean(dsn);

Sentry.init({
  dsn: dsn || undefined,
  enabled,
  environment: process.env.SENTRY_ENVIRONMENT ?? process.env.NODE_ENV ?? 'development',
  tracesSampleRate: Math.min(1, Math.max(0, Number(process.env.SENTRY_TRACES_SAMPLE_RATE ?? '0.1') || 0.1)),
  debug: process.env.SENTRY_DEBUG === '1',
});
