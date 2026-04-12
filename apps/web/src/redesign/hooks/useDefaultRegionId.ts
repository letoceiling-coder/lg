import { useCallback, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiGet } from '@/lib/api';

export type RegionRow = { id: number; code: string; name?: string; lastImportedAt?: string | null };

const STORAGE_KEY = 'lg_region_id';

function readStoredId(): number | null {
  try {
    const s = sessionStorage.getItem(STORAGE_KEY);
    if (!s) return null;
    const n = parseInt(s, 10);
    return Number.isFinite(n) ? n : null;
  } catch {
    return null;
  }
}

function pickDefaultId(rows: RegionRow[]): number | undefined {
  if (!rows.length) return undefined;
  const msk =
    rows.find((r) => (r.code ?? '').toLowerCase() === 'msk') ??
    rows.find((r) => r.name?.trim() === 'Москва');
  return msk?.id ?? rows[0]?.id;
}

/**
 * Регион для публичных запросов: из sessionStorage (если включён в /regions), иначе Москва (msk), иначе первый регион.
 * `setStoredRegionId(null)` — сброс на Москву по умолчанию.
 */
export function useDefaultRegionId() {
  const [storageRev, setStorageRev] = useState(0);

  const base = useQuery({
    queryKey: ['regions', storageRev],
    queryFn: () => apiGet<RegionRow[]>('/regions'),
    staleTime: 60 * 60 * 1000,
  });

  const rows = base.data;

  const data = useMemo(() => {
    if (!rows?.length) return undefined;
    const stored = readStoredId();
    if (stored != null && rows.some((r) => r.id === stored)) return stored;
    return pickDefaultId(rows);
  }, [rows, storageRev]);

  const setStoredRegionId = useCallback((id: number | null) => {
    try {
      if (id == null) sessionStorage.removeItem(STORAGE_KEY);
      else sessionStorage.setItem(STORAGE_KEY, String(id));
    } catch {
      /* ignore */
    }
    setStorageRev((n) => n + 1);
  }, []);

  return { ...base, data, rows, setStoredRegionId };
}
