import { useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiGet } from '@/lib/api';
import { useAuth } from '@/shared/hooks/useAuth';
import { cn } from '@/lib/utils';

declare global {
  interface Window {
    /** Колбэк виджета Telegram Login (глобальное имя из data-onauth). */
    onTelegramAuth?: (user: Record<string, unknown>) => void;
  }
}

type Props = {
  className?: string;
  /** Доп. класс для обёртки виджета (Telegram вставляет iframe/кнопку внутрь). */
  widgetWrapClassName?: string;
  /** `login` — POST /auth/telegram; `link` — привязка к текущему аккаунту (JWT). */
  mode?: 'login' | 'link';
  onSuccess?: () => void;
  onError?: (message: string) => void;
};

export function TelegramLoginButton({
  className,
  widgetWrapClassName,
  mode = 'login',
  onSuccess,
  onError,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const onSuccessRef = useRef(onSuccess);
  const onErrorRef = useRef(onError);
  onSuccessRef.current = onSuccess;
  onErrorRef.current = onError;
  const { loginWithTelegram, linkTelegram } = useAuth();

  const { data: cfg, isLoading } = useQuery({
    queryKey: ['auth', 'telegram-widget-config'],
    queryFn: () => apiGet<{ botUsername: string | null }>('/auth/telegram-widget-config'),
    staleTime: 60_000,
  });

  useEffect(() => {
    const bot = cfg?.botUsername?.trim();
    const el = containerRef.current;
    if (!bot || !el) return undefined;

    el.innerHTML = '';
    window.onTelegramAuth = async (user: Record<string, unknown>) => {
      try {
        if (mode === 'link') {
          await linkTelegram(user);
        } else {
          await loginWithTelegram(user);
        }
        onSuccessRef.current?.();
      } catch (e) {
        let msg = e instanceof Error ? e.message : 'Ошибка входа через Telegram';
        try {
          const parsed = JSON.parse(msg);
          if (parsed?.message) msg = String(parsed.message);
        } catch {
          /* keep msg */
        }
        onErrorRef.current?.(msg);
      }
    };

    const script = document.createElement('script');
    script.async = true;
    script.src = 'https://telegram.org/js/telegram-widget.js?22';
    script.setAttribute('data-telegram-login', bot);
    script.setAttribute('data-size', 'large');
    script.setAttribute('data-radius', '8');
    script.setAttribute('data-onauth', 'onTelegramAuth(user)');
    script.setAttribute('data-request-access', 'write');
    el.appendChild(script);

    return () => {
      window.onTelegramAuth = undefined;
      el.innerHTML = '';
    };
  }, [cfg?.botUsername, loginWithTelegram, linkTelegram, mode]);

  if (isLoading) {
    return <div className={cn('text-xs text-muted-foreground py-2', className)}>Загрузка…</div>;
  }
  if (!cfg?.botUsername?.trim()) {
    return (
      <p className={cn('text-xs text-muted-foreground text-center py-1', className)}>
        Вход через Telegram недоступен: в админке задайте «Telegram Login: username бота» и токен бота.
      </p>
    );
  }

  return (
    <div className={cn(className)}>
      <div ref={containerRef} className={cn('flex justify-center min-h-[40px]', widgetWrapClassName)} />
    </div>
  );
}
