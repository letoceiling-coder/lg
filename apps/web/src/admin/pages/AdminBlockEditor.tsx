import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Loader2, Save } from 'lucide-react';
import { apiGet, apiPost, apiUrl, getAccessToken } from '@/lib/api';

type BlockDetail = {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  regionId: number;
  status: string;
  isPromoted?: boolean;
};

async function apiPutJson<T>(path: string, body: unknown): Promise<T> {
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
  if (!res.ok) throw new Error(String(res.status));
  return res.json();
}

export default function AdminBlockEditor() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const isNew = id === 'new' || !id;

  const [form, setForm] = useState({
    regionId: 1,
    name: '',
    slug: '',
    description: '',
    status: 'BUILDING',
    isPromoted: false,
  });

  const { data: block, isLoading } = useQuery({
    queryKey: ['admin', 'block', id],
    queryFn: () => apiGet<BlockDetail>(`/admin/blocks/${id}`),
    enabled: !isNew && !!id,
  });

  useEffect(() => {
    if (!block) return;
    setForm({
      regionId: block.regionId,
      name: block.name,
      slug: block.slug,
      description: block.description ?? '',
      status: block.status,
      isPromoted: !!block.isPromoted,
    });
  }, [block]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        regionId: form.regionId,
        name: form.name.trim(),
        slug: form.slug.trim() || undefined,
        description: form.description.trim() || undefined,
        status: form.status,
        isPromoted: form.isPromoted,
      };
      if (isNew) {
        return apiPost<BlockDetail>('/admin/blocks', payload);
      }
      return apiPutJson<BlockDetail>(`/admin/blocks/${id}`, payload);
    },
    onSuccess: (row) => {
      qc.invalidateQueries({ queryKey: ['admin', 'blocks'] });
      navigate(`/admin/blocks/${row.id}`);
    },
  });

  if (!isNew && isLoading) {
    return (
      <div className="p-6 flex justify-center py-24">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-2xl">
      <Link
        to="/admin/blocks"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        К списку ЖК
      </Link>

      <h1 className="text-2xl font-bold mb-6">{isNew ? 'Новый ЖК' : `Редактирование: ${form.name}`}</h1>

      <div className="space-y-4 bg-background border rounded-2xl p-6">
        <div>
          <label className="text-xs text-muted-foreground font-medium">ID региона (фида)</label>
          <input
            type="number"
            className="mt-1 w-full border rounded-lg px-3 py-2 text-sm"
            value={form.regionId}
            onChange={(e) => setForm((f) => ({ ...f, regionId: parseInt(e.target.value, 10) || 1 }))}
          />
        </div>
        <div>
          <label className="text-xs text-muted-foreground font-medium">Название *</label>
          <input
            type="text"
            className="mt-1 w-full border rounded-lg px-3 py-2 text-sm"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          />
        </div>
        <div>
          <label className="text-xs text-muted-foreground font-medium">Slug (пусто — сгенерировать)</label>
          <input
            type="text"
            className="mt-1 w-full border rounded-lg px-3 py-2 text-sm"
            value={form.slug}
            onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
          />
        </div>
        <div>
          <label className="text-xs text-muted-foreground font-medium">Статус</label>
          <select
            className="mt-1 w-full border rounded-lg px-3 py-2 text-sm"
            value={form.status}
            onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
          >
            <option value="BUILDING">Строится</option>
            <option value="COMPLETED">Сдан</option>
            <option value="PROJECT">Проект</option>
          </select>
        </div>
        <div>
          <label className="text-xs text-muted-foreground font-medium">Описание</label>
          <textarea
            className="mt-1 w-full border rounded-lg px-3 py-2 text-sm min-h-[120px]"
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
          />
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={form.isPromoted}
            onChange={(e) => setForm((f) => ({ ...f, isPromoted: e.target.checked }))}
          />
          Продвигаемый на главной
        </label>

        <button
          type="button"
          disabled={!form.name.trim() || saveMutation.isPending}
          onClick={() => saveMutation.mutate()}
          className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2.5 rounded-xl text-sm font-medium disabled:opacity-50"
        >
          {saveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Сохранить
        </button>
        {saveMutation.isError && (
          <p className="text-sm text-destructive">Ошибка сохранения. Проверьте права (роль editor+) и данные.</p>
        )}
      </div>
    </div>
  );
}
