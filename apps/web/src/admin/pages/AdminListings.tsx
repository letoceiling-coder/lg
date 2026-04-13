import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Home, Loader2, ChevronLeft, ChevronRight, ExternalLink, Plus, Pencil, Trash2 } from 'lucide-react';
import { apiGet, apiDelete, apiPatch, ApiError } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/sonner';
import { useAuth } from '@/shared/hooks/useAuth';

type ListingRow = {
  id: number;
  kind?: string;
  price: string | number | null;
  dataSource?: string;
  status?: string;
  isPublished?: boolean;
  blockId?: number | null;
  apartment: {
    areaTotal: string | number | null;
    floor: number | null;
    roomType: { name: string } | null;
  } | null;
  house: {
    houseType: string | null;
    areaTotal: string | number | null;
    floorsCount: number | null;
  } | null;
  land: {
    areaSotki: string | number | null;
    landCategory: string | null;
    hasCommunications: boolean | null;
  } | null;
  commercial: {
    commercialType: string | null;
    area: string | number | null;
    floor: number | null;
    hasSeparateEntrance: boolean | null;
  } | null;
  parking: {
    parkingType: string | null;
    area: string | number | null;
    floor: number | null;
    number: string | null;
  } | null;
};

interface Paginated {
  data: ListingRow[];
  meta: { page: number; per_page: number; total: number; total_pages: number };
}

type RegionRow = { id: number; code: string; name: string };
type ListingStatus = 'DRAFT' | 'ACTIVE' | 'SOLD' | 'RESERVED';

function parseApiErrorMessage(e: unknown, fallback: string): string {
  let msg = fallback;
  if (e instanceof ApiError) {
    try {
      const j = JSON.parse(e.message) as { message?: string | string[] };
      if (Array.isArray(j.message)) msg = j.message.join(', ');
      else if (typeof j.message === 'string') msg = j.message;
    } catch {
      if (e.message) msg = e.message;
    }
  } else if (e instanceof Error) {
    msg = e.message;
  }
  return msg;
}

export default function AdminListings() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const [page, setPage] = useState(1);
  const [sourceTab, setSourceTab] = useState<'feed' | 'manual'>('feed');
  const [kindTab, setKindTab] = useState<'APARTMENT' | 'HOUSE' | 'LAND' | 'COMMERCIAL' | 'PARKING'>('APARTMENT');
  const perPage = 30;
  const canManage = user?.role === 'admin' || user?.role === 'editor';

  const { data: regions } = useQuery({
    queryKey: ['regions'],
    queryFn: () => apiGet<RegionRow[]>('/regions'),
    staleTime: 60 * 60 * 1000,
  });

  const regionIdDefault =
    regions?.find((r) => (r.code ?? '').toLowerCase() === 'msk')?.id ?? regions?.[0]?.id;

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'listings', regionIdDefault, page, sourceTab, kindTab],
    queryFn: () => {
      const sp = new URLSearchParams({
        region_id: String(regionIdDefault),
        page: String(page),
        per_page: String(perPage),
        kind: kindTab,
        data_source: sourceTab === 'feed' ? 'FEED' : 'MANUAL',
      });
      if (sourceTab === 'feed') sp.set('status', 'ACTIVE');
      return apiGet<Paginated>(`/admin/listings?${sp}`);
    },
    enabled: regionIdDefault != null,
    staleTime: 20_000,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiDelete(`/admin/listings/${id}`),
    onSuccess: async () => {
      toast.success('Объявление удалено');
      await qc.invalidateQueries({ queryKey: ['admin', 'listings'] });
    },
    onError: (e: unknown) => {
      toast.error(parseApiErrorMessage(e, 'Ошибка удаления'));
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, patch }: { id: number; patch: { status?: ListingStatus; isPublished?: boolean } }) =>
      apiPatch(`/admin/listings/${id}`, patch),
    onSuccess: async () => {
      toast.success('Объявление обновлено');
      await qc.invalidateQueries({ queryKey: ['admin', 'listings'] });
    },
    onError: (e: unknown) => {
      toast.error(parseApiErrorMessage(e, 'Ошибка обновления'));
    },
  });

  const rows = data?.data ?? [];
  const meta = data?.meta;

  return (
    <div className="p-6 max-w-6xl">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <Home className="w-6 h-6 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">
              {kindTab === 'APARTMENT'
                ? 'Квартиры'
                : kindTab === 'HOUSE'
                  ? 'Дома'
                  : kindTab === 'LAND'
                    ? 'Участки'
                    : kindTab === 'COMMERCIAL'
                      ? 'Коммерция'
                      : 'Паркинг'}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Витрина из фида и ручные объявления (<code className="text-xs bg-muted px-1 rounded">MANUAL</code>).
              Ручные: создание и правка на отдельной странице; импорт TrendAgent не перезаписывает их по{' '}
              <code className="text-xs bg-muted px-1 rounded">external_id</code>.
            </p>
          </div>
        </div>
        {sourceTab === 'manual' ? (
          canManage ? (
            <Button type="button" className="shrink-0" asChild>
              <Link
                to={
                  kindTab === 'APARTMENT'
                    ? '/admin/listings/manual/new'
                    : kindTab === 'HOUSE'
                      ? '/admin/listings/manual-house/new'
                      : kindTab === 'LAND'
                        ? '/admin/listings/manual-land/new'
                        : kindTab === 'COMMERCIAL'
                          ? '/admin/listings/manual-commercial/new'
                          : '/admin/listings/manual-parking/new'
                }
              >
                <Plus className="w-4 h-4 mr-2" />
                {kindTab === 'APARTMENT'
                  ? 'Ручная квартира'
                  : kindTab === 'HOUSE'
                    ? 'Ручной дом'
                    : kindTab === 'LAND'
                      ? 'Ручной участок'
                      : kindTab === 'COMMERCIAL'
                        ? 'Ручная коммерция'
                        : 'Ручной паркинг'}
              </Link>
            </Button>
          ) : (
            <Button type="button" className="shrink-0" disabled>
              <Plus className="w-4 h-4 mr-2" />
              {kindTab === 'APARTMENT'
                ? 'Ручная квартира'
                : kindTab === 'HOUSE'
                  ? 'Ручной дом'
                  : kindTab === 'LAND'
                    ? 'Ручной участок'
                    : kindTab === 'COMMERCIAL'
                      ? 'Ручная коммерция'
                      : 'Ручной паркинг'}
            </Button>
          )
        ) : null}
      </div>

      <div className="flex gap-2 mb-4 border-b">
        <button
          type="button"
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
            kindTab === 'APARTMENT'
              ? 'border-primary text-foreground'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
          onClick={() => {
            setKindTab('APARTMENT');
            setPage(1);
          }}
        >
          Квартиры
        </button>
        <button
          type="button"
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
            kindTab === 'LAND'
              ? 'border-primary text-foreground'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
          onClick={() => {
            setKindTab('LAND');
            setPage(1);
          }}
        >
          Участки
        </button>
        <button
          type="button"
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
            kindTab === 'HOUSE'
              ? 'border-primary text-foreground'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
          onClick={() => {
            setKindTab('HOUSE');
            setPage(1);
          }}
        >
          Дома
        </button>
        <button
          type="button"
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
            kindTab === 'COMMERCIAL'
              ? 'border-primary text-foreground'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
          onClick={() => {
            setKindTab('COMMERCIAL');
            setPage(1);
          }}
        >
          Коммерция
        </button>
        <button
          type="button"
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
            kindTab === 'PARKING'
              ? 'border-primary text-foreground'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
          onClick={() => {
            setKindTab('PARKING');
            setPage(1);
          }}
        >
          Паркинг
        </button>
        <button
          type="button"
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
            sourceTab === 'feed'
              ? 'border-primary text-foreground'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
          onClick={() => {
            setSourceTab('feed');
            setPage(1);
          }}
        >
          Из фида (FEED)
        </button>
        <button
          type="button"
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
            sourceTab === 'manual'
              ? 'border-primary text-foreground'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
          onClick={() => {
            setSourceTab('manual');
            setPage(1);
          }}
        >
          Ручные (MANUAL)
        </button>
      </div>

      {isLoading && (
        <div className="flex justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      )}

      {!isLoading && rows.length === 0 && (
        <div className="border rounded-2xl p-8 text-center text-muted-foreground text-sm">Нет записей</div>
      )}

      {rows.length > 0 && (
        <div className="bg-background border rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs text-muted-foreground">
                  <th className="px-4 py-3 font-medium">ID</th>
                  <th className="px-4 py-3 font-medium">Источник</th>
                  <th className="px-4 py-3 font-medium">
                    {kindTab === 'APARTMENT'
                      ? 'Комн.'
                      : kindTab === 'HOUSE'
                        ? 'Тип'
                        : kindTab === 'LAND'
                          ? 'Категория'
                          : kindTab === 'COMMERCIAL'
                            ? 'Тип'
                            : 'Тип'}
                  </th>
                  <th className="px-4 py-3 font-medium">Площадь</th>
                  <th className="px-4 py-3 font-medium">
                    {kindTab === 'APARTMENT'
                      ? 'Этаж'
                      : kindTab === 'HOUSE'
                        ? 'Этажей'
                        : kindTab === 'LAND'
                          ? 'Комм.'
                          : kindTab === 'COMMERCIAL'
                            ? 'Этаж'
                            : 'Место'}
                  </th>
                  <th className="px-4 py-3 font-medium">Статус</th>
                  <th className="px-4 py-3 font-medium text-center">Публ.</th>
                  <th className="px-4 py-3 font-medium text-right">Цена</th>
                  <th className="px-4 py-3 font-medium text-center">Сайт</th>
                  {sourceTab === 'manual' ? (
                    <th className="px-4 py-3 font-medium text-right">Действия</th>
                  ) : null}
                </tr>
              </thead>
              <tbody className="divide-y">
                {rows.map((r) => {
                  const priceN = r.price != null ? Number(r.price) : 0;
                  const area = kindTab === 'APARTMENT'
                    ? (r.apartment?.areaTotal != null ? Number(r.apartment.areaTotal) : null)
                    : kindTab === 'HOUSE'
                      ? (r.house?.areaTotal != null ? Number(r.house.areaTotal) : null)
                      : kindTab === 'LAND'
                        ? (r.land?.areaSotki != null ? Number(r.land.areaSotki) : null)
                        : kindTab === 'COMMERCIAL'
                          ? (r.commercial?.area != null ? Number(r.commercial.area) : null)
                          : (r.parking?.area != null ? Number(r.parking.area) : null);
                  const isManual = (r.dataSource ?? '').toUpperCase() === 'MANUAL';
                  return (
                    <tr key={r.id} className="hover:bg-muted/40">
                      <td className="px-4 py-2 text-muted-foreground text-xs">{r.id}</td>
                      <td className="px-4 py-2 text-xs">{r.dataSource ?? '—'}</td>
                      <td className="px-4 py-2">
                        {kindTab === 'APARTMENT'
                          ? (r.apartment?.roomType?.name ?? '—')
                          : kindTab === 'HOUSE'
                            ? (r.house?.houseType ?? '—')
                            : kindTab === 'LAND'
                              ? (r.land?.landCategory ?? '—')
                              : kindTab === 'COMMERCIAL'
                                ? (r.commercial?.commercialType ?? '—')
                                : (r.parking?.parkingType ?? '—')}
                      </td>
                      <td className="px-4 py-2">
                        {area != null && Number.isFinite(area)
                          ? `${area} ${kindTab === 'LAND' ? 'сот.' : 'м²'}`
                          : '—'}
                      </td>
                      <td className="px-4 py-2">
                        {kindTab === 'APARTMENT'
                          ? (r.apartment?.floor ?? '—')
                          : kindTab === 'HOUSE'
                            ? (r.house?.floorsCount ?? '—')
                            : kindTab === 'LAND'
                              ? (r.land?.hasCommunications == null ? '—' : r.land.hasCommunications ? 'Да' : 'Нет')
                              : kindTab === 'COMMERCIAL'
                                ? (r.commercial?.floor ?? '—')
                                : (r.parking?.number ?? '—')}
                      </td>
                      <td className="px-4 py-2">
                        <select
                          className="h-8 rounded-md border bg-background px-2 text-xs"
                          value={(r.status ?? 'DRAFT') as ListingStatus}
                          disabled={updateMutation.isPending || !canManage}
                          onChange={(e) =>
                            updateMutation.mutate({
                              id: r.id,
                              patch: { status: e.target.value as ListingStatus },
                            })
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
                          disabled={updateMutation.isPending || !canManage}
                          onChange={(e) =>
                            updateMutation.mutate({
                              id: r.id,
                              patch: { isPublished: e.target.checked },
                            })
                          }
                        />
                      </td>
                      <td className="px-4 py-2 text-right font-medium">
                        {priceN > 0 ? `${(priceN / 1_000_000).toFixed(1)} млн` : '—'}
                      </td>
                      <td className="px-4 py-2 text-center">
                        {kindTab === 'APARTMENT' ? (
                          <Link
                            to={`/apartment/${r.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary inline-flex justify-center"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </Link>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      {sourceTab === 'manual' && isManual && canManage ? (
                        <td className="px-4 py-2 text-right whitespace-nowrap">
                          <Link
                            to={
                              kindTab === 'APARTMENT'
                                ? `/admin/listings/manual/${r.id}/edit`
                                : kindTab === 'HOUSE'
                                  ? `/admin/listings/manual-house/${r.id}/edit`
                                  : kindTab === 'LAND'
                                    ? `/admin/listings/manual-land/${r.id}/edit`
                                    : kindTab === 'COMMERCIAL'
                                      ? `/admin/listings/manual-commercial/${r.id}/edit`
                                      : `/admin/listings/manual-parking/${r.id}/edit`
                            }
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
                        </td>
                      ) : sourceTab === 'manual' ? (
                        <td className="px-4 py-2" />
                      ) : null}
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
