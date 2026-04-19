import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Loader2, ChevronLeft, ChevronRight, ExternalLink, Plus, Pencil, Trash2, Wand2,
  Building, TreePine, Trees, Hammer, ParkingSquare, Search, X,
} from 'lucide-react';
import { apiGet, apiDelete, apiPatch, ApiError } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { toast } from '@/components/ui/sonner';
import { useAuth } from '@/shared/hooks/useAuth';
import { cn } from '@/lib/utils';

type Kind = 'APARTMENT' | 'HOUSE' | 'LAND' | 'COMMERCIAL' | 'PARKING';
type Source = 'all' | 'feed' | 'manual';

type ListingRow = {
  id: number;
  kind?: string;
  price: string | number | null;
  dataSource?: string;
  status?: string;
  isPublished?: boolean;
  blockId?: number | null;
  region?: { id: number; code?: string; name?: string } | null;
  block?: { id: number; slug: string; name: string } | null;
  apartment: { areaTotal: string | number | null; floor: number | null; roomType: { name: string } | null } | null;
  house: { houseType: string | null; areaTotal: string | number | null; floorsCount: number | null } | null;
  land: { areaSotki: string | number | null; landCategory: string | null; hasCommunications: boolean | null } | null;
  commercial: { commercialType: string | null; area: string | number | null; floor: number | null } | null;
  parking: { parkingType: string | null; area: string | number | null; floor: number | null; number: string | null } | null;
};

type Paginated = {
  data: ListingRow[];
  meta: { page: number; per_page: number; total: number; total_pages: number };
};

type RegionRow = { id: number; code: string; name: string };
type ListingStatus = 'DRAFT' | 'ACTIVE' | 'SOLD' | 'RESERVED';

const KIND_TABS: { key: Kind; label: string; icon: typeof Building; manualPath: string }[] = [
  { key: 'APARTMENT',  label: 'Квартиры',     icon: Building,      manualPath: '/admin/listings/manual/new' },
  { key: 'HOUSE',      label: 'Дома',          icon: TreePine,      manualPath: '/admin/listings/manual-house/new' },
  { key: 'LAND',       label: 'Участки',       icon: Trees,         manualPath: '/admin/listings/manual-land/new' },
  { key: 'COMMERCIAL', label: 'Коммерция',     icon: Hammer,        manualPath: '/admin/listings/manual-commercial/new' },
  { key: 'PARKING',    label: 'Паркинг',       icon: ParkingSquare, manualPath: '/admin/listings/manual-parking/new' },
];

const SOURCE_TABS: { key: Source; label: string }[] = [
  { key: 'all',    label: 'Все источники' },
  { key: 'feed',   label: 'Из фида (FEED)' },
  { key: 'manual', label: 'Ручные (MANUAL)' },
];

function parseApiErrorMessage(e: unknown, fallback: string): string {
  if (e instanceof ApiError) {
    try {
      const j = JSON.parse(e.message) as { message?: string | string[] };
      if (Array.isArray(j.message)) return j.message.join(', ');
      if (typeof j.message === 'string') return j.message;
    } catch {
      if (e.message) return e.message;
    }
  } else if (e instanceof Error) {
    return e.message;
  }
  return fallback;
}

function publicLinkFor(kind: Kind, id: number): string {
  return kind === 'APARTMENT' ? `/apartment/${id}` : `/listing/${id}`;
}

function manualEditPath(kind: Kind, id: number): string {
  switch (kind) {
    case 'APARTMENT':  return `/admin/listings/manual/${id}/edit`;
    case 'HOUSE':      return `/admin/listings/manual-house/${id}/edit`;
    case 'LAND':       return `/admin/listings/manual-land/${id}/edit`;
    case 'COMMERCIAL': return `/admin/listings/manual-commercial/${id}/edit`;
    case 'PARKING':    return `/admin/listings/manual-parking/${id}/edit`;
  }
}

export default function AdminListings() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const canManageManual = user?.role === 'admin' || user?.role === 'editor' || user?.role === 'agent';
  const canPublish = user?.role === 'admin' || user?.role === 'editor';

  const [kind, setKind] = useState<Kind>('APARTMENT');
  const [source, setSource] = useState<Source>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | ListingStatus>('all');
  const [regionId, setRegionId] = useState<number | 'all'>('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const perPage = 30;

  const { data: regions } = useQuery({
    queryKey: ['admin-regions'],
    queryFn: () => apiGet<RegionRow[]>('/regions'),
    staleTime: 60 * 60 * 1000,
  });

  const queryKey = useMemo(
    () => ['admin', 'listings', regionId, page, source, kind, statusFilter, search.trim()],
    [regionId, page, source, kind, statusFilter, search],
  );

  const queryString = useMemo(() => {
    const sp = new URLSearchParams({
      page: String(page),
      per_page: String(perPage),
      kind,
    });
    if (regionId !== 'all') sp.set('region_id', String(regionId));
    if (source === 'feed') sp.set('data_source', 'FEED');
    if (source === 'manual') sp.set('data_source', 'MANUAL');
    if (statusFilter !== 'all') sp.set('status', statusFilter);
    if (search.trim()) sp.set('search', search.trim());
    return sp.toString();
  }, [page, perPage, kind, regionId, source, statusFilter, search]);

  const { data, isLoading } = useQuery({
    queryKey,
    queryFn: () => apiGet<Paginated>(`/admin/listings?${queryString}`),
    staleTime: 20_000,
  });

  const { data: kindCountsByRegion } = useQuery({
    queryKey: ['admin', 'listings-kind-counts', regionId],
    queryFn: () => {
      const sp = new URLSearchParams();
      if (regionId !== 'all') sp.set('region_id', String(regionId));
      return apiGet<Record<string, number>>(`/stats/listing-kind-counts?${sp}`);
    },
    enabled: regionId !== 'all',
    staleTime: 60_000,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiDelete(`/admin/listings/${id}`),
    onSuccess: async () => {
      toast.success('Объявление удалено');
      await qc.invalidateQueries({ queryKey: ['admin', 'listings'] });
    },
    onError: (e: unknown) => toast.error(parseApiErrorMessage(e, 'Ошибка удаления')),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, patch }: { id: number; patch: { status?: ListingStatus; isPublished?: boolean } }) =>
      apiPatch(`/admin/listings/${id}`, patch),
    onSuccess: async () => {
      toast.success('Объявление обновлено');
      await qc.invalidateQueries({ queryKey: ['admin', 'listings'] });
    },
    onError: (e: unknown) => toast.error(parseApiErrorMessage(e, 'Ошибка обновления')),
  });

  const rows = data?.data ?? [];
  const meta = data?.meta;

  const KindIcon = (KIND_TABS.find((t) => t.key === kind) ?? KIND_TABS[0]).icon;
  const kindManualPath = (KIND_TABS.find((t) => t.key === kind) ?? KIND_TABS[0]).manualPath;

  const setKindAndReset = (k: Kind) => { setKind(k); setPage(1); };
  const setSourceAndReset = (s: Source) => { setSource(s); setPage(1); };

  return (
    <div className="p-6 max-w-7xl">
      {/* Header */}
      <div className="flex flex-col gap-4 mb-6">
        <div className="flex items-center gap-3">
          <KindIcon className="w-6 h-6 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Объявления</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Все объекты — из фидов и добавленные вручную. Используйте фильтры по региону, типу и источнику.
            </p>
          </div>
        </div>

        {/* Filters bar */}
        <div className="flex flex-wrap gap-2 items-center">
          <Select value={String(regionId)} onValueChange={(v) => { setRegionId(v === 'all' ? 'all' : Number(v)); setPage(1); }}>
            <SelectTrigger className="h-9 w-[200px] text-xs">
              <SelectValue placeholder="Регион" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все регионы</SelectItem>
              {(regions ?? []).map((r) => (
                <SelectItem key={r.id} value={String(r.id)}>{r.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v as 'all' | ListingStatus); setPage(1); }}>
            <SelectTrigger className="h-9 w-[160px] text-xs">
              <SelectValue placeholder="Статус" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все статусы</SelectItem>
              <SelectItem value="ACTIVE">ACTIVE</SelectItem>
              <SelectItem value="RESERVED">RESERVED</SelectItem>
              <SelectItem value="SOLD">SOLD</SelectItem>
              <SelectItem value="DRAFT">DRAFT</SelectItem>
            </SelectContent>
          </Select>

          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Поиск по ЖК, адресу"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="h-9 pl-8 pr-8 text-xs"
            />
            {search ? (
              <button
                type="button"
                onClick={() => { setSearch(''); setPage(1); }}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                aria-label="Очистить поиск"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            ) : null}
          </div>

          <div className="ml-auto flex items-center gap-2">
            {canManageManual ? (
              <>
                <Button type="button" variant="outline" asChild>
                  <Link to="/admin/listings/wizard/new">
                    <Wand2 className="w-4 h-4 mr-2" />
                    Мастер
                  </Link>
                </Button>
                <Button type="button" asChild>
                  <Link to={kindManualPath}>
                    <Plus className="w-4 h-4 mr-2" />
                    Добавить
                  </Link>
                </Button>
              </>
            ) : null}
          </div>
        </div>
      </div>

      {/* Type tabs */}
      <div className="flex flex-wrap gap-2 mb-3">
        {KIND_TABS.map((t) => {
          const Icon = t.icon;
          const cnt = kindCountsByRegion?.[t.key];
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => setKindAndReset(t.key)}
              className={cn(
                'inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors',
                kind === t.key
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-card text-foreground border-border hover:bg-muted/60',
              )}
            >
              <Icon className="w-3.5 h-3.5" />
              {t.label}
              {regionId !== 'all' && cnt != null ? (
                <span className={cn('opacity-70', kind === t.key ? '' : 'text-muted-foreground')}>· {cnt}</span>
              ) : null}
            </button>
          );
        })}
      </div>

      {/* Source tabs */}
      <div className="flex gap-2 mb-4 border-b">
        {SOURCE_TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            className={cn(
              'px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors',
              source === t.key
                ? 'border-primary text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground',
            )}
            onClick={() => setSourceAndReset(t.key)}
          >
            {t.label}
          </button>
        ))}
        <div className="ml-auto self-center text-xs text-muted-foreground pr-2">
          {meta ? `Найдено: ${meta.total}` : ''}
        </div>
      </div>

      {/* Body */}
      {isLoading && (
        <div className="flex justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      )}

      {!isLoading && rows.length === 0 && (
        <div className="border rounded-2xl p-8 text-center text-muted-foreground text-sm">
          Нет записей по выбранным фильтрам
        </div>
      )}

      {rows.length > 0 && (
        <div className="bg-background border rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs text-muted-foreground">
                  <th className="px-4 py-3 font-medium">ID</th>
                  <th className="px-4 py-3 font-medium">Регион</th>
                  <th className="px-4 py-3 font-medium">Источник</th>
                  <th className="px-4 py-3 font-medium">
                    {kind === 'APARTMENT' ? 'Комн.' : kind === 'LAND' ? 'Категория' : 'Тип'}
                  </th>
                  <th className="px-4 py-3 font-medium">Площадь</th>
                  <th className="px-4 py-3 font-medium">
                    {kind === 'APARTMENT' ? 'Этаж' : kind === 'HOUSE' ? 'Этажей' : kind === 'LAND' ? 'Комм.' : kind === 'COMMERCIAL' ? 'Этаж' : 'Место'}
                  </th>
                  <th className="px-4 py-3 font-medium">Статус</th>
                  <th className="px-4 py-3 font-medium text-center">Публ.</th>
                  <th className="px-4 py-3 font-medium text-right">Цена</th>
                  <th className="px-4 py-3 font-medium text-center">Сайт</th>
                  <th className="px-4 py-3 font-medium text-right">Действия</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {rows.map((r) => {
                  const priceN = r.price != null ? Number(r.price) : 0;
                  const area = kind === 'APARTMENT' ? Number(r.apartment?.areaTotal ?? NaN)
                    : kind === 'HOUSE' ? Number(r.house?.areaTotal ?? NaN)
                    : kind === 'LAND' ? Number(r.land?.areaSotki ?? NaN)
                    : kind === 'COMMERCIAL' ? Number(r.commercial?.area ?? NaN)
                    : Number(r.parking?.area ?? NaN);
                  const isManual = (r.dataSource ?? '').toUpperCase() === 'MANUAL';
                  return (
                    <tr key={r.id} className="hover:bg-muted/40">
                      <td className="px-4 py-2 text-muted-foreground text-xs">{r.id}</td>
                      <td className="px-4 py-2 text-xs">{r.region?.name ?? '—'}</td>
                      <td className="px-4 py-2 text-xs">{r.dataSource ?? '—'}</td>
                      <td className="px-4 py-2">
                        {kind === 'APARTMENT' ? (r.apartment?.roomType?.name ?? '—')
                          : kind === 'HOUSE' ? (r.house?.houseType ?? '—')
                          : kind === 'LAND' ? (r.land?.landCategory ?? '—')
                          : kind === 'COMMERCIAL' ? (r.commercial?.commercialType ?? '—')
                          : (r.parking?.parkingType ?? '—')}
                      </td>
                      <td className="px-4 py-2">
                        {Number.isFinite(area) ? `${area} ${kind === 'LAND' ? 'сот.' : 'м²'}` : '—'}
                      </td>
                      <td className="px-4 py-2">
                        {kind === 'APARTMENT' ? (r.apartment?.floor ?? '—')
                          : kind === 'HOUSE' ? (r.house?.floorsCount ?? '—')
                          : kind === 'LAND' ? (r.land?.hasCommunications == null ? '—' : r.land.hasCommunications ? 'Да' : 'Нет')
                          : kind === 'COMMERCIAL' ? (r.commercial?.floor ?? '—')
                          : (r.parking?.number ?? '—')}
                      </td>
                      <td className="px-4 py-2">
                        <select
                          className="h-8 rounded-md border bg-background px-2 text-xs"
                          value={(r.status ?? 'DRAFT') as ListingStatus}
                          disabled={updateMutation.isPending || !canManageManual}
                          onChange={(e) =>
                            updateMutation.mutate({ id: r.id, patch: { status: e.target.value as ListingStatus } })
                          }
                        >
                          <option value="DRAFT">DRAFT</option>
                          <option value="ACTIVE">ACTIVE</option>
                          <option value="SOLD">SOLD</option>
                          <option value="RESERVED">RESERVED</option>
                        </select>
                      </td>
                      <td className="px-4 py-2 text-center">
                        <input
                          type="checkbox"
                          checked={Boolean(r.isPublished)}
                          disabled={updateMutation.isPending || !canPublish}
                          onChange={(e) =>
                            updateMutation.mutate({ id: r.id, patch: { isPublished: e.target.checked } })
                          }
                        />
                      </td>
                      <td className="px-4 py-2 text-right font-medium">
                        {priceN > 0 ? `${(priceN / 1_000_000).toFixed(1)} млн` : '—'}
                      </td>
                      <td className="px-4 py-2 text-center">
                        <Link
                          to={publicLinkFor(kind, r.id)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary inline-flex justify-center"
                          title="Открыть на сайте"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </Link>
                      </td>
                      <td className="px-4 py-2 text-right whitespace-nowrap">
                        {isManual && canManageManual ? (
                          <>
                            <Link
                              to={manualEditPath(kind, r.id)}
                              className="inline-flex p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground mr-1"
                              title="Править"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </Link>
                            <button
                              type="button"
                              className="p-1.5 rounded-lg hover:bg-muted text-destructive"
                              title="Удалить"
                              disabled={deleteMutation.isPending}
                              onClick={() => {
                                if (window.confirm(`Удалить объявление #${r.id}?`)) deleteMutation.mutate(r.id);
                              }}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </>
                        ) : (
                          <span className="text-xs text-muted-foreground">Из фида</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {meta && meta.total_pages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t text-sm">
              <span className="text-muted-foreground">
                Стр. {meta.page} из {meta.total_pages} · {meta.total} шт.
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="p-1.5 rounded-lg border hover:bg-muted disabled:opacity-40"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setPage((p) => p + 1)}
                  disabled={page >= meta.total_pages}
                  className="p-1.5 rounded-lg border hover:bg-muted disabled:opacity-40"
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
