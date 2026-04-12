import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Newspaper, Loader2, Plus, Pencil, Trash2, Eye, EyeOff, ChevronLeft, ChevronRight } from 'lucide-react';
import { apiGet, apiPost, apiUrl, getAccessToken } from '@/lib/api';

interface NewsRow {
  id: number;
  slug: string;
  title: string;
  body: string | null;
  imageUrl: string | null;
  isPublished: boolean;
  publishedAt: string | null;
  createdAt: string;
}

interface PaginatedResult {
  data: NewsRow[];
  meta: { page: number; per_page: number; total: number; total_pages: number };
}

async function apiPut<T>(path: string, body: unknown): Promise<T> {
  const token = getAccessToken();
  const res = await fetch(apiUrl(path), {
    method: 'PUT',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`${res.status}`);
  return res.json();
}

async function apiDelete(path: string): Promise<void> {
  const token = getAccessToken();
  const res = await fetch(apiUrl(path), {
    method: 'DELETE',
    credentials: 'include',
    headers: {
      Accept: 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!res.ok) throw new Error(`${res.status}`);
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[а-яё]/g, (c) => {
      const map: Record<string, string> = { а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'yo', ж: 'zh', з: 'z', и: 'i', й: 'y', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't', у: 'u', ф: 'f', х: 'kh', ц: 'ts', ч: 'ch', ш: 'sh', щ: 'shch', ъ: '', ы: 'y', ь: '', э: 'e', ю: 'yu', я: 'ya' };
      return map[c] ?? c;
    })
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

export default function AdminNews() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<NewsRow | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ title: '', slug: '', body: '', imageUrl: '', isPublished: false });

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'news', page],
    queryFn: () => apiGet<PaginatedResult>(`/admin/news?page=${page}&per_page=20`),
    staleTime: 15_000,
  });

  const createMutation = useMutation({
    mutationFn: () => apiPost('/admin/news', form),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin', 'news'] }); setCreating(false); resetForm(); },
  });

  const updateMutation = useMutation({
    mutationFn: () => apiPut(`/admin/news/${editing!.id}`, form),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin', 'news'] }); setEditing(null); resetForm(); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiDelete(`/admin/news/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'news'] }),
  });

  function resetForm() { setForm({ title: '', slug: '', body: '', imageUrl: '', isPublished: false }); }
  function startEdit(row: NewsRow) {
    setEditing(row);
    setCreating(false);
    setForm({ title: row.title, slug: row.slug, body: row.body ?? '', imageUrl: row.imageUrl ?? '', isPublished: row.isPublished });
  }
  function startCreate() {
    setEditing(null);
    setCreating(true);
    resetForm();
  }

  const meta = data?.meta;
  const rows = data?.data ?? [];
  const showForm = creating || editing;

  return (
    <div className="p-6 max-w-5xl">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Newspaper className="w-6 h-6 text-primary" />
          <h1 className="text-2xl font-bold">Новости</h1>
          {meta && <span className="text-sm text-muted-foreground ml-2">({meta.total})</span>}
        </div>
        <button
          onClick={startCreate}
          className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          <Plus className="w-4 h-4" /> Добавить
        </button>
      </div>

      {/* Create / Edit form */}
      {showForm && (
        <div className="bg-background border rounded-2xl p-5 mb-6 space-y-4">
          <h2 className="font-semibold">{editing ? 'Редактирование' : 'Новая статья'}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Заголовок</label>
              <input
                value={form.title}
                onChange={e => { setForm(f => ({ ...f, title: e.target.value, ...(creating ? { slug: slugify(e.target.value) } : {}) })); }}
                className="border rounded-xl px-3 py-2 text-sm w-full bg-background"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Slug</label>
              <input
                value={form.slug}
                onChange={e => setForm(f => ({ ...f, slug: e.target.value }))}
                className="border rounded-xl px-3 py-2 text-sm w-full bg-background"
              />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Текст</label>
            <textarea
              value={form.body}
              onChange={e => setForm(f => ({ ...f, body: e.target.value }))}
              rows={5}
              className="border rounded-xl px-3 py-2 text-sm w-full bg-background"
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">URL изображения</label>
            <input
              value={form.imageUrl}
              onChange={e => setForm(f => ({ ...f, imageUrl: e.target.value }))}
              className="border rounded-xl px-3 py-2 text-sm w-full bg-background"
              placeholder="https://..."
            />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.isPublished}
              onChange={e => setForm(f => ({ ...f, isPublished: e.target.checked }))}
              className="rounded"
            />
            Опубликовать
          </label>
          <div className="flex items-center gap-3">
            <button
              onClick={() => editing ? updateMutation.mutate() : createMutation.mutate()}
              disabled={createMutation.isPending || updateMutation.isPending || !form.title || !form.slug}
              className="bg-primary text-primary-foreground px-4 py-2 rounded-xl text-sm font-medium hover:bg-primary/90 disabled:opacity-50"
            >
              {(createMutation.isPending || updateMutation.isPending) ? 'Сохранение…' : 'Сохранить'}
            </button>
            <button onClick={() => { setEditing(null); setCreating(false); resetForm(); }} className="text-sm text-muted-foreground hover:text-foreground">
              Отмена
            </button>
          </div>
        </div>
      )}

      {isLoading && (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      )}

      {!isLoading && rows.length === 0 && !showForm && (
        <div className="bg-background border rounded-2xl p-12 text-center text-sm text-muted-foreground">
          Нет новостей
        </div>
      )}

      {rows.length > 0 && (
        <div className="bg-background border rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs text-muted-foreground">
                  <th className="px-4 py-3 font-medium">Заголовок</th>
                  <th className="px-4 py-3 font-medium text-center">Статус</th>
                  <th className="px-4 py-3 font-medium">Дата</th>
                  <th className="px-4 py-3 font-medium text-right">Действия</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {rows.map(r => (
                  <tr key={r.id} className="hover:bg-muted/50 transition-colors">
                    <td className="px-4 py-3">
                      <span className="font-medium">{r.title}</span>
                      <p className="text-[11px] text-muted-foreground mt-0.5">{r.slug}</p>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {r.isPublished
                        ? <Eye className="w-4 h-4 text-green-600 inline" />
                        : <EyeOff className="w-4 h-4 text-muted-foreground inline" />
                      }
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                      {r.publishedAt
                        ? new Date(r.publishedAt).toLocaleDateString('ru-RU')
                        : new Date(r.createdAt).toLocaleDateString('ru-RU')}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => startEdit(r)} className="p-1.5 rounded-lg hover:bg-muted transition-colors" title="Редактировать">
                          <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
                        </button>
                        <button
                          onClick={() => { if (confirm('Удалить?')) deleteMutation.mutate(r.id); }}
                          className="p-1.5 rounded-lg hover:bg-destructive/10 transition-colors" title="Удалить"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-destructive" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {meta && meta.total_pages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t text-sm">
              <span className="text-muted-foreground">Стр. {meta.page} из {meta.total_pages}</span>
              <div className="flex items-center gap-2">
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1} className="p-1.5 rounded-lg hover:bg-muted disabled:opacity-30">
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button onClick={() => setPage(p => Math.min(meta.total_pages, p + 1))} disabled={page >= meta.total_pages} className="p-1.5 rounded-lg hover:bg-muted disabled:opacity-30">
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
