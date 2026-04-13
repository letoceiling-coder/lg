import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Globe, Loader2, CheckCircle2, Plus, Trash2 } from 'lucide-react';
import { apiGet, apiPatch, apiPost, apiDelete } from '@/lib/api';
import { useAuth } from '@/shared/hooks/useAuth';

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
  const { user } = useAuth();
  const canManage = user?.role === 'admin';
  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'regions'],
    queryFn: () => apiGet<FeedRegion[]>('/admin/regions'),
  });

  const [draft, setDraft] = useState<Record<number, Partial<FeedRegion>>>({});
  const [saved, setSaved] = useState(false);

  const [newCode, setNewCode] = useState('');
  const [newName, setNewName] = useState('');
  const [newBaseUrl, setNewBaseUrl] = useState('');
  const [newEnabled, setNewEnabled] = useState(true);

  const saveMutation = useMutation({
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

  const createMutation = useMutation({
    mutationFn: () =>
      apiPost<FeedRegion>('/admin/regions', {
        code: newCode.trim(),
        name: newName.trim(),
        baseUrl: newBaseUrl.trim() || null,
        isEnabled: newEnabled,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'regions'] });
      qc.invalidateQueries({ queryKey: ['regions'] });
      setNewCode('');
      setNewName('');
      setNewBaseUrl('');
      setNewEnabled(true);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiDelete(`/admin/regions/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'regions'] });
      qc.invalidateQueries({ queryKey: ['regions'] });
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
            Регионы
          </h1>
          <p className="text-sm text-muted-foreground mt-1 max-w-3xl">
            Справочник в БД: регион может существовать без фида (пустой URL). Импорт TrendAgent только
            подхватывает объекты для регионов с заданным <code className="text-xs">base_url</code>.
            Включённые регионы попадают в гео-селектор на сайте.
          </p>
        </div>
        <button
          type="button"
          onClick={() => saveMutation.mutate()}
          disabled={!canManage || saveMutation.isPending || Object.keys(draft).length === 0}
          className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
          title={!canManage ? 'Изменение регионов доступно только администратору' : undefined}
        >
          {saveMutation.isPending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : saved ? (
            <CheckCircle2 className="w-4 h-4" />
          ) : null}
          {saved ? 'Сохранено' : 'Сохранить изменения'}
        </button>
      </div>

      {(saveMutation.isError || createMutation.isError || deleteMutation.isError) && (
        <div className="bg-destructive/10 text-destructive text-sm rounded-xl p-4 mb-4">
          {saveMutation.error instanceof Error
            ? saveMutation.error.message
            : createMutation.error instanceof Error
              ? createMutation.error.message
              : deleteMutation.error instanceof Error
                ? deleteMutation.error.message
                : 'Ошибка'}
        </div>
      )}

      <div className="bg-background border rounded-2xl p-5 mb-6 space-y-4">
        <h2 className="font-semibold text-sm">Добавить регион вручную</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 items-end">
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1">Код (латиница)</label>
            <input
              className="w-full border rounded-lg px-2 py-2 bg-background font-mono text-sm"
              value={newCode}
              onChange={(e) => setNewCode(e.target.value)}
              placeholder="belgorod"
              disabled={!canManage}
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1">Название</label>
            <input
              className="w-full border rounded-lg px-2 py-2 bg-background text-sm"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Белгород"
              disabled={!canManage}
            />
          </div>
          <div className="sm:col-span-2 lg:col-span-1">
            <label className="text-xs font-medium text-muted-foreground block mb-1">
              URL фида (необязательно)
            </label>
            <input
              className="w-full border rounded-lg px-2 py-2 bg-background text-xs"
              value={newBaseUrl}
              onChange={(e) => setNewBaseUrl(e.target.value)}
              placeholder="https://… или пусто"
              disabled={!canManage}
            />
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={newEnabled}
                onChange={(e) => setNewEnabled(e.target.checked)}
                className="rounded border-input"
                disabled={!canManage}
              />
              Витрина
            </label>
            <button
              type="button"
              disabled={
                !canManage || createMutation.isPending || !newCode.trim() || !newName.trim()
              }
              onClick={() => createMutation.mutate()}
              className="inline-flex items-center gap-2 bg-secondary text-secondary-foreground px-3 py-2 rounded-xl text-sm font-medium hover:bg-secondary/80 disabled:opacity-50"
            >
              {createMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Plus className="w-4 h-4" />
              )}
              Добавить
            </button>
          </div>
        </div>
      </div>

      <div className="bg-background border rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 border-b">
            <tr>
              <th className="text-left p-3 font-medium">Код</th>
              <th className="text-left p-3 font-medium">Название</th>
              <th className="text-left p-3 font-medium">URL фида</th>
              <th className="text-center p-3 font-medium w-28">Витрина</th>
              <th className="text-right p-3 font-medium w-24"> </th>
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
                      disabled={!canManage}
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
                      disabled={!canManage}
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
                      disabled={!canManage}
                      onChange={(e) =>
                        setDraft((prev) => ({
                          ...prev,
                          [r.id]: { ...prev[r.id], isEnabled: e.target.checked },
                        }))
                      }
                      className="rounded border-input"
                    />
                  </td>
                  <td className="p-3 text-right">
                    <button
                      type="button"
                      title="Удалить (только если нет связанных данных)"
                      disabled={!canManage || deleteMutation.isPending}
                      onClick={() => {
                        if (!confirm(`Удалить регион «${d.name}» (${d.code})?`)) return;
                        deleteMutation.mutate(r.id);
                      }}
                      className="p-2 rounded-lg hover:bg-destructive/10 text-destructive disabled:opacity-40"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
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
