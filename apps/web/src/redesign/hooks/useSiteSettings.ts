import { useQuery } from '@tanstack/react-query';
import { apiGet } from '@/lib/api';

type SettingRow = { key: string; value: string };
type SettingsResponse = Record<string, SettingRow[]>;

/**
 * Загрузка site_settings из CMS. Возвращает map key→value.
 */
export function useSiteSettings() {
  return useQuery({
    queryKey: ['content', 'settings'],
    queryFn: () => apiGet<SettingsResponse>('/content/settings'),
    staleTime: 10 * 60_000,
    select: (grouped) => {
      const flat = new Map<string, string>();
      for (const rows of Object.values(grouped)) {
        for (const r of rows) {
          flat.set(r.key, r.value);
        }
      }
      return flat;
    },
  });
}

export function setting(map: Map<string, string> | undefined, key: string, fallback: string): string {
  return map?.get(key) || fallback;
}
