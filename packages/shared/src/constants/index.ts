export const API_PREFIX = '/api/v1';

export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

export const TRENDAGENT_REGIONS = ['msk', 'spb', 'krd', 'ekb', 'nsk', 'kzn'] as const;
export type TrendAgentRegion = (typeof TRENDAGENT_REGIONS)[number];

export const CURRENCY_DEFAULT = 'RUB';

export const JWT_ACCESS_EXPIRES_DEFAULT = '15m';
export const JWT_REFRESH_EXPIRES_DEFAULT = '30d';

export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB
export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'];
