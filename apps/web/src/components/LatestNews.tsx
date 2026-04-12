import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { apiGet } from '@/lib/api';
import { useSiteSettings } from '@/redesign/hooks/useSiteSettings';

type NewsRow = {
  id: number;
  slug: string;
  title: string;
  imageUrl: string | null;
  source: string | null;
  publishedAt: string | null;
};

type NewsResponse = {
  data: NewsRow[];
  meta: { page: number; per_page: number; total: number; total_pages: number };
};

function formatNewsDate(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' });
}

function newsPerPage(map: Map<string, string> | undefined): number {
  const raw = map?.get('home_news_per_page');
  const n = parseInt(String(raw ?? '').trim(), 10);
  return Number.isFinite(n) && n > 0 && n <= 24 ? n : 4;
}

const LatestNews = () => {
  const { data: siteMap } = useSiteSettings();
  const perPage = newsPerPage(siteMap);

  const { data, isLoading } = useQuery({
    queryKey: ['news', 'home', perPage],
    queryFn: () => apiGet<NewsResponse>(`/news?per_page=${perPage}&page=1`),
    staleTime: 60_000,
  });

  const items = data?.data ?? [];
  const fallback = !isLoading && items.length === 0;

  return (
    <section className="py-8 sm:py-12">
      <div className="max-w-[1400px] mx-auto px-4">
        <div className="flex items-center justify-between mb-4 sm:mb-6">
          <h2 className="text-base sm:text-xl font-bold">Последние новости</h2>
          <Link
            to="/news"
            className="hidden sm:flex items-center gap-1.5 px-3.5 py-2 rounded-full border border-border text-xs sm:text-sm font-medium hover:bg-secondary transition-colors"
          >
            Все новости
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {isLoading && (
          <div className="text-sm text-muted-foreground py-8 text-center">Загрузка новостей…</div>
        )}

        {fallback && (
          <p className="text-sm text-muted-foreground text-center py-8">
            Новостей пока нет — добавьте публикации в разделе «Новости» админ-панели.
          </p>
        )}

        {!isLoading && items.length > 0 && (
          <>
            <div className="hidden sm:grid sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              {items.map((n) => (
                <Link
                  key={n.id}
                  to={`/news/${encodeURIComponent(n.slug)}`}
                  className="rounded-xl overflow-hidden bg-card border border-border hover:shadow-md hover:-translate-y-px transition-all duration-200 group"
                >
                  <div className="overflow-hidden h-[160px] bg-muted">
                    {n.imageUrl ? (
                      <img
                        src={n.imageUrl}
                        alt=""
                        className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-200"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground px-2 text-center">
                        Без фото
                      </div>
                    )}
                  </div>
                  <div className="p-3">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold leading-tight bg-accent text-accent-foreground mb-1.5">
                      {n.source || 'Новости'}
                    </span>
                    <h3 className="font-semibold text-sm leading-tight line-clamp-2">{n.title}</h3>
                    <span className="text-[11px] text-muted-foreground mt-0.5 block">
                      {formatNewsDate(n.publishedAt)}
                    </span>
                  </div>
                </Link>
              ))}
            </div>

            <div className="flex sm:hidden gap-3 overflow-x-auto snap-x snap-mandatory scrollbar-hide -mx-4 px-4">
              {items.map((n) => (
                <Link
                  key={n.id}
                  to={`/news/${encodeURIComponent(n.slug)}`}
                  className="min-w-[260px] snap-start shrink-0 rounded-xl overflow-hidden bg-card border border-border hover:shadow-md transition-all duration-200 group"
                >
                  <div className="overflow-hidden h-[140px] bg-muted">
                    {n.imageUrl ? (
                      <img
                        src={n.imageUrl}
                        alt=""
                        className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-200"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground">Нет фото</div>
                    )}
                  </div>
                  <div className="p-3">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold leading-tight bg-accent text-accent-foreground mb-1.5">
                      {n.source || 'Новости'}
                    </span>
                    <h3 className="font-semibold text-sm leading-tight line-clamp-2">{n.title}</h3>
                    <span className="text-[11px] text-muted-foreground mt-0.5 block">
                      {formatNewsDate(n.publishedAt)}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </>
        )}

        <Link
          to="/news"
          className="flex sm:hidden items-center justify-center gap-1.5 mt-3 py-2 rounded-xl border border-border text-xs font-medium hover:bg-secondary transition-colors"
        >
          Все новости
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </section>
  );
};

export default LatestNews;
