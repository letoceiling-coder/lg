import { useMemo, useState, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import PropertyCard, { type PropertyData } from './PropertyCard';
import StartSaleCard, { type StartSaleData } from './StartSaleCard';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import LeadForm from '@/shared/components/LeadForm';
import { ChevronLeft, ChevronRight, Flame, ArrowRight, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Link } from 'react-router-dom';
import { apiGet } from '@/lib/api';
import { useDefaultRegionId } from '@/redesign/hooks/useDefaultRegionId';
import { useSiteSettings, setting } from '@/redesign/hooks/useSiteSettings';
import type { ApiBlockListRow } from '@/redesign/lib/blocks-from-api';
import { mapApiBlockToHomeHotCard, mapApiBlockToHomeStartCard } from '@/redesign/lib/home-blocks-map';

interface Props {
  title: string;
  type: 'hot' | 'start';
}

function intSetting(map: Map<string, string> | undefined, key: string, fallback: number): number {
  const raw = map?.get(key);
  const n = parseInt(String(raw ?? '').trim(), 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

function startDateRange(windowDays: number): { from: string; to: string } {
  const from = new Date();
  from.setUTCHours(0, 0, 0, 0);
  const to = new Date(from);
  to.setUTCDate(to.getUTCDate() + windowDays);
  return { from: from.toISOString().slice(0, 10), to: to.toISOString().slice(0, 10) };
}

const PropertyGridSection = ({ title, type }: Props) => {
  const { data: regionId } = useDefaultRegionId();
  const { data: siteMap } = useSiteSettings();
  const [helpOpen, setHelpOpen] = useState(false);
  const [helpFormKey, setHelpFormKey] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const isHot = type === 'hot';
  const isStart = type === 'start';

  const hotPer = intSetting(siteMap, 'home_hot_per_page', 8);
  const startPer = intSetting(siteMap, 'home_start_per_page', 8);
  const windowDays = intSetting(siteMap, 'home_start_window_days', 180);
  const hotMode = (setting(siteMap, 'home_hot_mode', 'latest') || 'latest').toLowerCase().trim();
  const hotSlugs = (setting(siteMap, 'home_hot_fixed_slugs', '') || '').trim();
  const hotBadge = setting(siteMap, 'home_hot_badge', 'Горячее предложение');
  const startBadge = setting(siteMap, 'home_start_badge', 'Старт продаж');

  const displayTitle = isHot
    ? setting(siteMap, 'home_hot_title', title)
    : setting(siteMap, 'home_start_title', title);

  const hotQuery = useQuery({
    queryKey: ['blocks', 'home', 'hot', regionId, hotPer, hotMode, hotSlugs],
    enabled: isHot && regionId != null,
    staleTime: 60_000,
    queryFn: async () => {
      const sp = new URLSearchParams();
      sp.set('region_id', String(regionId));
      sp.set('per_page', String(hotPer));
      sp.set('page', '1');
      sp.set('require_active_listings', 'true');
      sp.set('sort', 'created_desc');
      const useSlugs = hotMode === 'fixed_slugs' && hotSlugs.length > 0;
      if (useSlugs) {
        sp.set('block_slugs', hotSlugs);
      } else if (hotMode === 'promoted') {
        sp.set('is_promoted', 'true');
      }
      /* latest (и прочие): без is_promoted — ЖК с активными квартирами, сортировка created_desc */
      return apiGet<{ data: ApiBlockListRow[] }>(`/blocks?${sp}`);
    },
  });

  const startQuery = useQuery({
    queryKey: ['blocks', 'home', 'start', regionId, startPer, windowDays],
    enabled: isStart && regionId != null,
    staleTime: 60_000,
    queryFn: async () => {
      const { from, to } = startDateRange(windowDays);
      const base = new URLSearchParams();
      base.set('region_id', String(regionId));
      base.set('per_page', String(startPer));
      base.set('page', '1');
      base.set('require_active_listings', 'true');

      const withSales = new URLSearchParams(base);
      withSales.set('sort', 'sales_start_asc');
      withSales.set('sales_start_from', from);
      withSales.set('sales_start_to', to);
      const primary = await apiGet<{ data: ApiBlockListRow[] }>(`/blocks?${withSales}`);
      if ((primary.data?.length ?? 0) > 0) return primary;

      // Fallback: если в окне дат нет стартов, не скрываем секцию — показываем актуальные ЖК.
      const fallback = new URLSearchParams(base);
      fallback.set('sort', 'created_desc');
      return apiGet<{ data: ApiBlockListRow[] }>(`/blocks?${fallback}`);
    },
  });

  const hotCards: PropertyData[] = useMemo(() => {
    const rows = hotQuery.data?.data ?? [];
    return rows.map((b) => mapApiBlockToHomeHotCard(b, hotBadge));
  }, [hotQuery.data, hotBadge]);

  const startCards: StartSaleData[] = useMemo(() => {
    const rows = startQuery.data?.data ?? [];
    return rows.map((b) => mapApiBlockToHomeStartCard(b, startBadge));
  }, [startQuery.data, startBadge]);

  const loading = isHot ? hotQuery.isLoading : startQuery.isLoading;
  const empty = !loading && (isHot ? hotCards.length === 0 : startCards.length === 0);

  const scroll = (dir: 'left' | 'right') => {
    if (!scrollRef.current) return;
    const amount = scrollRef.current.offsetWidth * 0.75;
    scrollRef.current.scrollBy({ left: dir === 'left' ? -amount : amount, behavior: 'smooth' });
  };

  return (
    <section className={cn('py-8 sm:py-12', isHot && 'bg-accent/30')}>
      <div className="max-w-[1400px] mx-auto px-4">
        <div className="flex items-center justify-between mb-4 sm:mb-6">
          <div className="flex items-center gap-2">
            {isHot && <Flame className="w-4 h-4 sm:w-5 sm:h-5 text-destructive" />}
            <h2 className="text-base sm:text-xl font-bold">{displayTitle}</h2>
          </div>
          <div className="flex items-center gap-2">
            <div className="hidden lg:flex items-center gap-1.5">
              <button onClick={() => scroll('left')} className="w-8 h-8 rounded-full border border-border bg-background flex items-center justify-center hover:bg-secondary transition-colors">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button onClick={() => scroll('right')} className="w-8 h-8 rounded-full border border-border bg-background flex items-center justify-center hover:bg-secondary transition-colors">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
            {isStart ? (
              <Button size="sm" className="hidden sm:flex rounded-xl text-xs" onClick={() => setHelpOpen(true)}>
                Помощь с подбором
              </Button>
            ) : (
              <Link
                to="/catalog"
                className="hidden sm:flex items-center gap-1.5 px-3.5 py-2 rounded-full border border-border text-xs sm:text-sm font-medium hover:bg-secondary transition-colors"
              >
                Все предложения
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            )}
          </div>
        </div>

        {loading && (
          <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
            <Loader2 className="w-5 h-5 animate-spin" />
            Загрузка…
          </div>
        )}

        {empty && (
          <p className="text-sm text-muted-foreground text-center py-12 max-w-lg mx-auto space-y-2">
            <span className="block">
              {isHot
                ? 'Нет жилых комплексов для этого блока. Включите «Реклама» у нужных ЖК в разделе «ЖК» или задайте режим и slug в '
                : 'Нет ЖК со стартом продаж в выбранном периоде. Дата берётся из фида при импорте или из карточки ЖК; расширьте «Окно дней» в '}
              {isHot ? (
                <>
                  <Link to="/admin/homepage" className="text-primary font-medium underline-offset-2 hover:underline">
                    Главная (блоки)
                  </Link>
                  .
                </>
              ) : (
                <>
                  <Link to="/admin/homepage" className="text-primary font-medium underline-offset-2 hover:underline">
                    Главная (блоки)
                  </Link>
                  . Также проверьте дату «Старт продаж» у ЖК в разделе «ЖК» и при необходимости запустите импорт фида.
                </>
              )}
            </span>
            {isHot && (
              <span className="block text-xs">
                Редактор страницы «Контент» здесь не задаёт список ЖК — только заголовок блока на макете.
              </span>
            )}
          </p>
        )}

        {!loading && !empty && (
          <div
            ref={scrollRef}
            className="flex lg:grid lg:grid-cols-4 gap-3 sm:gap-4 overflow-x-auto lg:overflow-visible snap-x snap-mandatory scrollbar-hide -mx-4 px-4 lg:mx-0 lg:px-0"
          >
            {isStart
              ? startCards.map((p) => (
                  <div key={p.slug ?? p.title} className="min-w-[260px] sm:min-w-[280px] lg:min-w-0 snap-start shrink-0">
                    <StartSaleCard data={p} />
                  </div>
                ))
              : hotCards.map((p) => (
                  <div key={p.slug ?? p.title} className="min-w-[260px] sm:min-w-[280px] lg:min-w-0 snap-start shrink-0">
                    <PropertyCard data={p} variant="hot" />
                  </div>
                ))}
          </div>
        )}

        {isStart ? (
          <button
            onClick={() => setHelpOpen(true)}
            className="flex sm:hidden items-center justify-center gap-1.5 mt-3 py-2 w-full rounded-xl border border-border text-xs font-medium hover:bg-secondary transition-colors"
          >
            Помощь с подбором
          </button>
        ) : (
          <Link
            to="/catalog"
            className="flex sm:hidden items-center justify-center gap-1.5 mt-3 py-2 rounded-xl border border-border text-xs font-medium hover:bg-secondary transition-colors"
          >
            Все предложения
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        )}
      </div>

      <Dialog
        open={helpOpen}
        onOpenChange={(open) => {
          setHelpOpen(open);
          if (open) setHelpFormKey((k) => k + 1);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Помощь с подбором</DialogTitle>
          </DialogHeader>
          <LeadForm
            key={helpFormKey}
            embedded
            title=""
            source="home_start_sales_section"
            requestType="SELECTION"
            contextFooter="Заявка из блока «Старт продаж» на главной / в каталоге."
          />
        </DialogContent>
      </Dialog>
    </section>
  );
};

export default PropertyGridSection;
