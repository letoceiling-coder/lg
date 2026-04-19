import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Printer, MapPin, Building2, ExternalLink, Download, CalendarClock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import RedesignHeader from '@/redesign/components/RedesignHeader';
import FooterSection from '@/components/FooterSection';
import { apiGetOrNull, apiUrl } from '@/lib/api';

const PLACEHOLDER = '/placeholder.svg';

type ApiPresentation = {
  slug: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  address: string | null;
  metro: string | null;
  builder: string | null;
  deadline: string | null;
  availableApartments: number;
  priceFrom: number | null;
  priceTo: number | null;
  roomMix: Array<{ label: string; count: number; priceFrom: number | null }>;
  generatedAt: string;
};

const Presentation = () => {
  const { slug } = useParams<{ slug: string }>();

  const blockQuery = useQuery({
    queryKey: ['presentation', slug],
    queryFn: () => apiGetOrNull<ApiPresentation>(`/presentations/${encodeURIComponent(slug || '')}`),
    enabled: Boolean(slug),
  });

  const p = blockQuery.data;
  const image = p?.imageUrl ?? PLACEHOLDER;
  const address = p?.address ?? '—';
  const metroLine = p?.metro ?? '—';
  const builder = p?.builder ?? '—';
  const deadline = p?.deadline ?? '—';
  const formatMoney = (v: number) =>
    new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 }).format(v);

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

  if (!p) {
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
            <Link to={`/complex/${p.slug}`}>
              <ExternalLink className="w-4 h-4 mr-2" />
              Страница ЖК
            </Link>
          </Button>
          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" size="sm" asChild>
              <a href={apiUrl(`/presentations/${encodeURIComponent(p.slug)}/pdf`)}>
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
          <h1 className="text-2xl sm:text-3xl font-bold print:text-2xl">{p.name}</h1>
          <p className="text-sm text-muted-foreground mt-1 print:text-foreground">Краткая презентация для клиента</p>
        </header>

        <div className="rounded-xl overflow-hidden border border-border mb-6 print:border-0 print:rounded-none">
          <img src={image} alt="" className="w-full max-h-[320px] object-cover print:max-h-[240px]" />
        </div>

        <section className="mb-8 print:mb-6">
          <h2 className="text-base font-semibold mb-2">Описание</h2>
          {p.description?.trim() ? (
            <div className="prose prose-sm dark:prose-invert max-w-none text-foreground/90 whitespace-pre-wrap">
              {p.description.trim()}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Описание пока не добавлено.</p>
          )}
        </section>

        <section className="mb-8 print:mb-6">
          <h2 className="text-base font-semibold mb-2">Квартиры в наличии</h2>
          <div className="text-sm text-muted-foreground mb-3">
            {p.availableApartments > 0 ? `Всего: ${p.availableApartments} шт.` : 'Нет активных квартир в продаже.'}
            {p.priceFrom != null ? (
              <span className="ml-2">
                · Цены: от {formatMoney(p.priceFrom)} ₽
                {p.priceTo != null && p.priceTo !== p.priceFrom ? ` до ${formatMoney(p.priceTo)} ₽` : ''}
              </span>
            ) : null}
          </div>
          {p.roomMix.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {p.roomMix.map((row) => (
                <div key={row.label} className="rounded-lg border border-border px-3 py-2 text-sm">
                  <div className="font-medium">{row.label}</div>
                  <div className="text-muted-foreground">
                    {row.count} шт.
                    {row.priceFrom != null ? ` · от ${formatMoney(row.priceFrom)} ₽` : ''}
                  </div>
                </div>
              ))}
            </div>
          ) : null}
        </section>

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
            <CalendarClock className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
            <div>
              <p className="font-medium">Срок сдачи</p>
              <p className="text-muted-foreground print:text-foreground">{deadline}</p>
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
