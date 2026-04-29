import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, Loader2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import Header from '@/redesign/components/RedesignHeader';
import FooterSection from '@/components/FooterSection';
import QuizSection from '@/components/QuizSection';
import AboutPlatform from '@/components/AboutPlatform';
import ContactsSection from '@/components/ContactsSection';
import { apiGet } from '@/lib/api';
import { stripHtmlToPlainText, truncatePlain } from '@/lib/html';
import { useDefaultRegionId } from '@/redesign/hooks/useDefaultRegionId';

import complex1 from '@/assets/complex-1.jpg';

interface NewsRow {
  id: number;
  slug: string;
  title: string;
  body: string | null;
  imageUrl: string | null;
  publishedAt: string | null;
  createdAt: string;
}

interface PaginatedResult {
  data: NewsRow[];
  meta: { page: number; per_page: number; total: number; total_pages: number };
}

const News = () => {
  const [page, setPage] = useState(1);
  const perPage = 20;
  const { data: regionId } = useDefaultRegionId();

  const { data, isLoading } = useQuery({
    queryKey: ['news', 'public', page, regionId ?? null],
    queryFn: () =>
      apiGet<PaginatedResult>(`/news?page=${page}&per_page=${perPage}${regionId != null ? `&region_id=${regionId}` : ''}`),
    enabled: regionId != null,
    staleTime: 60_000,
  });

  const rows = data?.data ?? [];
  const meta = data?.meta;

  return (
    <div className="min-h-screen bg-background pb-16 lg:pb-0">
      <Header />

      <div className="max-w-[1400px] mx-auto px-4 pt-4 pb-2">
        <nav className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <Link to="/" className="hover:text-foreground transition-colors">Главная</Link>
          <ChevronRight className="w-3.5 h-3.5" />
          <span className="text-foreground font-medium">Новости</span>
        </nav>
      </div>

      <div className="max-w-[1400px] mx-auto px-4 pb-6">
        <h1 className="text-3xl font-bold">Все новости</h1>
        {meta && <p className="text-sm text-muted-foreground mt-1">{meta.total} публикаций</p>}
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      )}

      {!isLoading && rows.length === 0 && (
        <div className="max-w-[1400px] mx-auto px-4 pb-10 text-center text-sm text-muted-foreground py-16">
          Новостей пока нет
        </div>
      )}

      {rows.length > 0 && (
        <div className="max-w-[1400px] mx-auto px-4 pb-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {rows.map((n) => (
              <Link
                key={n.id}
                to={`/news/${n.slug}`}
                className="rounded-2xl overflow-hidden bg-card border border-border hover:shadow-lg transition-shadow group flex flex-col"
              >
                <div className="aspect-[4/3] overflow-hidden relative">
                  <img
                    src={n.imageUrl || complex1}
                    alt={n.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                </div>
                <div className="p-3 flex flex-col flex-1">
                  <h3 className="font-semibold text-sm mb-1 leading-tight line-clamp-2">{n.title}</h3>
                  {n.body && (
                    <p className="text-xs text-muted-foreground mb-2 line-clamp-2">
                      {truncatePlain(stripHtmlToPlainText(n.body), 160)}
                    </p>
                  )}
                  <div className="mt-auto flex items-center text-xs text-muted-foreground">
                    <span>{new Date(n.publishedAt ?? n.createdAt).toLocaleDateString('ru-RU', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {meta && meta.total_pages > 1 && (
        <div className="max-w-[1400px] mx-auto px-4 pb-10">
          <div className="flex items-center gap-1">
            {Array.from({ length: Math.min(meta.total_pages, 10) }, (_, i) => i + 1).map((p) => (
              <button
                key={p}
                onClick={() => setPage(p)}
                className={`w-9 h-9 rounded-lg text-sm font-medium transition-colors ${
                  p === page
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-secondary text-foreground hover:bg-accent'
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>
      )}

      <QuizSection />
      <AboutPlatform />
      <ContactsSection />
      <FooterSection />
    </div>
  );
};

export default News;
