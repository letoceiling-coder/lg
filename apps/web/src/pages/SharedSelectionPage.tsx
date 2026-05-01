import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import RedesignHeader from '@/redesign/components/RedesignHeader';
import FooterSection from '@/components/FooterSection';
import MissingPhotoPlaceholder from '@/redesign/components/MissingPhotoPlaceholder';
import { apiGet } from '@/lib/api';
import { formatListingPriceFromApi } from '@/redesign/data/mock-data';

type PublicSelectionItem = {
  id: string;
  kind: 'BLOCK' | 'LISTING';
  entityId: number;
  title: string;
  slug?: string | null;
  listingKind?: string | null;
  price?: string | number | null;
  imageUrl?: string | null;
  address?: string | null;
};

type PublicSelection = {
  name: string;
  items: PublicSelectionItem[];
};

export default function SharedSelectionPage() {
  const { token } = useParams<{ token: string }>();
  const selectionQuery = useQuery({
    queryKey: ['public-selection', token],
    queryFn: () => apiGet<PublicSelection>(`/selections/${encodeURIComponent(token ?? '')}`),
    enabled: Boolean(token),
    retry: false,
  });

  const selection = selectionQuery.data;

  return (
    <div className="min-h-screen bg-background">
      <RedesignHeader />
      <main className="mx-auto max-w-[1200px] px-4 py-8 sm:py-12">
        {selectionQuery.isLoading ? (
          <p className="text-sm text-muted-foreground">Загрузка подборки…</p>
        ) : selectionQuery.isError || !selection ? (
          <div className="rounded-2xl border border-border bg-card p-8 text-center">
            <h1 className="text-2xl font-bold">Подборка не найдена</h1>
            <p className="mt-2 text-sm text-muted-foreground">Ссылка могла быть удалена или введена с ошибкой.</p>
          </div>
        ) : (
          <>
            <div className="mb-6">
              <p className="text-sm text-muted-foreground">Публичная подборка LiveGrid</p>
              <h1 className="mt-1 text-2xl font-bold sm:text-3xl">{selection.name}</h1>
              <p className="mt-2 text-sm text-muted-foreground">Показано до 5 объектов. Для консультации откройте объект и оставьте заявку.</p>
            </div>
            {selection.items.length === 0 ? (
              <div className="rounded-2xl border border-border bg-card p-8 text-sm text-muted-foreground">Подборка пока пустая.</div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {selection.items.map((item) => {
                  const href = item.kind === 'BLOCK' && item.slug ? `/complex/${item.slug}` : `/listing/${item.entityId}`;
                  return (
                    <Link key={item.id} to={href} className="group overflow-hidden rounded-2xl border border-border bg-card transition-all hover:-translate-y-px hover:shadow-md">
                      <div className="aspect-video bg-muted">
                        {item.imageUrl ? (
                          <img src={item.imageUrl} alt={item.title} className="h-full w-full object-cover" loading="lazy" />
                        ) : (
                          <MissingPhotoPlaceholder />
                        )}
                      </div>
                      <div className="space-y-2 p-4">
                        <div className="flex items-start justify-between gap-3">
                          <h2 className="line-clamp-2 text-sm font-semibold">{item.title}</h2>
                          <span className="shrink-0 rounded-full bg-muted px-2 py-1 text-[10px] text-muted-foreground">
                            {item.kind === 'BLOCK' ? 'ЖК' : 'Объявление'}
                          </span>
                        </div>
                        {item.address ? <p className="line-clamp-1 text-xs text-muted-foreground">{item.address}</p> : null}
                        <p className="text-sm font-bold text-primary">{formatListingPriceFromApi(item.price ?? null)}</p>
                        <span className="inline-block text-xs font-medium text-primary">Подробнее →</span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </>
        )}
      </main>
      <FooterSection />
    </div>
  );
}
