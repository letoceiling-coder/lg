import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Printer, MapPin, Building2, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import RedesignHeader from '@/redesign/components/RedesignHeader';
import FooterSection from '@/components/FooterSection';
import { apiGetOrNull } from '@/lib/api';
import type { ApiBlockDetail } from '@/redesign/lib/blocks-from-api';

const PLACEHOLDER = '/placeholder.svg';

const Presentation = () => {
  const { slug } = useParams<{ slug: string }>();

  const blockQuery = useQuery({
    queryKey: ['block', 'presentation', slug],
    queryFn: () => apiGetOrNull<ApiBlockDetail>(`/blocks/${encodeURIComponent(slug || '')}`),
    enabled: Boolean(slug),
  });

  const b = blockQuery.data;
  const image = b?.images?.[0]?.url ?? PLACEHOLDER;
  const address = b?.addresses?.[0]?.address ?? '—';
  const metro = b?.subways?.[0];
  const metroLine = metro ? `${metro.subway.name}${metro.distanceTime != null ? ` · ${metro.distanceTime} мин` : ''}` : '—';
  const builder = b?.builder?.name ?? '—';

  if (!slug) {
    return (
      <div className="min-h-screen bg-background">
        <RedesignHeader />
        <div className="max-w-[720px] mx-auto px-4 py-16 text-center text-muted-foreground text-sm">Не указан ЖК</div>
        <FooterSection />
      </div>
    );
  }

  if (blockQuery.isPending) {
    return (
      <div className="min-h-screen bg-background">
        <RedesignHeader />
        <div className="max-w-[720px] mx-auto px-4 py-16 text-center text-muted-foreground text-sm">Загрузка…</div>
        <FooterSection />
      </div>
    );
  }

  if (!b) {
    return (
      <div className="min-h-screen bg-background">
        <RedesignHeader />
        <div className="max-w-[720px] mx-auto px-4 py-16 text-center">
          <p className="text-muted-foreground">Комплекс не найден</p>
          <Link to="/catalog" className="text-primary text-sm mt-2 inline-block">← В каталог</Link>
        </div>
        <FooterSection />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-16 print:pb-0">
      <div className="print:hidden">
        <RedesignHeader />
      </div>
      <article className="max-w-[800px] mx-auto px-4 py-8 print:py-4 print:max-w-none">
        <div className="print:hidden flex flex-wrap items-center justify-between gap-3 mb-6">
          <Button variant="outline" size="sm" asChild>
            <Link to={`/complex/${b.slug}`}>
              <ExternalLink className="w-4 h-4 mr-2" />
              Страница ЖК
            </Link>
          </Button>
          <Button type="button" size="sm" onClick={() => window.print()}>
            <Printer className="w-4 h-4 mr-2" />
            Печать / PDF
          </Button>
        </div>

        <header className="mb-6 print:mb-4">
          <h1 className="text-2xl sm:text-3xl font-bold print:text-2xl">{b.name}</h1>
          <p className="text-sm text-muted-foreground mt-1 print:text-foreground">Краткая презентация для клиента</p>
        </header>

        <div className="rounded-xl overflow-hidden border border-border mb-6 print:border-0 print:rounded-none">
          <img src={image} alt="" className="w-full max-h-[320px] object-cover print:max-h-[240px]" />
        </div>

        {b.description?.trim() ? (
          <div className="prose prose-sm dark:prose-invert max-w-none mb-8 print:mb-6 text-foreground/90 whitespace-pre-wrap">
            {b.description.trim()}
          </div>
        ) : null}

        <section className="space-y-3 text-sm border-t border-border pt-6 print:pt-4">
          <div className="flex gap-2">
            <MapPin className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
            <div>
              <p className="font-medium">Адрес</p>
              <p className="text-muted-foreground print:text-foreground">{address}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Building2 className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
            <div>
              <p className="font-medium">Застройщик</p>
              <p className="text-muted-foreground print:text-foreground">{builder}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <span className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5 text-center font-bold text-xs">М</span>
            <div>
              <p className="font-medium">Метро</p>
              <p className="text-muted-foreground print:text-foreground">{metroLine}</p>
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

export default Presentation;
