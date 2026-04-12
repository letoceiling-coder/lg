/**
 * Базовый клиент к NestJS API.
 * В dev Vite проксирует `/api` → `http://127.0.0.1:3000`.
 * В prod запросы идут на тот же origin (nginx → Node).
 */
const API_PREFIX = '/api/v1';

export function apiUrl(path: string): string {
  const p = path.startsWith('/') ? path : `/${path}`;
  return `${API_PREFIX}${p}`;
}

/* ─── token storage (in-memory + localStorage backup) ─── */

const TOKEN_KEY = 'lg_access_token';
const REFRESH_KEY = 'lg_refresh_token';

let _accessToken: string | null = localStorage.getItem(TOKEN_KEY);

export function getAccessToken(): string | null { return _accessToken; }

export function setTokens(access: string, refresh: string) {
  _accessToken = access;
  localStorage.setItem(TOKEN_KEY, access);
  localStorage.setItem(REFRESH_KEY, refresh);
}

export function clearTokens() {
  _accessToken = null;
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_KEY);
}

export function getRefreshToken(): string | null {
  return localStorage.getItem(REFRESH_KEY);
}

/* ─── auth headers helper ─── */

function authHeaders(extra?: HeadersInit): Record<string, string> {
  const h: Record<string, string> = { Accept: 'application/json' };
  if (_accessToken) h['Authorization'] = `Bearer ${_accessToken}`;
  if (extra) {
    const entries = extra instanceof Headers ? [...extra.entries()] : Object.entries(extra);
    for (const [k, v] of entries) h[k] = v as string;
  }
  return h;
}

/* ─── fetch wrappers ─── */

export async function apiGet<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(apiUrl(path), {
    credentials: 'include',
    ...init,
    headers: authHeaders(init?.headers),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new ApiError(res.status, text || `${res.status} ${res.statusText}`);
  }
  return res.json() as Promise<T>;
}

/** Как {@link apiGet}, но для 404 возвращает `null` (остальные ошибки — throw). */
export async function apiGetOrNull<T>(path: string, init?: RequestInit): Promise<T | null> {
  const res = await fetch(apiUrl(path), {
    credentials: 'include',
    ...init,
    headers: authHeaders(init?.headers),
  });
  if (res.status === 404) return null;
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new ApiError(res.status, text || `${res.status} ${res.statusText}`);
  }
  return res.json() as Promise<T>;
}

export async function apiPost<T>(path: string, body?: unknown, init?: RequestInit): Promise<T> {
  const res = await fetch(apiUrl(path), {
    method: 'POST',
    credentials: 'include',
    ...init,
    headers: { ...authHeaders(init?.headers), 'Content-Type': 'application/json' },
    body: body != null ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new ApiError(res.status, text || `${res.status} ${res.statusText}`);
  }
  return res.json() as Promise<T>;
}

export async function apiPut<T>(path: string, body?: unknown, init?: RequestInit): Promise<T> {
  const res = await fetch(apiUrl(path), {
    method: 'PUT',
    credentials: 'include',
    ...init,
    headers: { ...authHeaders(init?.headers), 'Content-Type': 'application/json' },
    body: body != null ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new ApiError(res.status, text || `${res.status} ${res.statusText}`);
  }
  return res.json() as Promise<T>;
}

export async function apiPatch<T>(path: string, body?: unknown, init?: RequestInit): Promise<T> {
  const res = await fetch(apiUrl(path), {
    method: 'PATCH',
    credentials: 'include',
    ...init,
    headers: { ...authHeaders(init?.headers), 'Content-Type': 'application/json' },
    body: body != null ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new ApiError(res.status, text || `${res.status} ${res.statusText}`);
  }
  return res.json() as Promise<T>;
}

export async function apiDelete(path: string, init?: RequestInit): Promise<void> {
  const res = await fetch(apiUrl(path), {
    method: 'DELETE',
    credentials: 'include',
    ...init,
    headers: authHeaders(init?.headers),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new ApiError(res.status, text || `${res.status} ${res.statusText}`);
  }
}

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}
