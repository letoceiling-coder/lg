import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { apiGet } from "@/lib/api";
import RedesignHeader from "@/redesign/components/RedesignHeader";
import ListingCard, { type ApiListingCardRow } from "@/redesign/components/ListingCard";
import { cn } from "@/lib/utils";

type RegionRow = { id: number; code: string; name: string };

type ListingsResponse = {
  data: ApiListingCardRow[];
  meta: { page: number; per_page: number; total: number; total_pages: number };
};

type KindFilter = "ALL" | "APARTMENT" | "HOUSE" | "LAND" | "COMMERCIAL";

const TABS: { key: KindFilter; label: string }[] = [
  { key: "ALL", label: "Все" },
  { key: "APARTMENT", label: "Квартиры" },
  { key: "HOUSE", label: "Дома и дачи" },
  { key: "LAND", label: "Участки" },
  { key: "COMMERCIAL", label: "Коммерция" },
];

export default function Belgorod() {
  const { data: regions } = useQuery({
    queryKey: ["regions"],
    queryFn: () => apiGet<RegionRow[]>("/regions"),
  });
  const region = regions?.find((x) => (x.code ?? "").toLowerCase() === "belgorod");

  const [kind, setKind] = useState<KindFilter>("ALL");
  const [page, setPage] = useState(1);

  const query = useMemo(() => {
    if (!region) return null;
    const params = new URLSearchParams({
      region_id: String(region.id),
      page: String(page),
      per_page: "24",
    });
    if (kind !== "ALL") params.set("kind", kind);
    return params.toString();
  }, [region, kind, page]);

  const { data, isLoading } = useQuery({
    enabled: !!query,
    queryKey: ["belgorod-listings", region?.id, kind, page],
    queryFn: () => apiGet<ListingsResponse>(`/listings?${query}`),
  });

  const items = data?.data ?? [];
  const meta = data?.meta;

  return (
    <div className="min-h-screen bg-background">
      <RedesignHeader />
      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
              Недвижимость в Белгороде
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Объекты партнёра ЦН «Авангард». Всего: {meta?.total ?? "—"}
            </p>
          </div>
          {region && (
            <Link
              to={`/catalog?region_id=${region.id}${kind !== 'ALL' && kind !== 'APARTMENT' ? `&type=${kind === 'HOUSE' ? 'houses' : kind === 'LAND' ? 'land' : 'commercial'}` : ''}`}
              className="text-sm text-primary hover:underline"
            >
              Посмотреть в каталоге →
            </Link>
          )}
        </div>

        {!region ? (
          <p className="text-sm text-amber-800 dark:text-amber-200 bg-amber-50 dark:bg-amber-950/40 border border-amber-200/60 dark:border-amber-800/50 rounded-xl p-4">
            Регион с кодом <span className="font-mono">belgorod</span> не найден среди включённых.
            Создайте регион в админке → Регионы и отметьте «Витрина».
          </p>
        ) : (
          <>
            <div className="flex flex-wrap gap-2 mb-6">
              {TABS.map((t) => (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => {
                    setKind(t.key);
                    setPage(1);
                  }}
                  className={cn(
                    "px-3 py-1.5 rounded-full text-sm border transition-colors",
                    kind === t.key
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-card text-foreground border-border hover:bg-muted/60",
                  )}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {isLoading ? (
              <div className="text-sm text-muted-foreground">Загрузка…</div>
            ) : items.length === 0 ? (
              <div className="text-sm text-muted-foreground">Объектов не найдено</div>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {items.map((l) => (
                    <ListingCard key={l.id} listing={l} />
                  ))}
                </div>

                {meta && meta.total_pages > 1 && (
                  <div className="flex items-center justify-center gap-2 mt-8">
                    <button
                      type="button"
                      disabled={page <= 1}
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      className="px-3 py-1.5 rounded-md border border-border text-sm disabled:opacity-50"
                    >
                      ← Назад
                    </button>
                    <span className="text-sm text-muted-foreground">
                      Страница {meta.page} из {meta.total_pages}
                    </span>
                    <button
                      type="button"
                      disabled={page >= meta.total_pages}
                      onClick={() => setPage((p) => Math.min(meta.total_pages, p + 1))}
                      className="px-3 py-1.5 rounded-md border border-border text-sm disabled:opacity-50"
                    >
                      Вперёд →
                    </button>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </main>
    </div>
  );
}
