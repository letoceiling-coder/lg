import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import RedesignHeader from '@/redesign/components/RedesignHeader';
import FooterSection from '@/components/FooterSection';
import { Heart, Printer, FolderPlus } from 'lucide-react';
import { formatPrice } from '@/redesign/data/mock-data';
import { Button } from '@/components/ui/button';
import { useFavorites } from '@/shared/hooks/useFavorites';
import { useAuth } from '@/shared/hooks/useAuth';
import { apiGet, apiGetOrNull, apiPost } from '@/lib/api';
import { toast } from '@/components/ui/sonner';
import ListingCard, { type ApiListingCardRow } from '@/redesign/components/ListingCard';
import ComplexCard from '@/redesign/components/ComplexCard';
import { mapApiBlockDetailToResidentialComplex, type ApiBlockDetail } from '@/redesign/lib/blocks-from-api';
import type { ResidentialComplex } from '@/redesign/data/types';



const FavoriteBlockCard = ({ blockId, slug, name }: { blockId: number; slug?: string | null; name: string }) => {
  const slugOrId = (slug && slug.trim()) ? slug.trim() : String(blockId);

  const q = useQuery({
    queryKey: ['favorite-block', slugOrId],
    queryFn: () => apiGetOrNull<ApiBlockDetail>(`/blocks/${encodeURIComponent(slugOrId)}`),
  });

  if (q.isLoading) {
    return <div className="rounded-2xl border border-border bg-card h-[420px]" />;
  }

  const apiBlock = q.data;
  if (!apiBlock) {
    return (
      <Link
        to={`/complex/${slugOrId}`}
        className="block rounded-2xl border border-border bg-card p-4 hover:shadow-sm transition-shadow"
      >
        <div className="font-semibold text-sm line-clamp-2">{name}</div>
        <div className="text-xs text-muted-foreground mt-1">Жилой комплекс</div>
      </Link>
    );
  }

  const complex = mapApiBlockDetailToResidentialComplex(apiBlock, []);
  return <ComplexCard complex={complex} />;
};
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
  const [addingItemId, setAddingItemId] = useState<number | null>(null);
  const rows = favorites ?? [];

  const collectionsQuery = useQuery({
    queryKey: ['collections'],
    queryFn: () => apiGet<Array<{ id: string; name: string }>>('/collections'),
    enabled: isAuthenticated,
  });

  const ensureCollectionByName = async (rawName: string): Promise<{ id: string; name: string }> => {
    const name = rawName.trim();
    const existing = collectionsQuery.data?.find((c) => c.name.toLowerCase() === name.toLowerCase());
    if (existing) return existing;
    return apiPost<{ id: string; name: string }>('/collections', { name });
  };

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

  const saveSingleFavoriteToCollection = async (row: (typeof rows)[number]) => {
    if (!isAuthenticated) return;
    const suggested = collectionsQuery.data?.[0]?.name ?? '';
    const name = window.prompt('В какую подборку сохранить объект? (введите название существующей или новой)', suggested);
    if (!name?.trim()) return;
    setAddingItemId(row.id);
    try {
      const col = await ensureCollectionByName(name);
      let added = 0;
      if (row.blockId != null) {
        try {
          await apiPost(`/collections/${col.id}/items`, { kind: 'BLOCK', entityId: row.blockId });
          added += 1;
        } catch {
          /* duplicate */
        }
      } else if (row.listingId != null) {
        try {
          await apiPost(`/collections/${col.id}/items`, { kind: 'LISTING', entityId: row.listingId });
          added += 1;
        } catch {
          /* duplicate */
        }
      }
      void qc.invalidateQueries({ queryKey: ['collections'] });
      if (added > 0) toast.success(`Добавлено в подборку «${col.name}»`);
      else toast.message(`Объект уже есть в подборке «${col.name}»`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Не удалось добавить в подборку');
    } finally {
      setAddingItemId(null);
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
              const listing = row.listing as unknown as ApiListingCardRow | null;

              return (
                <div key={row.id} className="relative">
                  {row.blockId != null ? (
                    <FavoriteBlockCard blockId={row.blockId} slug={block?.slug} name={block?.name ?? `ЖК #${row.blockId}`} />
                  ) : listing ? (
                    <ListingCard listing={listing} />
                  ) : (
                    <div className="rounded-xl border border-border bg-card p-4">Неизвестный объект</div>
                  )}

                  <div className="print:hidden absolute bottom-2 right-2 z-10 flex items-center gap-1">
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      className="h-8 px-2 text-xs"
                      disabled={!isAuthenticated || addingItemId === row.id}
                      title={!isAuthenticated ? 'Войдите в аккаунт' : undefined}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        void saveSingleFavoriteToCollection(row);
                      }}
                    >
                      {addingItemId === row.id ? '…' : 'В подборку'}
                    </Button>
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      className="h-8 px-2 text-xs"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        void removeByFavoriteId(row.id);
                      }}
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
