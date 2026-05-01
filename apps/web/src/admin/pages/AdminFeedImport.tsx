import { useEffect, useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Download, Loader2, Play, RefreshCw, CheckCircle2, XCircle, Clock, FileJson, Square, Trash2 } from 'lucide-react';
import { apiDelete, apiGet, apiPost } from '@/lib/api';
import { useAuth } from '@/shared/hooks/useAuth';

interface ImportHistoryRow {
  id: number;
  regionCode?: string | null;
  region?: {
    code?: string | null;
    name?: string | null;
  } | null;
  status: string;
  startedAt: string | null;
  createdAt?: string | null;
  finishedAt: string | null;
  blocksCreated?: number | null;
  blocksUpdated?: number | null;
  buildingsCreated?: number | null;
  buildingsUpdated?: number | null;
  listingsCreated?: number | null;
  listingsUpdated?: number | null;
  stats?: {
    blocks_upserted?: number;
    buildings_upserted?: number;
    apartments_upserted?: number;
  } | null;
  errorMessage: string | null;
}

interface Progress {
  step: string;
  percent: number;
  detail?: string;
}

interface RegionOption {
  id: number;
  code: string;
  name: string;
}

interface FeedSourceRow {
  id: number;
  code: string;
  name: string;
  enabled: boolean;
  baseUrl: string | null;
  canImport: boolean;
  reason: string | null;
  files: { name: string; required: boolean; url: string | null }[];
}

const statusIcon: Record<string, typeof CheckCircle2> = {
  COMPLETED: CheckCircle2,
  FAILED: XCircle,
  IN_PROGRESS: Loader2,
  RUNNING: Loader2,
  PENDING: Clock,
};

const statusLabel: Record<string, string> = {
  COMPLETED: 'Завершён',
  FAILED: 'Ошибка',
  IN_PROGRESS: 'В процессе',
  RUNNING: 'В процессе',
  PENDING: 'Ожидает',
};

const statusColor: Record<string, string> = {
  COMPLETED: 'text-green-600',
  FAILED: 'text-destructive',
  IN_PROGRESS: 'text-amber-600',
  RUNNING: 'text-amber-600',
  PENDING: 'text-muted-foreground',
};

function historyRegionCode(row: ImportHistoryRow): string {
  return (row.regionCode ?? row.region?.code ?? '—').toString();
}

function historyStartedAt(row: ImportHistoryRow): string | null {
  return row.startedAt ?? row.createdAt ?? null;
}

function formatDateTime(value: string | null | undefined, options: Intl.DateTimeFormatOptions): string {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('ru-RU', options);
}

function statValue(row: ImportHistoryRow, direct: 'blocksCreated' | 'blocksUpdated' | 'buildingsCreated' | 'buildingsUpdated' | 'listingsCreated' | 'listingsUpdated'): number {
  const directValue = row[direct];
  if (typeof directValue === 'number') return directValue;
  if (direct === 'blocksUpdated') return row.stats?.blocks_upserted ?? 0;
  if (direct === 'buildingsUpdated') return row.stats?.buildings_upserted ?? 0;
  if (direct === 'listingsUpdated') return row.stats?.apartments_upserted ?? 0;
  return 0;
}

export default function AdminFeedImport() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const [region, setRegion] = useState('all');
  const [selectedFeedCodes, setSelectedFeedCodes] = useState<string[]>([]);
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const canTrigger = user?.role === 'admin';

  const { data: regions = [] } = useQuery({
    queryKey: ['regions'],
    queryFn: () => apiGet<RegionOption[]>('/regions'),
    staleTime: 60_000,
  });

  const { data: sources = [] } = useQuery({
    queryKey: ['admin', 'feed-import', 'sources'],
    queryFn: () => apiGet<FeedSourceRow[]>('/admin/feed-import/sources'),
    staleTime: 30_000,
  });

  const importableSourceCodes = useMemo(
    () => sources.filter((s) => s.canImport).map((s) => s.code),
    [sources],
  );

  useEffect(() => {
    setSelectedFeedCodes((prev) => {
      const allowed = new Set(importableSourceCodes);
      const next = prev.filter((code) => allowed.has(code));
      return next.length ? next : importableSourceCodes;
    });
  }, [importableSourceCodes]);

  const selectedRegionCode = useMemo(() => {
    if (region === 'all') return null;
    const selected = regions.find((r) => r.code === region);
    if (!selected) return null;
    return selected.code.toLowerCase();
  }, [region, regions]);

  const { data: progress, isFetching: progressFetching } = useQuery({
    queryKey: ['admin', 'feed-import', 'progress'],
    queryFn: () => apiGet<Progress>('/admin/feed-import/progress'),
    refetchInterval: 3000,
    staleTime: 2000,
  });

  const { data: history, isLoading: historyLoading } = useQuery({
    queryKey: ['admin', 'feed-import', 'history'],
    queryFn: () => apiGet<{ data: ImportHistoryRow[] }>('/admin/feed-import/history?per_page=20'),
    staleTime: 10_000,
  });

  const { data: diagnostics, isFetching: diagLoading, refetch: refetchDiag } = useQuery({
    queryKey: ['admin', 'feed-import', 'diagnostics', selectedRegionCode],
    queryFn: () =>
      apiGet<unknown>(
        `/admin/feed-import/diagnostics?region=${encodeURIComponent(selectedRegionCode ?? 'msk')}`,
      ),
    enabled: showDiagnostics && selectedRegionCode != null,
    staleTime: 30_000,
  });

  const triggerMutation = useMutation({
    mutationFn: () =>
      apiPost('/admin/feed-import/trigger-selected', { regions: selectedFeedCodes }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'feed-import'] });
    },
  });

  const stopAllMutation = useMutation({
    mutationFn: () => apiPost('/admin/feed-import/stop', {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'feed-import'] });
    },
  });

  const stopBatchMutation = useMutation({
    mutationFn: (id: number) => apiPost(`/admin/feed-import/history/${id}/stop`, {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'feed-import'] });
    },
  });

  const deleteBatchMutation = useMutation({
    mutationFn: (id: number) => apiDelete(`/admin/feed-import/history/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'feed-import'] });
    },
  });

  const refreshCacheMutation = useMutation({
    mutationFn: () => apiPost('/admin/feed-import/refresh-cache', {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'feed-import'] });
    },
  });

  const isRunning =
    progress?.step !== undefined &&
    !['idle', 'Failed', 'Completed'].includes(progress.step) &&
    progress.percent < 100;
  const rows = history?.data ?? [];
  const latest = rows[0];
  const selectedCount = selectedFeedCodes.length;

  return (
    <div className="p-6 max-w-5xl">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Download className="w-6 h-6 text-primary" />
          <h1 className="text-2xl font-bold">Импорт фидов</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={region}
            onChange={(e) => {
              setRegion(e.target.value);
              setShowDiagnostics(false);
            }}
            className="h-10 rounded-xl border bg-background px-3 text-sm"
          >
            <option value="all">Все включённые регионы</option>
            {regions.map((r) => (
              <option key={r.id} value={r.code}>
                {r.name} ({r.code})
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => {
              if (selectedRegionCode == null) return;
              setShowDiagnostics(true);
              void refetchDiag();
            }}
            disabled={selectedRegionCode == null}
            className="inline-flex items-center gap-2 border bg-background px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-muted transition-colors"
          >
            {diagLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileJson className="w-4 h-4" />}
            Отчёт фид vs БД
          </button>
          <button
            onClick={() => triggerMutation.mutate()}
            disabled={triggerMutation.isPending || isRunning || !canTrigger || selectedCount === 0}
            className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
            title={!canTrigger ? 'Запуск импорта доступен только администратору' : selectedCount === 0 ? 'Выберите хотя бы один доступный фид' : undefined}
          >
            {triggerMutation.isPending || isRunning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
            {isRunning ? 'Импорт идёт…' : `Запустить (${selectedCount})`}
          </button>
          <button
            onClick={() => stopAllMutation.mutate()}
            disabled={stopAllMutation.isPending || !isRunning || !canTrigger}
            className="inline-flex items-center gap-2 border border-destructive/40 bg-background px-4 py-2.5 rounded-xl text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-50"
            title={!canTrigger ? 'Остановка доступна только администратору' : undefined}
          >
            {stopAllMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Square className="w-4 h-4" />}
            Остановить
          </button>
          <button
            onClick={() => refreshCacheMutation.mutate()}
            disabled={refreshCacheMutation.isPending || !canTrigger}
            className="inline-flex items-center gap-2 border bg-background px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-muted transition-colors disabled:opacity-50"
            title={!canTrigger ? 'Обновление кеша доступно только администратору' : undefined}
          >
            {refreshCacheMutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4" />
            )}
            Обновить кеш каталога
          </button>
        </div>
      </div>

      <div className="bg-background border rounded-2xl p-4 mb-6">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div>
            <h2 className="font-semibold">Доступные фиды по регионам</h2>
            <p className="text-xs text-muted-foreground mt-1">
              Отмечайте только регионы, для которых реально настроен фид. Сейчас доступна Москва.
            </p>
          </div>
          <span className="text-xs rounded-full bg-muted px-2 py-1 text-muted-foreground">
            Выбрано: {selectedCount}
          </span>
        </div>
        <div className="space-y-2">
          {sources.map((source) => {
            const checked = selectedFeedCodes.includes(source.code);
            return (
              <label
                key={source.id}
                className={`flex items-start gap-3 rounded-xl border p-3 text-sm ${source.canImport ? 'cursor-pointer hover:bg-muted/30' : 'opacity-60 bg-muted/20'}`}
              >
                <input
                  type="checkbox"
                  className="mt-1"
                  checked={checked}
                  disabled={!source.canImport}
                  onChange={(e) => {
                    setSelectedFeedCodes((prev) =>
                      e.target.checked
                        ? Array.from(new Set([...prev, source.code]))
                        : prev.filter((code) => code !== source.code),
                    );
                  }}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{source.name}</span>
                    <span className="text-xs uppercase text-muted-foreground">{source.code}</span>
                    {source.canImport ? (
                      <span className="text-xs text-green-700">фид настроен</span>
                    ) : (
                      <span className="text-xs text-destructive">{source.reason ?? 'недоступен'}</span>
                    )}
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground break-all">
                    {source.baseUrl ?? 'URL фида не задан'}
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {source.files.map((file) => (
                      <span key={file.name} className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
                        {file.name}.json
                      </span>
                    ))}
                  </div>
                </div>
              </label>
            );
          })}
        </div>
      </div>

      {showDiagnostics && (
        <div className="bg-muted/30 border rounded-2xl p-4 mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold">
              GET /admin/feed-import/diagnostics?region={selectedRegionCode}
            </span>
            <button
              type="button"
              className="text-xs text-primary hover:underline"
              onClick={() => refetchDiag()}
            >
              Обновить
            </button>
          </div>
          {diagLoading && !diagnostics ? (
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          ) : (
            <pre className="text-xs overflow-x-auto max-h-[480px] overflow-y-auto whitespace-pre-wrap break-words">
              {JSON.stringify(diagnostics, null, 2)}
            </pre>
          )}
        </div>
      )}

      {/* Progress bar */}
      {isRunning && progress && (
        <div className="bg-background border rounded-2xl p-5 mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">{progress.step}</span>
            <span className="text-sm text-muted-foreground">{progress.percent}%</span>
          </div>
          <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
            <div className="h-full bg-primary rounded-full transition-all duration-500" style={{ width: `${progress.percent}%` }} />
          </div>
          {progress.detail && <p className="text-xs text-muted-foreground mt-2">{progress.detail}</p>}
        </div>
      )}

      {latest ? (
        <div className="bg-background border rounded-2xl p-4 mb-6 grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
          <div>
            <p className="text-xs text-muted-foreground">Последний импорт</p>
            <p className="font-medium">
              {formatDateTime(historyStartedAt(latest), {
                day: '2-digit',
                month: '2-digit',
                year: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Регион / статус</p>
            <p className="font-medium">{historyRegionCode(latest).toUpperCase()} · {statusLabel[latest.status] ?? latest.status}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Лог ошибки</p>
            <p className={latest.errorMessage ? 'text-destructive font-medium' : 'text-muted-foreground'}>
              {latest.errorMessage ?? 'Ошибок нет'}
            </p>
          </div>
        </div>
      ) : null}

      {/* History */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold">История импортов</h2>
        <button
          onClick={() => qc.invalidateQueries({ queryKey: ['admin', 'feed-import', 'history'] })}
          className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${progressFetching ? 'animate-spin' : ''}`} /> Обновить
        </button>
      </div>

      {historyLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      )}

      {!historyLoading && rows.length === 0 && (
        <div className="bg-background border rounded-2xl p-8 text-center text-sm text-muted-foreground">
          Импортов пока не было
        </div>
      )}

      {rows.length > 0 && (
        <div className="bg-background border rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs text-muted-foreground">
                  <th className="px-4 py-3 font-medium">Статус</th>
                  <th className="px-4 py-3 font-medium">Регион</th>
                  <th className="px-4 py-3 font-medium">Старт</th>
                  <th className="px-4 py-3 font-medium">Финиш</th>
                  <th className="px-4 py-3 font-medium text-right">ЖК</th>
                  <th className="px-4 py-3 font-medium text-right">Корпуса</th>
                  <th className="px-4 py-3 font-medium text-right">Квартиры</th>
                  <th className="px-4 py-3 font-medium">Ошибка</th>
                  <th className="px-4 py-3 font-medium text-right">Действия</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {rows.map(r => {
                  const Icon = statusIcon[r.status] ?? Clock;
                  return (
                    <tr key={r.id} className="hover:bg-muted/50 transition-colors">
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${statusColor[r.status] ?? ''}`}>
                          <Icon className={`w-3.5 h-3.5 ${r.status === 'IN_PROGRESS' || r.status === 'RUNNING' ? 'animate-spin' : ''}`} />
                          {statusLabel[r.status] ?? r.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs uppercase">{historyRegionCode(r)}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                        {formatDateTime(historyStartedAt(r), { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                        {formatDateTime(r.finishedAt, { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="px-4 py-3 text-right text-xs">
                        <span className="text-green-600">+{statValue(r, 'blocksCreated')}</span> / <span className="text-amber-600">{statValue(r, 'blocksUpdated')}</span>
                      </td>
                      <td className="px-4 py-3 text-right text-xs">
                        <span className="text-green-600">+{statValue(r, 'buildingsCreated')}</span> / <span className="text-amber-600">{statValue(r, 'buildingsUpdated')}</span>
                      </td>
                      <td className="px-4 py-3 text-right text-xs">
                        <span className="text-green-600">+{statValue(r, 'listingsCreated')}</span> / <span className="text-amber-600">{statValue(r, 'listingsUpdated')}</span>
                      </td>
                      <td className="px-4 py-3 text-xs text-destructive max-w-[320px] whitespace-pre-wrap break-words" title={r.errorMessage ?? ''}>
                        {r.errorMessage ?? '—'}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="inline-flex items-center gap-1">
                          {r.status === 'RUNNING' || r.status === 'PENDING' ? (
                            <button
                              type="button"
                              onClick={() => stopBatchMutation.mutate(r.id)}
                              disabled={!canTrigger || stopBatchMutation.isPending}
                              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border text-destructive hover:bg-destructive/10 disabled:opacity-50"
                              title="Остановить импорт"
                            >
                              <Square className="h-4 w-4" />
                            </button>
                          ) : null}
                          <button
                            type="button"
                            onClick={() => {
                              if (window.confirm(`Удалить запрос импорта #${r.id}?`)) deleteBatchMutation.mutate(r.id);
                            }}
                            disabled={!canTrigger || deleteBatchMutation.isPending || r.status === 'RUNNING'}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border text-muted-foreground hover:text-destructive hover:bg-destructive/10 disabled:opacity-50"
                            title={r.status === 'RUNNING' ? 'Сначала остановите импорт' : 'Удалить запрос'}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
