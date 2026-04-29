import { FormEvent, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Loader2, Pencil, Plus, Search, UserRound } from 'lucide-react';
import { apiGet, apiPost, apiPut, ApiError } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from '@/components/ui/sonner';
import SellerFields, {
  emptySellerForm,
  normalizeSellerForm,
  sellerFormFromApi,
  type SellerForm,
} from '@/admin/components/SellerFields';

type SellerRow = SellerForm & {
  id: number;
  createdAt: string;
  updatedAt: string;
  createdBy?: { fullName: string | null; email: string | null; role: string } | null;
  _count?: { listings: number };
  listings?: Array<{ id: number; kind: string; status: string; dataSource: string }>;
};

function parseError(e: unknown): string {
  if (e instanceof ApiError) {
    try {
      const j = JSON.parse(e.message) as { message?: string | string[] };
      if (Array.isArray(j.message)) return j.message.join(', ');
      if (typeof j.message === 'string') return j.message;
    } catch {
      if (e.message) return e.message;
    }
  }
  if (e instanceof Error) return e.message;
  return 'Ошибка сохранения';
}

function manualEditPath(kind: string, id: number): string {
  switch (kind) {
    case 'HOUSE': return `/admin/listings/manual-house/${id}/edit`;
    case 'LAND': return `/admin/listings/manual-land/${id}/edit`;
    case 'COMMERCIAL': return `/admin/listings/manual-commercial/${id}/edit`;
    case 'PARKING': return `/admin/listings/manual-parking/${id}/edit`;
    default: return `/admin/listings/manual/${id}/edit`;
  }
}

export default function AdminSellers() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState<SellerForm>(emptySellerForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<SellerForm>(emptySellerForm);

  const query = useMemo(() => {
    const sp = new URLSearchParams({ per_page: '100' });
    if (search.trim()) sp.set('search', search.trim());
    return sp.toString();
  }, [search]);

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'sellers', query],
    queryFn: () => apiGet<{ items: SellerRow[] }>(`/admin/sellers?${query}`),
    staleTime: 20_000,
  });

  const createMutation = useMutation({
    mutationFn: (payload: SellerForm) => apiPost('/admin/sellers', payload),
    onSuccess: async () => {
      toast.success('Продавец создан');
      setCreateForm(emptySellerForm);
      setShowCreate(false);
      await qc.invalidateQueries({ queryKey: ['admin', 'sellers'] });
    },
    onError: (e) => toast.error(parseError(e)),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: SellerForm }) => apiPut(`/admin/sellers/${id}`, payload),
    onSuccess: async () => {
      toast.success('Продавец обновлен');
      setEditingId(null);
      await qc.invalidateQueries({ queryKey: ['admin', 'sellers'] });
    },
    onError: (e) => toast.error(parseError(e)),
  });

  const submitCreate = (e: FormEvent) => {
    e.preventDefault();
    const payload = normalizeSellerForm(createForm);
    if (!payload) {
      toast.error('Заполните хотя бы одно поле продавца');
      return;
    }
    createMutation.mutate(payload);
  };

  const submitEdit = (e: FormEvent) => {
    e.preventDefault();
    if (editingId == null) return;
    const payload = normalizeSellerForm(editForm);
    if (!payload) {
      toast.error('Заполните хотя бы одно поле продавца');
      return;
    }
    updateMutation.mutate({ id: editingId, payload });
  };

  const rows = data?.items ?? [];

  return (
    <div className="p-6 max-w-6xl space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Продавцы объектов</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Отдельная база продавцов сохраняет контакты собственника независимо от агента или менеджера.
          </p>
        </div>
        <Button type="button" onClick={() => setShowCreate((v) => !v)}>
          <Plus className="w-4 h-4 mr-2" />
          Добавить продавца
        </Button>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Поиск по ФИО, телефону, email, адресу"
          className="pl-9"
        />
      </div>

      {showCreate && (
        <form onSubmit={submitCreate} className="space-y-3">
          <SellerFields value={createForm} onChange={setCreateForm} />
          <Button type="submit" disabled={createMutation.isPending}>
            {createMutation.isPending ? 'Сохранение...' : 'Создать продавца'}
          </Button>
        </form>
      )}

      {editingId != null && (
        <form onSubmit={submitEdit} className="space-y-3">
          <SellerFields value={editForm} onChange={setEditForm} />
          <div className="flex gap-2">
            <Button type="submit" disabled={updateMutation.isPending}>
              {updateMutation.isPending ? 'Сохранение...' : 'Сохранить'}
            </Button>
            <Button type="button" variant="outline" onClick={() => setEditingId(null)}>Отмена</Button>
          </div>
        </form>
      )}

      <div className="border rounded-2xl bg-background divide-y">
        {isLoading ? (
          <div className="p-8 flex justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : rows.length === 0 ? (
          <div className="p-8 text-sm text-muted-foreground text-center">Продавцы не найдены</div>
        ) : (
          rows.map((seller) => (
            <div key={seller.id} className="p-4 flex flex-col gap-3 md:flex-row md:items-start">
              <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <UserRound className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium">{seller.fullName || 'Без ФИО'}</p>
                  <span className="text-xs px-2 py-0.5 rounded-lg bg-muted">
                    объектов: {seller._count?.listings ?? seller.listings?.length ?? 0}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">
                  {[seller.phone, seller.phoneAlt, seller.email].filter(Boolean).join(' · ') || 'Контакты не заполнены'}
                </p>
                {seller.address ? <p className="text-xs text-muted-foreground mt-1">Адрес: {seller.address}</p> : null}
                {seller.notes ? <p className="text-xs text-muted-foreground mt-1">Комментарий: {seller.notes}</p> : null}
                {seller.createdBy ? (
                  <p className="text-xs text-muted-foreground mt-1">
                    Добавил: {seller.createdBy.fullName || seller.createdBy.email || seller.createdBy.role}
                  </p>
                ) : null}
                {seller.listings?.length ? (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {seller.listings.map((l) => (
                      <Link key={l.id} to={manualEditPath(l.kind, l.id)} className="text-xs text-primary hover:underline">
                        #{l.id} {l.kind}
                      </Link>
                    ))}
                  </div>
                ) : null}
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setEditingId(seller.id);
                  setEditForm(sellerFormFromApi(seller));
                }}
              >
                <Pencil className="w-4 h-4 mr-1" />
                Изменить
              </Button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
