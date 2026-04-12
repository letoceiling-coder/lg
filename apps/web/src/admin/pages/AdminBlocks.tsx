import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Building2, Loader2, ChevronLeft, ChevronRight, ExternalLink, Search, Plus, Pencil } from 'lucide-react';
import { apiGet } from '@/lib/api';

interface BlockRow {
  id: number;
  name: string;
  slug: string;
  isPublished: boolean;
  isPromoted: boolean;
  listingPriceMin: number | null;
  listingPriceMax: number | null;
  addresses: { address: string }[];
  _count?: { buildings: number; listings: number };
}

interface PaginatedResult {
  data: BlockRow[];
  meta: { page: number; per_page: number; total: number; total_pages: number };
}

export default function AdminBlocks() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const perPage = 25;

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'blocks', page, search],
    queryFn: () => {
      const sp = new URLSearchParams({ page: String(page), per_page: String(perPage), sort: 'name_asc' });
      if (search.trim()) sp.set('search', search.trim());
      return apiGet<PaginatedResult>(`/admin/blocks?${sp}`);
    },
    staleTime: 30_000,
  });

  const meta = data?.meta;
  const rows = data?.data ?? [];

  return (
    <div className="p-6 max-w-6xl">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Building2 className="w-6 h-6 text-primary" />
          <h1 className="text-2xl font-bold">Жилые комплексы</h1>
          {meta && <span className="text-sm text-muted-foreground ml-2">({meta.total})</span>}
        </div>
        <Link
          to="/admin/blocks/new"
          className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-xl text-sm font-medium hover:bg-primary/90"
        >
          <Plus className="w-4 h-4" />
          Добавить ЖК
        </Link>
      </div>

      <div className="relative mb-5 max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="Поиск по названию..."
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(1); }}
          className="border rounded-xl px-3 py-2 pl-9 text-sm w-full bg-background"
        />
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      )}

      {!isLoading && rows.length === 0 && (
        <div className="bg-background border rounded-2xl p-12 text-center text-sm text-muted-foreground">
          Нет комплексов
        </div>
      )}

      {rows.length > 0 && (
        <div className="bg-background border rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs text-muted-foreground">
                  <th className="px-4 py-3 font-medium">ID</th>
                  <th className="px-4 py-3 font-medium">Название</th>
                  <th className="px-4 py-3 font-medium">Адрес</th>
                  <th className="px-4 py-3 font-medium text-center">Опубл.</th>
                  <th className="px-4 py-3 font-medium text-right">Мин. цена</th>
                  <th className="px-4 py-3 font-medium text-center">Действия</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {rows.map(b => (
                  <tr key={b.id} className="hover:bg-muted/50 transition-colors">
                    <td className="px-4 py-3 text-muted-foreground text-xs">{b.id}</td>
                    <td className="px-4 py-3">
                      <span className="font-medium">{b.name}</span>
                      <p className="text-[11px] text-muted-foreground mt-0.5">{b.slug}</p>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground max-w-[200px] truncate">
                      {b.addresses?.[0]?.address ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-block w-2 h-2 rounded-full ${b.isPublished ? 'bg-green-500' : 'bg-muted-foreground/30'}`} />
                    </td>
                    <td className="px-4 py-3 text-right text-xs text-muted-foreground">
                      {b.listingPriceMin ? `${(b.listingPriceMin / 1_000_000).toFixed(1)} млн` : '—'}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="inline-flex items-center gap-2">
                        <Link
                          to={`/admin/blocks/${b.id}`}
                          className="text-muted-foreground hover:text-primary p-1 rounded-md hover:bg-muted"
                          title="Редактировать"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </Link>
                        <a href={`/complex/${b.slug}`} target="_blank" rel="noopener noreferrer" className="text-primary hover:text-primary/80 p-1" title="На сайте">
                          <ExternalLink className="w-3.5 h-3.5 inline" />
                        </a>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {meta && meta.total_pages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t text-sm">
              <span className="text-muted-foreground">Стр. {meta.page} из {meta.total_pages}</span>
              <div className="flex items-center gap-2">
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1} className="p-1.5 rounded-lg hover:bg-muted disabled:opacity-30 transition-colors">
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button onClick={() => setPage(p => Math.min(meta.total_pages, p + 1))} disabled={page >= meta.total_pages} className="p-1.5 rounded-lg hover:bg-muted disabled:opacity-30 transition-colors">
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
