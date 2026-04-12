import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Globe, Loader2, CheckCircle2 } from 'lucide-react';
import { apiGet, apiPatch } from '@/lib/api';

type FeedRegion = {
  id: number;
  code: string;
  name: string;
  baseUrl: string | null;
  isEnabled: boolean;
  lastImportedAt: string | null;
};

export default function AdminRegions() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'regions'],
    queryFn: () => apiGet<FeedRegion[]>('/admin/regions'),
  });

  const [draft, setDraft] = useState<Record<number, Partial<FeedRegion>>>({});
  const [saved, setSaved] = useState(false);

  const mutation = useMutation({
    mutationFn: async () => {
      const entries = Object.entries(draft);
      if (!entries.length) return;
      for (const [id, patch] of entries) {
        if (Object.keys(patch).length === 0) continue;
        await apiPatch<FeedRegion>(`/admin/regions/${id}`, patch);
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'regions'] });
      qc.invalidateQueries({ queryKey: ['regions'] });
      setDraft({});
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    },
  });

  const row = (r: FeedRegion) => ({ ...r, ...(draft[r.id] ?? {}) });

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Globe className="w-7 h-7 text-primary" />
            Регионы фида
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Включённые регионы попадают в список на сайте и в герой-поиск. Для «Москва и МО» включите{' '}
            <strong>Москва</strong> и при необходимости <strong>Московская область</strong> (код <code>mo</code>).
          </p>
        </div>
        <button
          type="button"
          onClick={() => mutation.mutate()}
          disabled={mutation.isPending || Object.keys(draft).length === 0}
          className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          {mutation.isPending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : saved ? (
            <CheckCircle2 className="w-4 h-4" />
          ) : null}
          {saved ? 'Сохранено' : 'Сохранить изменения'}
        </button>
      </div>

      {mutation.isError && (
        <div className="bg-destructive/10 text-destructive text-sm rounded-xl p-4 mb-4">
          {mutation.error instanceof Error ? mutation.error.message : 'Ошибка'}
        </div>
      )}

      <div className="bg-background border rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 border-b">
            <tr>
              <th className="text-left p-3 font-medium">Код</th>
              <th className="text-left p-3 font-medium">Название</th>
              <th className="text-left p-3 font-medium">URL фида</th>
              <th className="text-center p-3 font-medium w-28">Витрина</th>
            </tr>
          </thead>
          <tbody>
            {(data ?? []).map((r) => {
              const d = row(r);
              return (
                <tr key={r.id} className="border-b last:border-0">
                  <td className="p-3 font-mono text-xs">{d.code}</td>
                  <td className="p-3">
                    <input
                      className="w-full border rounded-lg px-2 py-1.5 bg-background"
                      value={d.name}
                      onChange={(e) =>
                        setDraft((prev) => ({
                          ...prev,
                          [r.id]: { ...prev[r.id], name: e.target.value },
                        }))
                      }
                    />
                  </td>
                  <td className="p-3">
                    <input
                      className="w-full border rounded-lg px-2 py-1.5 bg-background text-xs"
                      value={d.baseUrl ?? ''}
                      placeholder="https://…"
                      onChange={(e) =>
                        setDraft((prev) => ({
                          ...prev,
                          [r.id]: { ...prev[r.id], baseUrl: e.target.value || null },
                        }))
                      }
                    />
                  </td>
                  <td className="p-3 text-center">
                    <input
                      type="checkbox"
                      checked={d.isEnabled}
                      onChange={(e) =>
                        setDraft((prev) => ({
                          ...prev,
                          [r.id]: { ...prev[r.id], isEnabled: e.target.checked },
                        }))
                      }
                      className="rounded border-input"
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
