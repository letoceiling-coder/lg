/** Совпадает с DEPLOY_ROOT в deploy-full.sh / deploy-from-git.sh */
const deployRoot = process.env.DEPLOY_ROOT || '/var/www/lg';
const publicSiteUrl = process.env.PUBLIC_SITE_URL || 'https://lg.livegrid.ru';

module.exports = {
  apps: [
    {
      name: 'lg-api',
      cwd: `${deployRoot}/apps/api`,
      script: 'dist/main.js',
      instances: 1,
      exec_mode: 'fork',
      env: {
        PUBLIC_SITE_URL: publicSiteUrl,
        NODE_ENV: 'production',
        API_PORT: 3000,
        API_PREFIX: '/api/v1',
        DATABASE_URL: 'postgresql://lg_admin:lg_1d3d85e6a0e314e2a5f4edb7@localhost:5432/lg_production',
        REDIS_URL: 'redis://127.0.0.1:6379',
        JWT_ACCESS_SECRET: 'livegrid-access-secret-change-in-production',
        JWT_REFRESH_SECRET: 'livegrid-refresh-secret-change-in-production',
        TRENDAGENT_BASE_URL: 'https://dataout.trendagent.ru',
        TRENDAGENT_DEFAULT_REGION: 'msk',
        TRENDAGENT_REGIONS: 'msk',
        TELEGRAM_WEBHOOK_URL:
          process.env.TELEGRAM_WEBHOOK_URL || `${publicSiteUrl}/api/v1/telegram-bot/webhook`,
        SENTRY_DSN_API: process.env.SENTRY_DSN_API || process.env.SENTRY_DSN || '',
        SENTRY_ENVIRONMENT: process.env.SENTRY_ENVIRONMENT || 'production',
        SENTRY_TRACES_SAMPLE_RATE: process.env.SENTRY_TRACES_SAMPLE_RATE || '0.1',
        SENTRY_RELEASE: process.env.SENTRY_RELEASE || '',
        METRICS_BEARER_TOKEN: process.env.METRICS_BEARER_TOKEN || '',
        /** Локальные JSON вместо HTTP (путь к корню data: .../TrendAgent/data) */
        FEED_LOCAL_DIR: '',
        /** true — не регистрировать BullMQ cron (если импорт только shell-cron) */
        FEED_IMPORT_DISABLE_REPEAT: '',
        CORS_ORIGINS: 'https://lg.pfrpro.com,http://localhost:5173,http://localhost:5174',
        /** Загрузки медиатеки (Nest static /uploads/); вне репозитория, чтобы не терять при деплое */
        MEDIA_ROOT: `${deployRoot}/uploads`,
      },
      max_memory_restart: '1G',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      error_file: '/var/log/lg/api-error.log',
      out_file: '/var/log/lg/api-out.log',
      merge_logs: true,
    },
  ],
};
