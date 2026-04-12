import { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import type { UserProfile, UserRole } from '@/shared/types';
import {
  apiPost,
  apiGet,
  setTokens,
  clearTokens,
  getAccessToken,
  getRefreshToken,
} from '@/lib/api';

interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

interface MeResponse {
  id: string;
  email: string | null;
  phone: string | null;
  fullName: string | null;
  role: string;
  telegramUsername?: string | null;
  /** Есть привязанный Telegram (даже без публичного @username) */
  telegramLinked?: boolean;
  isActive: boolean;
}

interface AuthState {
  isAuthenticated: boolean;
  user: UserProfile | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  loginWithTelegram: (payload: Record<string, unknown>) => Promise<void>;
  linkTelegram: (payload: Record<string, unknown>) => Promise<void>;
  linkEmail: (email: string, password: string) => Promise<void>;
  register: (data: { name: string; phone: string; email: string; password: string; role: 'client' | 'agent' }) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export const AuthProvider = AuthContext.Provider;

function meToProfile(me: MeResponse): UserProfile {
  const email = me.email ?? null;
  const display =
    me.fullName?.trim() ||
    (email ? email : me.telegramUsername ? `@${me.telegramUsername}` : 'Пользователь');
  return {
    id: me.id,
    name: display,
    phone: me.phone || '',
    email,
    role: me.role as UserRole,
    telegramUsername: me.telegramUsername ?? null,
    telegramLinked:
      me.telegramLinked ??
      !!(me.telegramUsername && String(me.telegramUsername).trim()),
  };
}

export function useAuthState(): AuthState {
  const [user, setUser] = useState<UserProfile | null>(() => {
    try {
      const stored = localStorage.getItem('lg_user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(() => !!getAccessToken());
  const initDone = useRef(false);

  useEffect(() => {
    if (initDone.current) return;
    initDone.current = true;
    const token = getAccessToken();
    if (!token) { setLoading(false); return; }
    apiGet<MeResponse>('/auth/me')
      .then((me) => {
        const profile = meToProfile(me);
        setUser(profile);
        localStorage.setItem('lg_user', JSON.stringify(profile));
      })
      .catch(async () => {
        const rt = getRefreshToken();
        if (rt) {
          try {
            const tokens = await apiPost<AuthTokens>('/auth/refresh', { refreshToken: rt });
            setTokens(tokens.accessToken, tokens.refreshToken);
            const me = await apiGet<MeResponse>('/auth/me');
            const profile = meToProfile(me);
            setUser(profile);
            localStorage.setItem('lg_user', JSON.stringify(profile));
          } catch {
            clearTokens();
            setUser(null);
            localStorage.removeItem('lg_user');
          }
        } else {
          clearTokens();
          setUser(null);
          localStorage.removeItem('lg_user');
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const tokens = await apiPost<AuthTokens>('/auth/login', { email, password });
    setTokens(tokens.accessToken, tokens.refreshToken);
    const me = await apiGet<MeResponse>('/auth/me');
    const profile = meToProfile(me);
    setUser(profile);
    localStorage.setItem('lg_user', JSON.stringify(profile));
  }, []);

  const loginWithTelegram = useCallback(async (payload: Record<string, unknown>) => {
    const body: Record<string, string> = {};
    for (const [k, v] of Object.entries(payload)) {
      if (v === undefined || v === null) continue;
      body[k] = typeof v === 'string' ? v : String(v);
    }
    const tokens = await apiPost<AuthTokens>('/auth/telegram', body);
    setTokens(tokens.accessToken, tokens.refreshToken);
    const me = await apiGet<MeResponse>('/auth/me');
    const profile = meToProfile(me);
    setUser(profile);
    localStorage.setItem('lg_user', JSON.stringify(profile));
  }, []);

  const linkTelegram = useCallback(async (payload: Record<string, unknown>) => {
    const body: Record<string, string> = {};
    for (const [k, v] of Object.entries(payload)) {
      if (v === undefined || v === null) continue;
      body[k] = typeof v === 'string' ? v : String(v);
    }
    const tokens = await apiPost<AuthTokens>('/auth/link-telegram', body);
    setTokens(tokens.accessToken, tokens.refreshToken);
    const me = await apiGet<MeResponse>('/auth/me');
    const profile = meToProfile(me);
    setUser(profile);
    localStorage.setItem('lg_user', JSON.stringify(profile));
  }, []);

  const linkEmail = useCallback(async (email: string, password: string) => {
    const tokens = await apiPost<AuthTokens>('/auth/link-email', { email, password });
    setTokens(tokens.accessToken, tokens.refreshToken);
    const me = await apiGet<MeResponse>('/auth/me');
    const profile = meToProfile(me);
    setUser(profile);
    localStorage.setItem('lg_user', JSON.stringify(profile));
  }, []);

  const register = useCallback(async (_data: { name: string; phone: string; email: string; password: string; role: 'client' | 'agent' }) => {
    // TODO: implement when POST /auth/register is available on backend
    throw new Error('Регистрация пока недоступна');
  }, []);

  const logout = useCallback(async () => {
    try { await apiPost('/auth/logout', {}); } catch { /* ignore */ }
    clearTokens();
    setUser(null);
    localStorage.removeItem('lg_user');
  }, []);

  return {
    isAuthenticated: !!user,
    user,
    loading,
    login,
    loginWithTelegram,
    linkTelegram,
    linkEmail,
    register,
    logout,
  };
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be inside AuthProvider');
  return ctx;
}
