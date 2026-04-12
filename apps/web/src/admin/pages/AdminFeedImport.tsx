import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Download, Loader2, Play, RefreshCw, CheckCircle2, XCircle, Clock, FileJson } from 'lucide-react';
import { apiGet, apiPost } from '@/lib/api';

interface ImportHistoryRow {
  id: number;
  regionCode: string;
  status: string;
  startedAt: string;
  finishedAt: string | null;
  blocksCreated: number;
  blocksUpdated: number;
  buildingsCreated: number;
  buildingsUpdated: number;
  listingsCreated: number;
  listingsUpdated: number;
  errorMessage: string | null;
}

interface Progress {
  step: string;
  percent: number;
  detail?: string;
}

const statusIcon: Record<string, typeof CheckCircle2> = {
  COMPLETED: CheckCircle2,
  FAILED: XCircle,
  IN_PROGRESS: Loader2,
  PENDING: Clock,
};

const statusLabel: Record<string, string> = {
  COMPLETED: 'Завершён',
  FAILED: 'Ошибка',
  IN_PROGRESS: 'В процессе',
  PENDING: 'Ожидает',
};

const statusColor: Record<string, string> = {
  COMPLETED: 'text-green-600',
  FAILED: 'text-destructive',
  IN_PROGRESS: 'text-amber-600',
  PENDING: 'text-muted-foreground',
};

export default function AdminFeedImport() {
  const qc = useQueryClient();
  const [region] = useState('msk');
  const [showDiagnostics, setShowDiagnostics] = useState(false);

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
    queryKey: ['admin', 'feed-import', 'diagnostics', region],
    queryFn: () => apiGet<unknown>(`/admin/feed-import/diagnostics?region=${encodeURIComponent(region)}`),
    enabled: showDiagnostics,
    staleTime: 30_000,
  });

  const triggerMutation = useMutation({
    mutationFn: () => apiPost(`/admin/feed-import/trigger?region=${region}`, {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'feed-import'] });
    },
  });

  const isRunning = progress?.step !== 'idle' && progress?.step !== undefined && progress?.percent < 100;
  const rows = history?.data ?? [];

  return (
    <div className="p-6 max-w-5xl">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Download className="w-6 h-6 text-primary" />
          <h1 className="text-2xl font-bold">Импорт фидов</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setShowDiagnostics(true);
              void refetchDiag();
            }}
            className="inline-flex items-center gap-2 border bg-background px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-muted transition-colors"
          >
            {diagLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileJson className="w-4 h-4" />}
            Отчёт фид vs БД
          </button>
          <button
            onClick={() => triggerMutation.mutate()}
            disabled={triggerMutation.isPending || isRunning}
            className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {triggerMutation.isPending || isRunning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
            {isRunning ? 'Импорт идёт…' : 'Запустить импорт'}
          </button>
        </div>
      </div>

      {showDiagnostics && (
        <div className="bg-muted/30 border rounded-2xl p-4 mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold">GET /admin/feed-import/diagnostics?region={region}</span>
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
                  <th className="px-4 py-3 font-medium">Дата</th>
                  <th className="px-4 py-3 font-medium text-right">ЖК</th>
                  <th className="px-4 py-3 font-medium text-right">Корпуса</th>
                  <th className="px-4 py-3 font-medium text-right">Квартиры</th>
                  <th className="px-4 py-3 font-medium">Ошибка</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {rows.map(r => {
                  const Icon = statusIcon[r.status] ?? Clock;
                  return (
                    <tr key={r.id} className="hover:bg-muted/50 transition-colors">
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${statusColor[r.status] ?? ''}`}>
                          <Icon className={`w-3.5 h-3.5 ${r.status === 'IN_PROGRESS' ? 'animate-spin' : ''}`} />
                          {statusLabel[r.status] ?? r.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs uppercase">{r.regionCode}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                        {new Date(r.startedAt).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="px-4 py-3 text-right text-xs">
                        <span className="text-green-600">+{r.blocksCreated}</span> / <span className="text-amber-600">{r.blocksUpdated}</span>
                      </td>
                      <td className="px-4 py-3 text-right text-xs">
                        <span className="text-green-600">+{r.buildingsCreated}</span> / <span className="text-amber-600">{r.buildingsUpdated}</span>
                      </td>
                      <td className="px-4 py-3 text-right text-xs">
                        <span className="text-green-600">+{r.listingsCreated}</span> / <span className="text-amber-600">{r.listingsUpdated}</span>
                      </td>
                      <td className="px-4 py-3 text-xs text-destructive max-w-[200px] truncate" title={r.errorMessage ?? ''}>
                        {r.errorMessage ?? '—'}
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
