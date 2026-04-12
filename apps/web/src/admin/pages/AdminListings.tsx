import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Home, Loader2, ChevronLeft, ChevronRight, ExternalLink } from 'lucide-react';
import { apiGet } from '@/lib/api';

type ListingRow = {
  id: number;
  price: string | number | null;
  blockId: number | null;
  apartment: {
    areaTotal: string | number | null;
    floor: number | null;
    roomType: { name: string } | null;
  } | null;
};

interface Paginated {
  data: ListingRow[];
  meta: { page: number; per_page: number; total: number; total_pages: number };
}

export default function AdminListings() {
  const [page, setPage] = useState(1);
  const perPage = 30;

  const { data: regionId } = useQuery({
    queryKey: ['regions'],
    queryFn: () => apiGet<Array<{ id: number; code: string }>>('/regions'),
    select: (rows) =>
      rows.find((r) => (r.code ?? '').toLowerCase() === 'msk')?.id ?? rows[0]?.id,
    staleTime: 60 * 60 * 1000,
  });

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'listings', regionId, page],
    queryFn: () => {
      const sp = new URLSearchParams({
        region_id: String(regionId),
        page: String(page),
        per_page: String(perPage),
        kind: 'APARTMENT',
        status: 'ACTIVE',
      });
      return apiGet<Paginated>(`/listings?${sp}`);
    },
    enabled: regionId != null,
    staleTime: 20_000,
  });

  const rows = data?.data ?? [];
  const meta = data?.meta;

  return (
    <div className="p-6 max-w-6xl">
      <div className="flex items-center gap-3 mb-6">
        <Home className="w-6 h-6 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">Квартиры (каталог)</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Просмотр объявлений из API. Редактирование объявлений из фида в интерфейсе — в разработке; источник правды —
            импорт TrendAgent.
          </p>
        </div>
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
                  <th className="px-4 py-3 font-medium">Комн.</th>
                  <th className="px-4 py-3 font-medium">Площадь</th>
                  <th className="px-4 py-3 font-medium">Этаж</th>
                  <th className="px-4 py-3 font-medium text-right">Цена</th>
                  <th className="px-4 py-3 font-medium text-center">Сайт</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {rows.map((r) => {
                  const price = r.price != null ? Number(r.price) : 0;
                  const area = r.apartment?.areaTotal != null ? Number(r.apartment.areaTotal) : null;
                  return (
                    <tr key={r.id} className="hover:bg-muted/40">
                      <td className="px-4 py-2 text-muted-foreground text-xs">{r.id}</td>
                      <td className="px-4 py-2">{r.apartment?.roomType?.name ?? '—'}</td>
                      <td className="px-4 py-2">{area != null && Number.isFinite(area) ? `${area} м²` : '—'}</td>
                      <td className="px-4 py-2">{r.apartment?.floor ?? '—'}</td>
                      <td className="px-4 py-2 text-right font-medium">
                        {price > 0 ? `${(price / 1_000_000).toFixed(1)} млн` : '—'}
                      </td>
                      <td className="px-4 py-2 text-center">
                        <Link
                          to={`/apartment/${r.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary inline-flex justify-center"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </Link>
                      </td>
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
