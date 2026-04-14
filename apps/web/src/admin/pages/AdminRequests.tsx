import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ClipboardList, Loader2, ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react';
import { ApiError, apiGet, apiPut } from '@/lib/api';

interface RequestRow {
  id: number;
  name: string | null;
  phone: string;
  email: string | null;
  type: string;
  status: string;
  comment: string | null;
  sourceUrl: string | null;
  createdAt: string;
  assignedUser: { id: string; fullName: string | null; email: string } | null;
  assignedTo: string | null;
}

interface PaginatedResult {
  data: RequestRow[];
  meta: { page: number; per_page: number; total: number; total_pages: number };
}

const STATUS_OPTIONS = [
  { value: '', label: 'Все' },
  { value: 'NEW', label: 'Новые' },
  { value: 'IN_PROGRESS', label: 'В работе' },
  { value: 'COMPLETED', label: 'Закрыты' },
  { value: 'CANCELLED', label: 'Отменены' },
] as const;

const statusStyle: Record<string, string> = {
  NEW: 'bg-blue-100 text-blue-700',
  IN_PROGRESS: 'bg-amber-100 text-amber-700',
  COMPLETED: 'bg-green-100 text-green-700',
  CANCELLED: 'bg-muted text-muted-foreground',
};

const statusLabel: Record<string, string> = {
  NEW: 'Новая', IN_PROGRESS: 'В работе', COMPLETED: 'Закрыта', CANCELLED: 'Отменена',
};

const typeLabel: Record<string, string> = {
  CONSULTATION: 'Консультация',
  CALLBACK: 'Обратный звонок',
  MORTGAGE: 'Ипотека',
  SELECTION: 'Подбор',
  CONTACT: 'Контакты',
};

type AssigneeRow = { id: string; role: string; fullName: string | null; email: string | null };

function parseApiMessage(e: unknown): string {
  if (e instanceof ApiError) {
    try {
      const j = JSON.parse(e.message) as { message?: string | string[] };
      if (Array.isArray(j.message)) return j.message.join(', ');
      if (typeof j.message === 'string') return j.message;
    } catch {
      return e.message || String(e.status);
    }
  }
  return e instanceof Error ? e.message : 'Ошибка';
}

export default function AdminRequests() {
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter] = useState('');
  const [assigneeFilter, setAssigneeFilter] = useState('');
  const [page, setPage] = useState(1);
  const [mode, setMode] = useState<'table' | 'kanban'>('table');
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [bulkStatus, setBulkStatus] = useState<'NEW' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED'>('IN_PROGRESS');
  const [bulkAssignee, setBulkAssignee] = useState('');
  const [draggedId, setDraggedId] = useState<number | null>(null);
  const perPage = 20;

  const assigneesQuery = useQuery({
    queryKey: ['admin', 'requests', 'assignees'],
    queryFn: () => apiGet<AssigneeRow[]>('/admin/requests/assignees'),
    staleTime: 60_000,
  });

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['admin', 'requests', statusFilter, assigneeFilter, page],
    queryFn: () => {
      const sp = new URLSearchParams();
      sp.set('page', String(page));
      sp.set('per_page', String(perPage));
      if (statusFilter) sp.set('status', statusFilter);
      if (assigneeFilter) sp.set('assigned_to', assigneeFilter);
      return apiGet<PaginatedResult>(`/admin/requests?${sp}`);
    },
    staleTime: 15_000,
  });

  const mutation = useMutation({
    mutationFn: ({ id, status, assignedTo }: { id: number; status: string; assignedTo?: string | null }) =>
      apiPut(`/admin/requests/${id}`, { status, ...(assignedTo !== undefined ? { assignedTo } : {}) }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['admin', 'requests'] });
    },
  });

  const meta = data?.meta;
  const rows = data?.data ?? [];
  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const kanbanColumns: Array<{ status: 'NEW' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED'; title: string }> = [
    { status: 'NEW', title: 'Новые' },
    { status: 'IN_PROGRESS', title: 'В работе' },
    { status: 'COMPLETED', title: 'Завершены' },
    { status: 'CANCELLED', title: 'Отменены' },
  ];
  const byStatus = useMemo(() => {
    const m: Record<string, RequestRow[]> = { NEW: [], IN_PROGRESS: [], COMPLETED: [], CANCELLED: [] };
    for (const r of rows) {
      if (!m[r.status]) m[r.status] = [];
      m[r.status].push(r);
    }
    return m;
  }, [rows]);

  const applyBulk = async () => {
    if (selectedIds.length === 0 || mutation.isPending) return;
    await Promise.all(
      selectedIds.map((id) =>
        mutation.mutateAsync({
          id,
          status: bulkStatus,
          assignedTo: bulkAssignee === '' ? undefined : bulkAssignee === 'none' ? null : bulkAssignee,
        }),
      ),
    );
    setSelectedIds([]);
  };

  return (
    <div className="p-6 max-w-6xl">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <ClipboardList className="w-6 h-6 text-primary" />
          <h1 className="text-2xl font-bold">Заявки</h1>
          {meta && <span className="text-sm text-muted-foreground ml-2">({meta.total})</span>}
        </div>
        <button
          onClick={() => qc.invalidateQueries({ queryKey: ['admin', 'requests'] })}
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} /> Обновить
        </button>
      </div>

      {/* Filters + mode */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        {STATUS_OPTIONS.map(opt => (
          <button
            key={opt.value}
            onClick={() => { setStatusFilter(opt.value); setPage(1); }}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors border ${
              statusFilter === opt.value
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-background text-muted-foreground border-border hover:bg-muted'
            }`}
          >
            {opt.label}
          </button>
        ))}
        <select
          value={assigneeFilter}
          onChange={(e) => { setAssigneeFilter(e.target.value); setPage(1); }}
          className="h-8 rounded-lg border px-2 text-xs bg-background"
        >
          <option value="">Все исполнители</option>
          <option value="none">Не назначены</option>
          {(assigneesQuery.data ?? []).map((a) => (
            <option key={a.id} value={a.id}>
              {(a.fullName ?? a.email ?? a.id).trim()} ({a.role})
            </option>
          ))}
        </select>
        <div className="ml-auto flex items-center gap-1 rounded-lg border p-1">
          <button
            type="button"
            onClick={() => setMode('table')}
            className={`text-xs px-2 py-1 rounded ${mode === 'table' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'}`}
          >
            Таблица
          </button>
          <button
            type="button"
            onClick={() => setMode('kanban')}
            className={`text-xs px-2 py-1 rounded ${mode === 'kanban' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'}`}
          >
            Kanban
          </button>
        </div>
      </div>

      <div className="bg-background border rounded-xl p-3 mb-4 flex flex-wrap items-end gap-2">
        <div className="text-xs text-muted-foreground">Выбрано: {selectedIds.length}</div>
        <select
          value={bulkStatus}
          onChange={(e) => setBulkStatus(e.target.value as typeof bulkStatus)}
          className="h-8 rounded-lg border px-2 text-xs bg-background"
        >
          {STATUS_OPTIONS.filter((o) => o.value).map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        <select
          value={bulkAssignee}
          onChange={(e) => setBulkAssignee(e.target.value)}
          className="h-8 rounded-lg border px-2 text-xs bg-background"
        >
          <option value="">Не менять исполнителя</option>
          <option value="none">Снять назначение</option>
          {(assigneesQuery.data ?? []).map((a) => (
            <option key={a.id} value={a.id}>{(a.fullName ?? a.email ?? a.id).trim()}</option>
          ))}
        </select>
        <button
          type="button"
          disabled={selectedIds.length === 0 || mutation.isPending}
          onClick={() => void applyBulk()}
          className="h-8 px-3 rounded-lg text-xs bg-primary text-primary-foreground disabled:opacity-50"
        >
          Применить к выбранным
        </button>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      )}

      {!isLoading && rows.length === 0 && (
        <div className="bg-background border rounded-2xl p-12 text-center text-sm text-muted-foreground">
          Нет заявок
        </div>
      )}

      {rows.length > 0 && mode === 'table' && (
        <div className="bg-background border rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs text-muted-foreground">
                  <th className="px-4 py-3 font-medium">#</th>
                  <th className="px-4 py-3 font-medium w-8">
                    <input
                      type="checkbox"
                      checked={rows.length > 0 && rows.every((r) => selectedSet.has(r.id))}
                      onChange={(e) => {
                        if (e.target.checked) setSelectedIds(rows.map((r) => r.id));
                        else setSelectedIds([]);
                      }}
                    />
                  </th>
                  <th className="px-4 py-3 font-medium">Имя</th>
                  <th className="px-4 py-3 font-medium">Телефон</th>
                  <th className="px-4 py-3 font-medium">Тип</th>
                  <th className="px-4 py-3 font-medium">Статус</th>
                  <th className="px-4 py-3 font-medium">Назначен</th>
                  <th className="px-4 py-3 font-medium">Дата</th>
                  <th className="px-4 py-3 font-medium">Действия</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {rows.map(r => (
                  <tr key={r.id} className="hover:bg-muted/50 transition-colors">
                    <td className="px-4 py-3 text-muted-foreground">{r.id}</td>
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selectedSet.has(r.id)}
                        onChange={(e) =>
                          setSelectedIds((prev) => e.target.checked ? [...new Set([...prev, r.id])] : prev.filter((x) => x !== r.id))
                        }
                      />
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-medium">{r.name || '—'}</span>
                      {r.comment && (
                        <p className="text-[11px] text-muted-foreground mt-0.5 max-w-[200px] truncate" title={r.comment}>{r.comment}</p>
                      )}
                    </td>
                    <td className="px-4 py-3">{r.phone}</td>
                    <td className="px-4 py-3 text-xs">{typeLabel[r.type] ?? r.type}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-1 rounded-lg ${statusStyle[r.status] ?? 'bg-muted text-muted-foreground'}`}>
                        {statusLabel[r.status] ?? r.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {r.assignedUser?.fullName ?? r.assignedUser?.email ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                      {new Date(r.createdAt).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={r.status}
                        onChange={e => mutation.mutate({ id: r.id, status: e.target.value })}
                        disabled={mutation.isPending}
                        className="text-xs border rounded-lg px-2 py-1 bg-background"
                      >
                        {STATUS_OPTIONS.filter(o => o.value !== '').map(o => (
                          <option key={o.value} value={o.value}>{o.label}</option>
                        ))}
                      </select>
                      <select
                        value={r.assignedTo ?? 'none'}
                        onChange={(e) =>
                          mutation.mutate({
                            id: r.id,
                            status: r.status,
                            assignedTo: e.target.value === 'none' ? null : e.target.value,
                          })
                        }
                        disabled={mutation.isPending}
                        className="text-xs border rounded-lg px-2 py-1 bg-background ml-2"
                      >
                        <option value="none">Без назначения</option>
                        {(assigneesQuery.data ?? []).map((a) => (
                          <option key={a.id} value={a.id}>{(a.fullName ?? a.email ?? a.id).trim()}</option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {meta && meta.total_pages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t text-sm">
              <span className="text-muted-foreground">
                Стр. {meta.page} из {meta.total_pages}
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="p-1.5 rounded-lg hover:bg-muted disabled:opacity-30 transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setPage(p => Math.min(meta.total_pages, p + 1))}
                  disabled={page >= meta.total_pages}
                  className="p-1.5 rounded-lg hover:bg-muted disabled:opacity-30 transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {rows.length > 0 && mode === 'kanban' && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-3">
          {kanbanColumns.map((col) => (
            <div
              key={col.status}
              className="bg-background border rounded-xl p-2 min-h-[320px]"
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => {
                if (!draggedId) return;
                mutation.mutate({ id: draggedId, status: col.status });
                setDraggedId(null);
              }}
            >
              <div className="px-2 py-1 text-xs font-semibold text-muted-foreground">
                {col.title} ({byStatus[col.status]?.length ?? 0})
              </div>
              <div className="space-y-2 mt-2">
                {(byStatus[col.status] ?? []).map((r) => (
                  <div
                    key={r.id}
                    draggable
                    onDragStart={() => setDraggedId(r.id)}
                    className="rounded-lg border p-2 text-xs bg-background cursor-grab active:cursor-grabbing"
                  >
                    <div className="font-semibold mb-1">#{r.id} {r.name || 'Без имени'}</div>
                    <div className="text-muted-foreground">{typeLabel[r.type] ?? r.type}</div>
                    <div className="mt-1">{r.phone}</div>
                    <div className="mt-1">
                      {r.assignedUser?.fullName ?? r.assignedUser?.email ?? 'Без исполнителя'}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {mutation.isError ? (
        <p className="text-sm text-destructive mt-3">{parseApiMessage(mutation.error)}</p>
      ) : null}
    </div>
  );
}
