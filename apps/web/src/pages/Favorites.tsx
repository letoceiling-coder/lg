import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import RedesignHeader from '@/redesign/components/RedesignHeader';
import FooterSection from '@/components/FooterSection';
import { Heart, Printer, FolderPlus } from 'lucide-react';
import { formatPrice } from '@/redesign/data/mock-data';
import { Button } from '@/components/ui/button';
import { useFavorites } from '@/shared/hooks/useFavorites';
import { useAuth } from '@/shared/hooks/useAuth';
import { apiPost } from '@/lib/api';
import { toast } from '@/components/ui/sonner';

function listingPrice(p: unknown): number {
  if (p == null) return 0;
  if (typeof p === 'number') return p;
  const n = Number(p);
  return Number.isFinite(n) ? n : 0;
}

const Favorites = () => {
  const { favorites, isLoading, removeByFavoriteId } = useFavorites();
  const { isAuthenticated } = useAuth();
  const qc = useQueryClient();
  const [savingCollection, setSavingCollection] = useState(false);
  const rows = favorites ?? [];

  const saveFavoritesAsCollection = async () => {
    if (!isAuthenticated || rows.length === 0) return;
    const name = window.prompt('Название новой подборки (в неё войдут все текущие избранные):');
    if (!name?.trim()) return;
    setSavingCollection(true);
    try {
      const col = await apiPost<{ id: string }>('/collections', { name: name.trim() });
      let added = 0;
      for (const row of rows) {
        if (row.blockId != null) {
          try {
            await apiPost(`/collections/${col.id}/items`, { kind: 'BLOCK', entityId: row.blockId });
            added += 1;
          } catch {
            /* дубликат или конфликт */
          }
        }
        if (row.listingId != null) {
          try {
            await apiPost(`/collections/${col.id}/items`, { kind: 'LISTING', entityId: row.listingId });
            added += 1;
          } catch {
            /* */
          }
        }
      }
      void qc.invalidateQueries({ queryKey: ['collections'] });
      toast.success(`Подборка «${name.trim()}» создана (позиций: ${added})`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Не удалось создать подборку');
    } finally {
      setSavingCollection(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-16 lg:pb-0 print:pb-0">
      <div className="print:hidden">
        <RedesignHeader />
      </div>
      <div className="max-w-[1400px] mx-auto px-4 py-8 sm:py-12 print:py-4">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold">Избранное</h1>
          {rows.length > 0 && (
            <div className="print:hidden flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => void saveFavoritesAsCollection()}
                disabled={savingCollection || !isAuthenticated}
                title={!isAuthenticated ? 'Войдите в аккаунт' : undefined}
                className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground disabled:opacity-50"
              >
                <FolderPlus className="w-4 h-4" />
                {savingCollection ? 'Сохранение…' : 'В подборку'}
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
              >
                <Printer className="w-4 h-4" /> Скачать подборку
              </button>
            </div>
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
                      className="print:hidden text-xs text-destructive hover:text-destructive h-8 px-0"
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
      <div className="print:hidden">
        <FooterSection />
      </div>
    </div>
  );
};

export default Favorites;
