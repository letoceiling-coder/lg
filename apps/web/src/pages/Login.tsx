import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Lock, Eye, EyeOff, UserCircle2 } from 'lucide-react';
import Header from '@/redesign/components/RedesignHeader';
import FooterSection from '@/components/FooterSection';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/shared/hooks/useAuth';
import type { UserRole } from '@/shared/types';
import { TelegramLoginButton } from '@/components/TelegramLoginButton';
import { apiPost } from '@/lib/api';

const ADMIN_ROLES: UserRole[] = ['admin', 'editor', 'manager', 'agent'];

function pickRedirectTarget(
  search: string,
  state: unknown,
  role: UserRole | null,
): string {
  const params = new URLSearchParams(search);
  const next = params.get('next');
  if (next && next.startsWith('/')) return next;
  const fromState = (state as { from?: { pathname?: string } } | null)?.from?.pathname;
  if (fromState && fromState !== '/login') return fromState;
  if (role && ADMIN_ROLES.includes(role)) return '/admin';
  return '/';
}

const Login = () => {
  const { login, isAuthenticated, user, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [showPassword, setShowPassword] = useState(false);
  const [loginId, setLoginId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [tgError, setTgError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [tgCode, setTgCode] = useState('');
  const [tgCodeMessage, setTgCodeMessage] = useState('');
  const [tgCodeLoading, setTgCodeLoading] = useState(false);

  const target = useMemo(
    () => pickRedirectTarget(location.search, location.state, user?.role ?? null),
    [location.search, location.state, user?.role],
  );

  const roleErrorVisible = useMemo(() => {
    const params = new URLSearchParams(location.search);
    return params.get('error') === 'role';
  }, [location.search]);

  useEffect(() => {
    if (loading) return;
    if (isAuthenticated) {
      navigate(target, { replace: true });
    }
  }, [isAuthenticated, loading, navigate, target]);


  const requestTelegramCode = async () => {
    setTgCode('');
    setTgCodeMessage('');
    const trimmed = loginId.trim();
    if (!trimmed || !password.trim()) {
      setTgCodeMessage('Укажите email/телефон и пароль, затем запросите код.');
      return;
    }

    const body = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)
      ? { email: trimmed, password }
      : { phone: trimmed, password };

    try {
      setTgCodeLoading(true);
      const response = await apiPost<{ code: string; expiresAt: string }>('/auth/telegram/code', body);
      setTgCode(response.code);
      setTgCodeMessage(`Код действует 10 минут. Введите в боте: /auth ${response.code}`);
    } catch (err: unknown) {
      setTgCodeMessage(err instanceof Error ? err.message : 'Не удалось получить код');
    } finally {
      setTgCodeLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await login(loginId, password);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Ошибка входа';
      try {
        const parsed = JSON.parse(msg);
        setError(parsed.message || msg);
      } catch {
        setError(msg);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      <div className="flex-1 flex items-center justify-center py-12 px-4">
        <div className="w-full max-w-md space-y-6">
          <div className="text-center space-y-2">
            <h1 className="text-2xl font-bold">Вход в аккаунт</h1>
            <p className="text-sm text-muted-foreground">Войдите, чтобы продолжить</p>
          </div>

          {roleErrorVisible && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive text-center">
              Недостаточно прав для запрошенной страницы. Войдите под учётной записью с нужной ролью.
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Email или телефон</label>
              <div className="relative">
                <UserCircle2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type="text"
                  inputMode="email"
                  autoComplete="username"
                  placeholder="mail@example.com или +7 900 123-45-67"
                  value={loginId}
                  onChange={e => setLoginId(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Пароль</label>
                <Link to="/forgot-password" className="text-xs text-primary hover:underline">Забыли пароль?</Link>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="pl-10 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            {error && (
              <p className="text-sm text-destructive text-center">{error}</p>
            )}
            <Button type="submit" className="w-full rounded-full" disabled={submitting}>
              {submitting ? 'Вход…' : 'Войти'}
            </Button>
          </form>

          <div className="relative flex items-center gap-4">
            <div className="flex-1 h-px bg-border" />
            <span className="text-xs text-muted-foreground">или</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          {tgError && (
            <p className="text-sm text-destructive text-center">{tgError}</p>
          )}

          <Button
            variant="outline"
            className="w-full rounded-full"
            onClick={requestTelegramCode}
            disabled={tgCodeLoading}
          >
            {tgCodeLoading ? 'Запрос кода…' : 'Получить код для Telegram-бота'}
          </Button>

          {tgCode ? (
            <div className="rounded-lg border border-primary/30 bg-primary/5 px-4 py-3 text-center">
              <p className="text-xs text-muted-foreground">Код для команды /auth:</p>
              <p className="text-2xl font-bold tracking-[0.3em]">{tgCode}</p>
            </div>
          ) : null}

          {tgCodeMessage ? (
            <p className="text-xs text-muted-foreground text-center">{tgCodeMessage}</p>
          ) : null}
          <TelegramLoginButton
            className="w-full"
            onSuccess={() => {
              setTgError('');
            }}
            onError={(msg) => setTgError(msg)}
          />

          <p className="text-center text-sm text-muted-foreground">
            Нет аккаунта?{' '}
            <Link to="/register" className="text-primary hover:underline font-medium">Зарегистрироваться</Link>
          </p>
        </div>
      </div>
      <FooterSection />
    </div>
  );
};

export default Login;
