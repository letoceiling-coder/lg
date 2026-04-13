import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { apiGet } from "@/lib/api";
import RedesignHeader from "@/redesign/components/RedesignHeader";

type RegionRow = { id: number; code: string; name: string };

export default function Belgorod() {
  const { data: regions } = useQuery({
    queryKey: ["regions"],
    queryFn: () => apiGet<RegionRow[]>("/regions"),
  });
  const region = regions?.find((x) => (x.code ?? "").toLowerCase() === "belgorod");

  return (
    <div className="min-h-screen bg-background">
      <RedesignHeader />
      <main className="max-w-3xl mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold tracking-tight mb-3">Недвижимость в Белгороде</h1>
        <p className="text-muted-foreground mb-8 leading-relaxed">
          Каталог ЖК с фильтром по зоне Белгорода и прилегающих территорий (ручной контур на стороне API,
          параметр <code className="text-xs bg-muted px-1 rounded">geo_preset=belgorod</code>).
        </p>
        {region ? (
          <div className="flex flex-wrap gap-3">
            <Link
              to={`/catalog?region_id=${region.id}&geo_preset=belgorod`}
              className="inline-flex items-center justify-center rounded-xl bg-primary text-primary-foreground px-5 py-2.5 text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              Каталог в зоне Белгорода
            </Link>
            <Link
              to={`/map?region_id=${region.id}&geo_preset=belgorod`}
              className="inline-flex items-center justify-center rounded-xl border bg-background px-5 py-2.5 text-sm font-medium hover:bg-muted/60 transition-colors"
            >
              Карта в зоне
            </Link>
          </div>
        ) : (
          <p className="text-sm text-amber-800 dark:text-amber-200 bg-amber-50 dark:bg-amber-950/40 border border-amber-200/60 dark:border-amber-800/50 rounded-xl p-4">
            Регион с кодом <span className="font-mono">belgorod</span> не найден среди включённых. Создайте
            регион в админке → Регионы и отметьте «Витрина».
          </p>
        )}
      </main>
    </div>
  );
}
