import { Link } from 'react-router-dom';
import { useQueries } from '@tanstack/react-query';
import { useCompare } from '@/shared/hooks/useCompare';
import { useAuth } from '@/shared/hooks/useAuth';
import { useFavorites } from '@/shared/hooks/useFavorites';
import RedesignHeader from '@/redesign/components/RedesignHeader';
import FooterSection from '@/components/FooterSection';
import { Trash2, MapPin, Heart } from 'lucide-react';
import { cn } from '@/lib/utils';
import { apiGetOrNull } from '@/lib/api';
import type { ApiBlockDetail } from '@/redesign/lib/blocks-from-api';
import { formatPrice } from '@/redesign/data/mock-data';

const PLACEHOLDER = '/placeholder.svg';

const STATUS_LABEL: Record<string, string> = {
  BUILDING: 'Строится',
  COMPLETED: 'Сдан',
  PROJECT: 'Проект',
};

const DATA_SOURCE_LABEL: Record<string, string> = {
  FEED: 'Фид',
  MANUAL: 'Вручную',
};

function formatDateRu(iso: string | Date | null | undefined): string {
  if (iso == null || iso === '') return '—';
  const d = typeof iso === 'string' ? new Date(iso) : iso;
  if (Number.isNaN(d.getTime())) return '—';
  return new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' }).format(d);
}

function formatDeadline(iso: string | Date | null | undefined): string {
  if (iso == null || iso === '') return '';
  const d = typeof iso === 'string' ? new Date(iso) : iso;
  if (Number.isNaN(d.getTime())) return '';
  return new Intl.DateTimeFormat('ru-RU', { month: 'short', year: 'numeric' }).format(d);
}

function metroLine(b: ApiBlockDetail | undefined): string {
  if (!b?.subways?.length) return '—';
  return b.subways
    .slice(0, 4)
    .map((s) => {
      const name = s.subway?.name ?? '';
      const t = s.distanceTime != null ? `${s.distanceTime} мин` : '';
      return t ? `${name} (${t})` : name;
    })
    .filter(Boolean)
    .join(', ');
}

function addressLine(b: ApiBlockDetail | undefined): string {
  const list = b?.addresses?.map((a) => a.address).filter(Boolean) ?? [];
  if (!list.length) return '—';
  return list.slice(0, 2).join('; ');
}

function buildingsLine(b: ApiBlockDetail | undefined): string {
  const list = b?.buildings ?? [];
  if (!list.length) return '—';
  return list
    .slice(0, 5)
    .map((x) => {
      const parts = [x.name, x.queue].filter(Boolean).join(', ');
      const dl = formatDeadline(x.deadline);
      const tail = dl ? ` — ${dl}` : '';
      return `${parts || 'Корпус'}${tail}`;
    })
    .join('; ');
}

function priceRange(b: ApiBlockDetail | undefined): string {
  if (!b) return '—';
  const min = b.listingPriceMin != null ? Math.round(Number(b.listingPriceMin)) : 0;
  const max = b.listingPriceMax != null ? Math.round(Number(b.listingPriceMax)) : 0;
  if (min <= 0 && max <= 0) return '—';
  if (max > 0 && max !== min) return `${formatPrice(min)} — ${formatPrice(max)}`;
  return min > 0 ? `от ${formatPrice(min)}` : '—';
}

const COMPARE_ROWS: { label: string; get: (b: ApiBlockDetail | undefined) => string }[] = [
  { label: 'Регион', get: (x) => x?.region?.name ?? '—' },
  { label: 'Район', get: (x) => x?.district?.name ?? '—' },
  { label: 'Статус ЖК', get: (x) => (x?.status ? STATUS_LABEL[x.status] ?? x.status : '—') },
  { label: 'Старт продаж', get: (x) => formatDateRu(x?.salesStartDate) },
  { label: 'Застройщик', get: (x) => x?.builder?.name ?? '—' },
  { label: 'Адрес', get: addressLine },
  { label: 'Метро', get: metroLine },
  { label: 'Квартир в продаже', get: (x) => (x?._count?.listings != null ? String(x._count.listings) : '—') },
  { label: 'Цена (квартиры)', get: priceRange },
  { label: 'Корпуса и сроки', get: buildingsLine },
  { label: 'Источник данных', get: (x) => (x?.dataSource ? DATA_SOURCE_LABEL[x.dataSource] ?? x.dataSource : '—') },
];

const Compare = () => {
  const { ids, remove, clear } = useCompare();
  const { isAuthenticated } = useAuth();
  const { isBlockFavorite, toggleBlock } = useFavorites();

  const queries = useQueries({
    queries: ids.map((id) => ({
      queryKey: ['block', 'compare', id],
      queryFn: () => apiGetOrNull<ApiBlockDetail>(`/blocks/${encodeURIComponent(id)}`),
      enabled: ids.length > 0,
      staleTime: 60_000,
    })),
  });

  const loading = queries.some((q) => q.isPending);
  const anyError = queries.some((q) => q.isError);

  return (
    <div className="min-h-screen bg-background pb-16 lg:pb-0">
      <RedesignHeader />
      <div className="max-w-[1400px] mx-auto px-4 py-8 sm:py-12">
        <h1 className="text-2xl sm:text-3xl font-bold mb-6">Сравнение объектов</h1>
        {ids.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-muted-foreground mb-4">Добавьте жилые комплексы из каталога (кнопка «Сравнить» на карточке)</p>
            <Link to="/catalog" className="text-primary font-medium hover:underline">Перейти в каталог</Link>
          </div>
        ) : (
          <div>
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-muted-foreground">{ids.length} из 3 ЖК</p>
              <button type="button" onClick={clear} className="text-sm text-destructive hover:underline">
                Очистить
              </button>
            </div>
            {loading ? (
              <p className="text-sm text-muted-foreground py-8">Загрузка данных…</p>
            ) : anyError ? (
              <p className="text-sm text-destructive py-4">Часть объектов не удалось загрузить. Проверьте ссылку или обновите страницу.</p>
            ) : null}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {ids.map((id, idx) => {
                const q = queries[idx];
                const b = q?.data;
                const img = b?.images?.[0]?.url ?? PLACEHOLDER;
                const priceMin = b?.listingPriceMin != null ? Math.round(Number(b.listingPriceMin)) : 0;
                const district = b?.district?.name ?? '—';
                const slug = b?.slug ?? id;

                return (
                  <div key={id} className="bg-card border border-border rounded-xl overflow-hidden flex flex-col">
                    <div className="aspect-[16/10] bg-muted">
                      <img src={img} alt="" className="w-full h-full object-cover" />
                    </div>
                    <div className="p-4 flex-1 flex flex-col">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        {b ? (
                          <Link to={`/complex/${slug}`} className="font-medium text-sm hover:text-primary line-clamp-2">
                            {b.name}
                          </Link>
                        ) : (
                          <p className="font-medium text-sm">ЖК #{id}</p>
                        )}
                        <div className="flex items-center gap-0.5 shrink-0">
                          {b ? (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.preventDefault();
                                void toggleBlock(b.id);
                              }}
                              className={cn(
                                'p-1 rounded-md transition-colors',
                                isBlockFavorite(b.id) ? 'text-red-500' : 'text-muted-foreground hover:text-red-500',
                              )}
                              aria-label={isBlockFavorite(b.id) ? 'Убрать из избранного' : 'В избранное'}
                              title={
                                isAuthenticated
                                  ? isBlockFavorite(b.id)
                                    ? 'Убрать из избранного'
                                    : 'В избранное'
                                  : 'В избранное (локально до входа; после входа синхронизируется)'
                              }
                            >
                              <Heart className={cn('w-4 h-4', isBlockFavorite(b.id) && 'fill-current')} />
                            </button>
                          ) : null}
                          <button
                            type="button"
                            onClick={() => remove(id)}
                            className="text-muted-foreground hover:text-destructive p-1"
                            aria-label="Убрать из сравнения"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                      {!b && !q?.isPending ? (
                        <p className="text-xs text-muted-foreground">Объект не найден в каталоге</p>
                      ) : (
                        <>
                          <p className="text-xs text-muted-foreground flex items-center gap-1 mb-2">
                            <MapPin className="w-3 h-3 shrink-0" />
                            {district}
                          </p>
                          <p className="text-sm font-semibold text-primary mt-auto">
                            {priceMin > 0 ? `от ${formatPrice(priceMin)}` : '—'}
                          </p>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {!loading && ids.length > 0 && (
              <div className="mt-10">
                <h2 className="text-lg font-semibold mb-3">Параметры</h2>
                <div className="overflow-x-auto rounded-xl border border-border">
                  <table className="w-full text-sm border-collapse min-w-[640px]">
                    <thead>
                      <tr className="bg-muted/50 border-b border-border">
                        <th className="text-left font-medium p-3 w-[160px] sm:w-[200px] sticky left-0 bg-muted/50 z-[1] border-r border-border">
                          Параметр
                        </th>
                        {ids.map((id, idx) => {
                          const b = queries[idx]?.data;
                          const slug = b?.slug ?? id;
                          return (
                            <th key={id} className="text-left font-medium p-3 min-w-[140px] align-bottom">
                              {b ? (
                                <Link to={`/complex/${slug}`} className="hover:text-primary line-clamp-2">
                                  {b.name}
                                </Link>
                              ) : (
                                <span className="text-muted-foreground">ЖК #{id}</span>
                              )}
                            </th>
                          );
                        })}
                      </tr>
                    </thead>
                    <tbody>
                      {COMPARE_ROWS.map((row) => (
                        <tr key={row.label} className="border-b border-border last:border-0">
                          <td className="p-3 text-muted-foreground sticky left-0 bg-background z-[1] border-r border-border text-xs sm:text-sm">
                            {row.label}
                          </td>
                          {ids.map((id, idx) => (
                            <td key={`${row.label}-${id}`} className="p-3 align-top text-xs sm:text-sm">
                              {row.get(queries[idx]?.data)}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
      <FooterSection />
    </div>
  );
};

export default Compare;
