import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiGet } from '@/lib/api';
import { loadYandexMapsScript } from '@/lib/yandex-maps-loader';

/**
 * Загружает конфиг с API и скрипт Yandex Maps (один раз на вкладку).
 */
export function useYandexMapsReady() {
  const [ready, setReady] = useState(false);
  const cfg = useQuery({
    queryKey: ['content', 'maps-config'],
    queryFn: () => apiGet<{ apiKey: string | null }>('/content/maps-config'),
    staleTime: 300_000,
  });

  useEffect(() => {
    if (cfg.isPending) return;
    const key = cfg.isError ? null : (cfg.data?.apiKey ?? null);
    let cancelled = false;
    void loadYandexMapsScript(key)
      .then(() => {
        if (!cancelled) setReady(true);
      })
      .catch(() => {
        if (!cancelled) setReady(false);
      });
    return () => {
      cancelled = true;
    };
  }, [cfg.isPending, cfg.isError, cfg.data?.apiKey]);

  return {
    ready,
    isLoading: cfg.isPending || !ready,
    configError: cfg.isError,
  };
}
