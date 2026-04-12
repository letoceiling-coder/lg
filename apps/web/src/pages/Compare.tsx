import { Link } from 'react-router-dom';
import { useQueries } from '@tanstack/react-query';
import { useCompare } from '@/shared/hooks/useCompare';
import RedesignHeader from '@/redesign/components/RedesignHeader';
import FooterSection from '@/components/FooterSection';
import { Trash2, MapPin } from 'lucide-react';
import { apiGetOrNull } from '@/lib/api';
import type { ApiBlockDetail } from '@/redesign/lib/blocks-from-api';
import { formatPrice } from '@/redesign/data/mock-data';

const PLACEHOLDER = '/placeholder.svg';

const Compare = () => {
  const { ids, remove, clear } = useCompare();

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
                        <button
                          type="button"
                          onClick={() => remove(id)}
                          className="text-muted-foreground hover:text-destructive shrink-0 p-1"
                          aria-label="Убрать из сравнения"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
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
          </div>
        )}
      </div>
      <FooterSection />
    </div>
  );
};

export default Compare;
