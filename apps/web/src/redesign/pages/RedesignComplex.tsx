import { useParams, Link, useLocation, useNavigate } from 'react-router-dom';
import { useState, useMemo, useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { MapPin, Heart, Share2, GitCompare, FileText } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import RedesignHeader from '@/redesign/components/RedesignHeader';
import FooterSection from '@/components/FooterSection';
import ComplexHero from '@/redesign/components/ComplexHero';
import ApartmentTable from '@/redesign/components/ApartmentTable';
import Chessboard from '@/redesign/components/Chessboard';
import LayoutGrid from '@/redesign/components/LayoutGrid';
import LeadForm from '@/shared/components/LeadForm';
import { apiGet, apiGetOrNull } from '@/lib/api';
import { complexes, getComplexBySlug, getLayoutGroups, formatPrice } from '@/redesign/data/mock-data';
import type { ResidentialComplex, SortField, SortDir } from '@/redesign/data/types';
import { cn } from '@/lib/utils';
import { useAuth } from '@/shared/hooks/useAuth';
import { parseApiBlockId, useFavorites } from '@/shared/hooks/useFavorites';
import { useCompare } from '@/shared/hooks/useCompare';
import { shareCurrentPage } from '@/lib/share-page';
import { toast } from '@/components/ui/sonner';
import { useYandexMapsReady } from '@/shared/hooks/useYandexMapsReady';
import {
  buildLayoutGroupsFromApartments,
  mapApiBlockDetailToResidentialComplex,
  mapApiBlockListRowToResidentialComplex,
  type ApiBlockDetail,
  type ApiBlockListRow,
  type ApiListingRow,
} from '@/redesign/lib/blocks-from-api';

declare global {
  interface Window { ymaps: any; }
}

const SimilarComplexCard = ({ complex }: { complex: ResidentialComplex }) => {
  const totalApts =
    complex.listingCount ??
    complex.buildings.reduce((s, b) => s + b.apartments.filter((a) => a.status === 'available').length, 0);
  return (
    <Link to={`/complex/${complex.slug}`} className="group flex flex-col rounded-xl overflow-hidden bg-card border border-border hover:shadow-md hover:-translate-y-px transition-all">
      <div className="h-[160px] overflow-hidden bg-muted">
        <img src={complex.images[0]} alt={complex.name} className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-[1.02]" />
      </div>
      <div className="p-3 space-y-1">
        <h4 className="font-semibold text-sm">{complex.name}</h4>
        <p className="text-xs text-muted-foreground flex items-center gap-1">
          <MapPin className="w-3 h-3" />
          {complex.district} · м. {complex.subway}
        </p>
        <div className="flex items-center justify-between pt-1">
          <span className="font-bold text-sm text-primary">
            {complex.priceFrom > 0 ? `от ${formatPrice(complex.priceFrom)}` : '—'}
          </span>
          <span className="text-[11px] text-muted-foreground">{totalApts} кв.</span>
        </div>
      </div>
    </Link>
  );
};

const RedesignComplex = () => {
  const { slug } = useParams<{ slug: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { isBlockFavorite, toggleBlock } = useFavorites();
  const { isCompared, toggle: toggleCompare, count: compareCount } = useCompare();
  const { ready: ymapsReady } = useYandexMapsReady();
  const mockComplex = useMemo(() => getComplexBySlug(slug || ''), [slug]);

  const apiBlockQuery = useQuery({
    queryKey: ['block', 'slug', slug],
    queryFn: () => apiGetOrNull<ApiBlockDetail>(`/blocks/${encodeURIComponent(slug || '')}`),
    enabled: Boolean(slug),
  });

  const listingsQuery = useQuery({
    queryKey: ['listings', 'block', apiBlockQuery.data?.id],
    queryFn: () =>
      apiGet<{ data: ApiListingRow[] }>(
        `/listings?block_id=${apiBlockQuery.data!.id}&kind=APARTMENT&status=ACTIVE&per_page=500`,
      ),
    enabled: Boolean(apiBlockQuery.data?.id),
  });

  const apiComplex = useMemo(() => {
    if (!apiBlockQuery.data) return null;
    const rows = listingsQuery.data?.data ?? [];
    return mapApiBlockDetailToResidentialComplex(apiBlockQuery.data, rows);
  }, [apiBlockQuery.data, listingsQuery.data]);

  const complex = apiComplex ?? mockComplex ?? null;
  const fromApi = Boolean(apiComplex);
  const blockNum = complex ? parseApiBlockId(complex.id) : null;
  const blockLiked = blockNum != null && isBlockFavorite(blockNum);

  const handleComplexFavorite = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (blockNum == null) return;
    if (!isAuthenticated) {
      navigate('/login', { state: { from: location } });
      return;
    }
    void toggleBlock(blockNum);
  };

  const similarQuery = useQuery({
    queryKey: ['blocks', 'similar', apiBlockQuery.data?.region?.id, apiBlockQuery.data?.id],
    queryFn: async () => {
      const b = apiBlockQuery.data!;
      const rid = b.region?.id;
      if (rid == null) return [] as ResidentialComplex[];
      const res = await apiGet<{ data: ApiBlockListRow[] }>(`/blocks?region_id=${rid}&per_page=8`);
      return res.data
        .filter((row) => row.id !== b.id)
        .slice(0, 4)
        .map(mapApiBlockListRowToResidentialComplex);
    },
    enabled: Boolean(fromApi && apiBlockQuery.data?.region?.id != null && apiBlockQuery.data?.id),
  });

  const [sort, setSort] = useState<{ field: SortField; dir: SortDir }>({ field: 'price', dir: 'asc' });
  const [roomFilter, setRoomFilter] = useState<number | null>(null);
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);

  const allApartments = useMemo(() => {
    if (!complex) return [];
    let apts = complex.buildings.flatMap((b) => b.apartments).filter((a) => a.status !== 'sold');
    if (roomFilter !== null) apts = apts.filter((a) => a.rooms === roomFilter);
    apts.sort((a, b) => {
      const m = sort.dir === 'asc' ? 1 : -1;
      return (a[sort.field] - b[sort.field]) * m;
    });
    return apts;
  }, [complex, sort, roomFilter]);

  const layouts = useMemo(() => {
    if (!complex) return [];
    if (fromApi) {
      const apts = complex.buildings.flatMap((b) => b.apartments);
      return buildLayoutGroupsFromApartments(complex.id, apts);
    }
    return getLayoutGroups(complex.id);
  }, [complex, fromApi]);

  const similarComplexes = useMemo((): ResidentialComplex[] => {
    if (!complex) return [];
    if (similarQuery.data?.length) return similarQuery.data;
    return complexes.filter((c) => c.id !== complex.id).slice(0, 4);
  }, [complex, similarQuery.data]);

  const handleSort = (field: SortField) => {
    setSort(prev => ({ field, dir: prev.field === field && prev.dir === 'asc' ? 'desc' : 'asc' }));
  };

  const initMap = () => {
    if (!ymapsReady || !complex || mapInstanceRef.current || !mapRef.current) return;
    if (!window.ymaps) return;
    window.ymaps.ready(() => createMap());
  };

  useEffect(() => {
    if (!ymapsReady || !complex) return;
    const t = window.setTimeout(() => initMap(), 200);
    return () => window.clearTimeout(t);
  }, [ymapsReady, complex?.slug]);

  const createMap = () => {
    if (!complex || !mapRef.current || mapInstanceRef.current) return;
    const map = new window.ymaps.Map(mapRef.current, {
      center: complex.coords,
      zoom: 15,
      controls: ['zoomControl'],
    });
    const pm = new window.ymaps.Placemark(complex.coords, {
      balloonContentHeader: `<strong>${complex.name}</strong>`,
      balloonContentBody: `<div>${complex.address}</div>`,
    }, { preset: 'islands#blueCircleDotIcon' });
    map.geoObjects.add(pm);
    mapInstanceRef.current = map;
  };

  if (!complex) {
    if (slug && !mockComplex && apiBlockQuery.isPending) {
      return (
        <div className="min-h-screen bg-background">
          <RedesignHeader />
          <div className="max-w-[1400px] mx-auto px-4 py-16 text-center text-muted-foreground text-sm">Загрузка…</div>
        </div>
      );
    }
    return (
      <div className="min-h-screen bg-background">
        <RedesignHeader />
        <div className="max-w-[1400px] mx-auto px-4 py-16 text-center">
          <p className="text-muted-foreground">Комплекс не найден</p>
          <Link to="/catalog" className="text-primary text-sm mt-2 inline-block">
            ← Вернуться в каталог
          </Link>
        </div>
      </div>
    );
  }

  const roomCounts = [...new Set(complex.buildings.flatMap(b => b.apartments).filter(a => a.status !== 'sold').map(a => a.rooms))].sort();

  const inCompare = isCompared(complex.slug);
  const handleCompare = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!inCompare && compareCount >= 3) {
      toast.error('В сравнении не более 3 ЖК');
      return;
    }
    toggleCompare(complex.slug);
  };

  const handleShare = (e: React.MouseEvent) => {
    e.preventDefault();
    void shareCurrentPage({ title: complex.name });
  };

  return (
    <div className="min-h-screen bg-background pb-16 lg:pb-0">
      <RedesignHeader />
      <div className="max-w-[1400px] mx-auto px-4 py-6">
        {/* Breadcrumb */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Link to="/" className="hover:text-foreground transition-colors">Главная</Link>
            <span>/</span>
            <Link to="/catalog" className="hover:text-foreground transition-colors">Каталог</Link>
            <span>/</span>
            <span className="text-foreground font-medium">{complex.name}</span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              disabled={blockNum == null}
              title={blockNum == null ? 'Избранное доступно для ЖК из каталога' : undefined}
              onClick={handleComplexFavorite}
            >
              <Heart
                className={cn(
                  'w-4 h-4',
                  blockLiked ? 'fill-destructive text-destructive' : 'text-muted-foreground',
                )}
              />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              title={inCompare ? 'Убрать из сравнения' : 'В сравнение'}
              onClick={handleCompare}
            >
              <GitCompare className={cn('w-4 h-4', inCompare ? 'text-primary' : 'text-muted-foreground')} />
            </Button>
            <Button variant="ghost" size="sm" className="h-8 w-8 px-2 gap-1" title="Презентация" asChild>
              <Link to={`/presentation/${complex.slug}`}>
                <FileText className="w-4 h-4" />
              </Link>
            </Button>
            <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0" title="Поделиться" onClick={handleShare}>
              <Share2 className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <ComplexHero complex={complex} />

        {/* Main content with sidebar */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mt-8">
          <div className="lg:col-span-3">
            <Tabs defaultValue="apartments" onValueChange={v => { if (v === 'map') setTimeout(initMap, 100); }}>
              <TabsList className="w-full justify-start bg-muted/50 rounded-xl p-1 h-auto flex-wrap gap-0.5">
                <TabsTrigger value="apartments" className="rounded-lg text-sm data-[state=active]:shadow-sm">
                  Квартиры <span className="ml-1 text-xs text-muted-foreground">({allApartments.length || (complex.listingCount ?? 0)})</span>
                </TabsTrigger>
                <TabsTrigger value="layouts" className="rounded-lg text-sm data-[state=active]:shadow-sm">
                  Планировки <span className="ml-1 text-xs text-muted-foreground">({layouts.length})</span>
                </TabsTrigger>
                <TabsTrigger value="chess" className="rounded-lg text-sm data-[state=active]:shadow-sm">Шахматка</TabsTrigger>
                <TabsTrigger value="about" className="rounded-lg text-sm data-[state=active]:shadow-sm">О комплексе</TabsTrigger>
                <TabsTrigger value="infra" className="rounded-lg text-sm data-[state=active]:shadow-sm">Инфраструктура</TabsTrigger>
                <TabsTrigger value="map" className="rounded-lg text-sm data-[state=active]:shadow-sm">Карта</TabsTrigger>
              </TabsList>

              {/* Apartments */}
              <TabsContent value="apartments" className="mt-6">
                <div className="flex gap-2 mb-4 flex-wrap">
                  <button
                    onClick={() => setRoomFilter(null)}
                    className={cn('px-4 py-2 rounded-lg text-sm font-medium border transition-colors', roomFilter === null ? 'bg-primary text-primary-foreground border-primary' : 'border-border hover:border-primary/50 bg-background')}
                  >Все</button>
                  {roomCounts.map(r => (
                    <button
                      key={r}
                      onClick={() => setRoomFilter(r)}
                      className={cn('px-4 py-2 rounded-lg text-sm font-medium border transition-colors', roomFilter === r ? 'bg-primary text-primary-foreground border-primary' : 'border-border hover:border-primary/50 bg-background')}
                    >{r === 0 ? 'Студия' : `${r}-комн`}</button>
                  ))}
                </div>
                <ApartmentTable apartments={allApartments} sort={sort} onSort={handleSort} />
              </TabsContent>

              {/* Layouts */}
              <TabsContent value="layouts" className="mt-6">
                <LayoutGrid layouts={layouts} complexSlug={complex.slug} />
              </TabsContent>

              {/* Chessboard */}
              <TabsContent value="chess" className="mt-6 space-y-8">
                {complex.buildings.map(b => (
                  <Chessboard key={b.id} apartments={b.apartments} floors={b.floors} sections={b.sections} buildingName={b.name} />
                ))}
              </TabsContent>

              {/* About */}
              <TabsContent value="about" className="mt-6">
                <div className="bg-card rounded-xl border border-border p-6 space-y-5">
                  <h3 className="font-semibold text-lg">О комплексе</h3>
                  {complex.description.includes('<') ? (
                    <div
                      className="text-sm text-muted-foreground leading-relaxed prose prose-sm max-w-none"
                      dangerouslySetInnerHTML={{ __html: complex.description }}
                    />
                  ) : (
                    <p className="text-sm text-muted-foreground leading-relaxed">{complex.description}</p>
                  )}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-5 pt-2">
                    {[
                      ['Адрес', complex.address],
                      ['Застройщик', complex.builder],
                      ['Район', complex.district],
                      ['Метро', `${complex.subway} (${complex.subwayDistance})`],
                      ['Срок сдачи', complex.deadline],
                      ['Корпусов', String(complex.buildings.length)],
                      ['Цена', `${formatPrice(complex.priceFrom)} — ${formatPrice(complex.priceTo)}`],
                    ].map(([label, value]) => (
                      <div key={label} className="space-y-1">
                        <p className="text-xs text-muted-foreground">{label}</p>
                        <p className="text-sm font-medium">{value}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </TabsContent>

              {/* Infrastructure */}
              <TabsContent value="infra" className="mt-6">
                <div className="bg-card rounded-xl border border-border p-6">
                  <h3 className="font-semibold text-lg mb-5">Инфраструктура</h3>
                  {complex.infrastructure.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Данные появятся после наполнения в админке.</p>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {complex.infrastructure.map((item, i) => (
                        <div key={i} className="flex items-center gap-3 text-sm text-muted-foreground p-3 rounded-lg bg-muted/30">
                          <div className="w-2 h-2 rounded-full bg-primary shrink-0" />
                          {item}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </TabsContent>

              {/* Map */}
              <TabsContent value="map" className="mt-6">
                <div className="rounded-xl border border-border overflow-hidden bg-card">
                  <div className="p-4 border-b border-border flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm font-medium">{complex.address}</span>
                    <span className="text-xs text-muted-foreground">· м. {complex.subway} · {complex.subwayDistance}</span>
                  </div>
                  <div ref={mapRef} className="h-[400px] bg-muted" />
                </div>
              </TabsContent>
            </Tabs>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1 space-y-4">
            <div className="sticky top-20 space-y-4">
              {/* Price summary */}
              <div className="rounded-xl border border-border bg-card p-5 space-y-3">
                <p className="text-xs text-muted-foreground">Цена квартир</p>
                <p className="text-xl font-bold">
                  {complex.priceFrom > 0 ? `от ${formatPrice(complex.priceFrom)}` : 'по запросу'}
                </p>
                <p className="text-xs text-muted-foreground">
                  {complex.priceTo > 0 ? `до ${formatPrice(complex.priceTo)}` : ''}
                </p>
                <div className="border-t border-border pt-3 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Корпусов</span>
                    <span className="font-medium">{complex.buildings.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Свободных кв.</span>
                    <span className="font-medium">
                      {(() => {
                        const fromBuildings = complex.buildings.reduce((s, b) => s + b.apartments.filter(a => a.status === 'available').length, 0);
                        return fromBuildings || complex.listingCount || 0;
                      })()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Срок сдачи</span>
                    <span className="font-medium">{complex.deadline}</span>
                  </div>
                </div>
              </div>

              <LeadForm
                title="Получить консультацию"
                source={`ЖК: ${complex.slug}`}
                blockId={fromApi && apiBlockQuery.data ? apiBlockQuery.data.id : undefined}
                requestType="CONSULTATION"
              />
            </div>
          </div>
        </div>

        {/* Similar complexes */}
        {similarComplexes.length > 0 && (
          <section className="mt-12">
            <h2 className="text-lg font-bold mb-4">Похожие жилые комплексы</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {similarComplexes.map(c => (
                <SimilarComplexCard key={c.id} complex={c} />
              ))}
            </div>
          </section>
        )}
      </div>

      <FooterSection />
    </div>
  );
};

export default RedesignComplex;
