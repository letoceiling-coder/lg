module.exports = {
  apps: [
    {
      name: 'lg-api',
      cwd: '/var/www/lg/apps/api',
      script: 'dist/main.js',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        API_PORT: 3000,
        API_PREFIX: '/api/v1',
        DATABASE_URL: 'postgresql://lg_admin:lg_1d3d85e6a0e314e2a5f4edb7@localhost:5432/lg_production',
        REDIS_URL: 'redis://127.0.0.1:6379',
        JWT_ACCESS_SECRET: 'livegrid-access-secret-change-in-production',
        JWT_REFRESH_SECRET: 'livegrid-refresh-secret-change-in-production',
        TRENDAGENT_BASE_URL: 'https://dataout.trendagent.ru',
        TRENDAGENT_DEFAULT_REGION: 'msk',
        /** Локальные JSON вместо HTTP (путь к корню data: .../TrendAgent/data) */
        FEED_LOCAL_DIR: '',
        /** true — не регистрировать BullMQ cron (если импорт только shell-cron) */
        FEED_IMPORT_DISABLE_REPEAT: '',
        CORS_ORIGINS: 'https://lg.pfrpro.com,http://localhost:5173,http://localhost:5174',
      },
      max_memory_restart: '1G',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      error_file: '/var/log/lg/api-error.log',
      out_file: '/var/log/lg/api-out.log',
      merge_logs: true,
    },
  ],
};
