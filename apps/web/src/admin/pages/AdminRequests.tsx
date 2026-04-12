import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ClipboardList, Loader2, ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react';
import { apiGet, apiUrl, getAccessToken } from '@/lib/api';

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
}

interface PaginatedResult {
  data: RequestRow[];
  meta: { page: number; per_page: number; total: number; total_pages: number };
}

const STATUS_OPTIONS = [
  { value: '', label: 'Все' },
  { value: 'NEW', label: 'Новые' },
  { value: 'IN_PROGRESS', label: 'В работе' },
  { value: 'DONE', label: 'Закрыты' },
  { value: 'CANCELLED', label: 'Отменены' },
] as const;

const statusStyle: Record<string, string> = {
  NEW: 'bg-blue-100 text-blue-700',
  IN_PROGRESS: 'bg-amber-100 text-amber-700',
  DONE: 'bg-green-100 text-green-700',
  CANCELLED: 'bg-muted text-muted-foreground',
};

const statusLabel: Record<string, string> = {
  NEW: 'Новая', IN_PROGRESS: 'В работе', DONE: 'Закрыта', CANCELLED: 'Отменена',
};

const typeLabel: Record<string, string> = {
  CONSULTATION: 'Консультация',
  VIEWING: 'Просмотр',
  CALLBACK: 'Обратный звонок',
  MORTGAGE: 'Ипотека',
  OTHER: 'Другое',
};

async function updateRequestStatus(id: number, status: string) {
  const token = getAccessToken();
  const res = await fetch(apiUrl(`/admin/requests/${id}`), {
    method: 'PUT',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ status }),
  });
  if (!res.ok) throw new Error(`${res.status}`);
  return res.json();
}

export default function AdminRequests() {
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const perPage = 20;

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['admin', 'requests', statusFilter, page],
    queryFn: () => {
      const sp = new URLSearchParams();
      sp.set('page', String(page));
      sp.set('per_page', String(perPage));
      if (statusFilter) sp.set('status', statusFilter);
      return apiGet<PaginatedResult>(`/admin/requests?${sp}`);
    },
    staleTime: 15_000,
  });

  const mutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) => updateRequestStatus(id, status),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'requests'] });
    },
  });

  const meta = data?.meta;
  const rows = data?.data ?? [];

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

      {/* Status filter tabs */}
      <div className="flex items-center gap-2 mb-5 flex-wrap">
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

      {rows.length > 0 && (
        <div className="bg-background border rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs text-muted-foreground">
                  <th className="px-4 py-3 font-medium">#</th>
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
    </div>
  );
}
