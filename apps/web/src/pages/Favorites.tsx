import { Link } from 'react-router-dom';
import RedesignHeader from '@/redesign/components/RedesignHeader';
import FooterSection from '@/components/FooterSection';
import { Heart, Printer } from 'lucide-react';
import { formatPrice } from '@/redesign/data/mock-data';
import { Button } from '@/components/ui/button';
import { useFavorites } from '@/shared/hooks/useFavorites';

function listingPrice(p: unknown): number {
  if (p == null) return 0;
  if (typeof p === 'number') return p;
  const n = Number(p);
  return Number.isFinite(n) ? n : 0;
}

const Favorites = () => {
  const { favorites, isLoading, removeByFavoriteId } = useFavorites();
  const rows = favorites ?? [];

  return (
    <div className="min-h-screen bg-background pb-16 lg:pb-0">
      <RedesignHeader />
      <div className="max-w-[1400px] mx-auto px-4 py-8 sm:py-12">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold">Избранное</h1>
          {rows.length > 0 && (
            <button
              type="button"
              onClick={() => window.print()}
              className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
            >
              <Printer className="w-4 h-4" /> Скачать подборку
            </button>
          )}
        </div>
        {isLoading ? (
          <div className="flex justify-center py-20 text-muted-foreground text-sm">Загрузка…</div>
        ) : rows.length === 0 ? (
          <div className="text-center py-20">
            <Heart className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
            <p className="text-muted-foreground mb-4">У вас пока нет избранных объектов</p>
            <Link to="/catalog" className="text-primary font-medium hover:underline">Перейти в каталог</Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {rows.map((row) => {
              const block = row.block;
              const listing = row.listing;
              const title = block?.name ?? (listing ? `Объявление #${listing.id}` : `Запись #${row.id}`);
              const href = block
                ? `/complex/${block.slug}`
                : listing
                  ? `/apartment/${listing.id}`
                  : '#';
              const sub =
                listing && !block
                  ? `${listing.kind ?? 'объект'} · ${formatPrice(listingPrice(listing.price))}`
                  : block
                    ? 'Жилой комплекс'
                    : '';

              return (
                <div key={row.id} className="bg-card border border-border rounded-xl p-4 flex flex-col">
                  <Link to={href} className="font-medium text-sm mb-1 hover:text-primary line-clamp-2">
                    {title}
                  </Link>
                  {sub ? <p className="text-xs text-muted-foreground mb-3">{sub}</p> : null}
                  <div className="mt-auto pt-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-xs text-destructive hover:text-destructive h-8 px-0"
                      onClick={() => void removeByFavoriteId(row.id)}
                    >
                      Удалить
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      <FooterSection />
    </div>
  );
};

export default Favorites;
