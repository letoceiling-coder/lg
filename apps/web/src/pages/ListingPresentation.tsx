import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Printer, MapPin, Building2, ExternalLink, Download, Tag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import RedesignHeader from '@/redesign/components/RedesignHeader';
import FooterSection from '@/components/FooterSection';
import { apiGetOrNull, apiUrl } from '@/lib/api';

const PLACEHOLDER = '/placeholder.svg';

export type ListingPresentationPayload = {
  listingId: number;
  kind: string;
  kindLabel: string;
  title: string;
  description: string | null;
  price: number | null;
  address: string | null;
  region: string | null;
  district: string | null;
  builder: string | null;
  blockName: string | null;
  blockSlug: string | null;
  subtitle: string | null;
  photoUrls: string[];
  planUrls: string[];
  generatedAt: string;
};

function formatMoney(v: number) {
  return new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 }).format(Math.round(v));
}

const ListingPresentation = () => {
  const { listingId: listingIdParam } = useParams<{ listingId: string }>();
  const listingId = listingIdParam ? Number.parseInt(listingIdParam, 10) : NaN;

  const q = useQuery({
    queryKey: ['presentation', 'listing', listingId],
    queryFn: () => apiGetOrNull<ListingPresentationPayload>(`/presentations/listing/${listingId}`),
    enabled: Number.isFinite(listingId),
  });

  const p = q.data;
  const backHref =
    p && p.kind === 'APARTMENT' && p.blockSlug ? `/apartment/${p.listingId}` : p ? `/listing/${p.listingId}` : '/catalog';

  if (!Number.isFinite(listingId)) {
    return (
      <div className="min-h-screen bg-background">
        <RedesignHeader />
        <div className="max-w-[720px] mx-auto px-4 py-16 text-center text-muted-foreground text-sm">Неверная ссылка</div>
        <FooterSection />
      </div>
    );
  }

  if (q.isPending) {
    return (
      <div className="min-h-screen bg-background">
        <RedesignHeader />
        <div className="max-w-[720px] mx-auto px-4 py-16 text-center text-muted-foreground text-sm">Загрузка…</div>
        <FooterSection />
      </div>
    );
  }

  if (!p) {
    return (
      <div className="min-h-screen bg-background">
        <RedesignHeader />
        <div className="max-w-[720px] mx-auto px-4 py-16 text-center">
          <p className="text-muted-foreground">Объект не найден</p>
          <Link to="/catalog" className="text-primary text-sm mt-2 inline-block">← В каталог</Link>
        </div>
        <FooterSection />
      </div>
    );
  }

  const allPlans = (p.planUrls ?? []).slice(0, 16);
  const allPhotos = (p.photoUrls ?? []).slice(0, 24);

  return (
    <div className="min-h-screen bg-background pb-16 print:pb-0">
      <div className="print:hidden">
        <RedesignHeader />
      </div>
      <article className="max-w-[900px] mx-auto px-4 py-8 print:py-4 print:max-w-none">
        <div className="print:hidden flex flex-wrap items-center justify-between gap-3 mb-6">
          <Button variant="outline" size="sm" asChild>
            <Link to={backHref}>
              <ExternalLink className="w-4 h-4 mr-2" />
              Страница объекта
            </Link>
          </Button>
          {p.blockSlug ? (
            <Button variant="ghost" size="sm" className="-ml-1" asChild>
              <Link to={`/complex/${p.blockSlug}`}>Страница ЖК</Link>
            </Button>
          ) : null}
          <div className="flex items-center gap-2 flex-wrap">
            <Button type="button" variant="outline" size="sm" asChild>
              <a href={apiUrl(`/presentations/listing/${p.listingId}/pdf`)}>
                <Download className="w-4 h-4 mr-2" />
                Скачать PDF
              </a>
            </Button>
            <Button type="button" size="sm" onClick={() => window.print()}>
              <Printer className="w-4 h-4 mr-2" />
              Печать
            </Button>
          </div>
        </div>

        <header className="mb-6 print:mb-4">
          <h1 className="text-2xl sm:text-3xl font-bold print:text-2xl">{p.title}</h1>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground mt-2 print:text-foreground">
            <span className="inline-flex items-center gap-1 font-medium">
              <Tag className="w-3.5 h-3.5" />
              {p.kindLabel}
            </span>
            {p.subtitle ? <span>· {p.subtitle}</span> : null}
            {p.price != null ? <span className="text-foreground font-semibold">{formatMoney(p.price)} ₽</span> : null}
          </div>
          <p className="text-sm text-muted-foreground mt-1 print:hidden">Материал для клиента: фото и планировки</p>
        </header>

        {p.description?.trim() ? (
          <section className="mb-8 print:mb-6">
            <h2 className="text-base font-semibold mb-2">Описание</h2>
            <div className="prose prose-sm dark:prose-invert max-w-none text-foreground/90 whitespace-pre-wrap">
              {p.description.trim()}
            </div>
          </section>
        ) : null}

        {allPlans.length > 0 ? (
          <section className="mb-10">
            <h2 className="text-lg font-semibold mb-3">Планировки</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {allPlans.map((src, i) => (
                <figure key={`${src}-${i}`} className="rounded-xl border border-border overflow-hidden bg-muted/30">
                  <img
                    src={src || PLACEHOLDER}
                    alt={`Планировка ${i + 1}`}
                    className="w-full max-h-[360px] object-contain bg-background"
                  />
                </figure>
              ))}
            </div>
          </section>
        ) : null}

        {allPhotos.length > 0 ? (
          <section className="mb-10">
            <h2 className="text-lg font-semibold mb-3">Фотографии</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {allPhotos.map((src, i) => (
                <figure key={`${src}-${i}`} className="rounded-xl border border-border overflow-hidden">
                  <img src={src || PLACEHOLDER} alt={`Фото ${i + 1}`} className="w-full h-56 object-cover" />
                </figure>
              ))}
            </div>
          </section>
        ) : null}

        {allPlans.length === 0 && allPhotos.length === 0 ? (
          <p className="text-sm text-muted-foreground mb-8">Изображений пока нет — загрузите фото и планировки к объявлению.</p>
        ) : null}

        <section className="space-y-4 text-sm border-t border-border pt-6 print:pt-4">
          <div className="flex gap-2">
            <MapPin className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
            <div>
              <p className="font-medium">Локация</p>
              <p className="text-muted-foreground print:text-foreground">
                {[p.region, p.district].filter(Boolean).join(' · ') || '—'}
              </p>
              {p.address ? <p className="text-muted-foreground mt-1 print:text-foreground">{p.address}</p> : null}
            </div>
          </div>
          <div className="flex gap-2">
            <Building2 className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
            <div>
              <p className="font-medium">Продавец / контрагент</p>
              <p className="text-muted-foreground print:text-foreground">{p.builder ?? '—'}</p>
              {p.blockName ? (
                <p className="text-muted-foreground text-xs mt-1 print:text-foreground">ЖК: {p.blockName}</p>
              ) : null}
            </div>
          </div>
        </section>
      </article>
      <div className="print:hidden">
        <FooterSection />
      </div>
    </div>
  );
};

export default ListingPresentation;
