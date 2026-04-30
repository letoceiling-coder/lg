import { useParams, Link, useLocation, useNavigate, Navigate } from 'react-router-dom';
import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { MapPin, Building2, CalendarDays, Ruler, ChefHat, Layers, Paintbrush, Train, Phone, MessageCircle, Heart, Share2, GitCompare, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import RedesignHeader from '@/redesign/components/RedesignHeader';
import FooterSection from '@/components/FooterSection';
import LeadForm from '@/shared/components/LeadForm';
import { apiGet } from '@/lib/api';
import { mapListingRowToApartment, type ApiListingRow } from '@/redesign/lib/blocks-from-api';
import { mapListingDetailToApartmentPage, type ApiListingDetail } from '@/redesign/lib/listing-page-from-api';
import { getApartmentById, formatPrice, MIN_REASONABLE_PRICE_RUB } from '@/redesign/data/mock-data';
import { LIVEGRID_LOGO_SRC } from '@/redesign/lib/branding';
import { cn } from '@/lib/utils';
import { useAuth } from '@/shared/hooks/useAuth';
import { useFavorites } from '@/shared/hooks/useFavorites';
import { useCompare } from '@/shared/hooks/useCompare';
import { shareCurrentPage } from '@/lib/share-page';
import { toast } from '@/components/ui/sonner';

function parseNumericListingId(id: string | undefined): number | null {
  if (!id) return null;
  const n = Number.parseInt(id, 10);
  if (!Number.isFinite(n) || String(n) !== id) return null;
  return n;
}

const RedesignApartment = () => {
  const { id: idParam } = useParams<{ id: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { isListingFavorite, toggleListing } = useFavorites();
  const { isCompared, toggle: toggleCompare, count: compareCount } = useCompare();
  const listingId = parseNumericListingId(idParam);

  const mockResult = useMemo(() => {
    if (listingId != null) return null;
    return getApartmentById(idParam || '');
  }, [idParam, listingId]);

  const listingQuery = useQuery({
    queryKey: ['listing', 'detail', listingId],
    queryFn: () => apiGet<ApiListingDetail>(`/listings/${listingId}`),
    enabled: listingId != null,
    retry: false,
  });

  const apiPage = useMemo(() => {
    if (!listingQuery.data) return null;
    return mapListingDetailToApartmentPage(listingQuery.data);
  }, [listingQuery.data]);

  const blockId = listingQuery.data?.blockId ?? listingQuery.data?.block?.id ?? null;

  const similarApiQuery = useQuery({
    queryKey: ['listings', 'similar-apartments', blockId, listingId, apiPage?.apartment.rooms],
    queryFn: () =>
      apiGet<{ data: ApiListingRow[] }>(
        `/listings?block_id=${blockId}&kind=APARTMENT&status=ACTIVE&per_page=40`,
      ),
    enabled: Boolean(apiPage && blockId != null && listingId != null),
    select: (res) => {
      if (blockId == null || listingId == null) return [];
      const rooms = apiPage?.apartment.rooms;
      if (rooms === undefined) return [];
      return res.data
        .filter((l) => l.id !== listingId)
        .map((l) => mapListingRowToApartment(l, String(blockId), String(l.buildingId ?? `${blockId}-main`)))
        .filter((a): a is NonNullable<typeof a> => a != null)
        .filter((a) => a.rooms === rooms && a.status === 'available')
        .slice(0, 4);
    },
  });

  const apt = mockResult?.apartment ?? apiPage?.apartment;
  const complex = mockResult?.complex ?? apiPage?.complex;
  const building = mockResult?.building ?? apiPage?.building;

  const similarApts = useMemo(() => {
    if (mockResult?.complex && mockResult.apartment) {
      return mockResult.complex.buildings
        .flatMap((b) => b.apartments)
        .filter((a) => a.id !== mockResult.apartment!.id && a.status === 'available' && a.rooms === mockResult.apartment!.rooms)
        .slice(0, 4);
    }
    return similarApiQuery.data ?? [];
  }, [mockResult, similarApiQuery.data]);

  const loading = listingId != null && listingQuery.isPending;
  const apiFailed = listingId != null && (listingQuery.isError || (listingQuery.isFetched && !apiPage));

  // Если объект пришёл, но это не квартира (например, дом/участок/коммерция/паркинг
  // или квартира без блока) — отдадим работу универсальной странице.
  const fetchedKind = listingQuery.data?.kind;
  const fetchedHasBlock = !!listingQuery.data?.block;
  if (
    listingId != null &&
    listingQuery.isFetched &&
    listingQuery.data &&
    (fetchedKind !== 'APARTMENT' || !fetchedHasBlock)
  ) {
    return <Navigate to={`/listing/${listingId}`} replace />;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <RedesignHeader />
        <div className="max-w-[1400px] mx-auto px-4 py-16 text-center text-muted-foreground text-sm">Загрузка…</div>
      </div>
    );
  }

  if (apiFailed || !apt || !complex || !building) {
    return (
      <div className="min-h-screen bg-background">
        <RedesignHeader />
        <div className="max-w-[1400px] mx-auto px-4 py-16 text-center">
          <p className="text-muted-foreground">Квартира не найдена</p>
          <Link to="/catalog" className="text-primary text-sm mt-2 inline-block">← Каталог</Link>
        </div>
      </div>
    );
  }

  const roomLabel = apt.rooms === 0 ? 'Студия' : `${apt.rooms}-комнатная`;

  const listingLiked = listingId != null && isListingFavorite(listingId);
  const handleListingFavorite = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (listingId == null) return;
    if (!isAuthenticated) {
      navigate('/login', { state: { from: location } });
      return;
    }
    void toggleListing(listingId);
  };

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
    void shareCurrentPage({ title: `${complex.name} · ${roomLabel}` });
  };

  const details = [
    { icon: Layers, label: 'Комнат', value: apt.rooms === 0 ? 'Студия' : `${apt.rooms}` },
    { icon: Ruler, label: 'Общая площадь', value: `${apt.area} м²` },
    { icon: ChefHat, label: 'Кухня', value: `${apt.kitchenArea} м²` },
    { icon: Building2, label: 'Этаж', value: `${apt.floor} из ${apt.totalFloors}` },
    { icon: Paintbrush, label: 'Отделка', value: apt.finishing },
    { icon: CalendarDays, label: 'Сдача', value: building.deadline },
    { icon: MapPin, label: 'Район', value: complex.district },
    { icon: Train, label: 'Метро', value: `${complex.subway} · ${complex.subwayDistance}` },
  ];

  const totalPriceDisplay = formatPrice(apt.price);
  const priceNum = typeof apt.price === 'number' ? apt.price : Number(apt.price);
  const priceOk = Number.isFinite(priceNum) && priceNum >= MIN_REASONABLE_PRICE_RUB;
  const ppmOk = priceOk && apt.pricePerMeter > 0;

  return (
    <div className="min-h-screen bg-background pb-16 lg:pb-0">
      <RedesignHeader />
      <div className="max-w-[1400px] mx-auto px-4 py-6">
        {/* Breadcrumb */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2 text-sm text-muted-foreground flex-wrap">
            <Link to="/" className="hover:text-foreground transition-colors">Главная</Link>
            <span>/</span>
            <Link to="/catalog" className="hover:text-foreground transition-colors">Каталог</Link>
            <span>/</span>
            <Link to={`/complex/${complex.slug}`} className="hover:text-foreground transition-colors">{complex.name}</Link>
            <span>/</span>
            <span className="text-foreground font-medium">{roomLabel}, {apt.area} м²</span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Plan & description */}
          <div className="lg:col-span-3 space-y-4">
            <div className="rounded-2xl border border-border bg-card overflow-hidden">
              <div className="relative min-h-[min(520px,70vh)] sm:min-h-[min(580px,75vh)] bg-muted/50 flex items-center justify-center p-4 sm:p-8">
                <div className="absolute top-3 right-3 z-10 flex items-center gap-2 rounded-xl border border-border/70 bg-background/90 backdrop-blur-sm px-2 py-1 shadow-sm">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                    disabled={listingId == null}
                    title={listingId == null ? 'Избранное для объявлений из каталога' : undefined}
                    onClick={handleListingFavorite}
                  >
                    <Heart
                      className={cn(
                        'w-4 h-4',
                        listingLiked ? 'fill-destructive text-destructive' : 'text-muted-foreground',
                      )}
                    />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                    title={inCompare ? 'Убрать ЖК из сравнения' : 'Добавить ЖК в сравнение'}
                    onClick={handleCompare}
                  >
                    <GitCompare className={cn('w-4 h-4', inCompare ? 'text-primary' : 'text-muted-foreground')} />
                  </Button>
                  <Button variant="ghost" size="sm" className="h-8 w-8 px-2" title="Презентация ЖК" asChild>
                    <Link to={`/presentation/${complex.slug}`}>
                      <FileText className="w-4 h-4" />
                    </Link>
                  </Button>
                  <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0" title="Поделиться" onClick={handleShare}>
                    <Share2 className="w-4 h-4" />
                  </Button>
                </div>
                <img
                  src={apt.planImage || LIVEGRID_LOGO_SRC}
                  alt="Планировка"
                  className="mx-auto max-h-[min(640px,78vh)] w-auto max-w-full object-contain"
                  onError={(e) => {
                    e.currentTarget.src = LIVEGRID_LOGO_SRC;
                  }}
                />
              </div>
            </div>

            {apt.finishingImage ? (
              <div className="rounded-2xl border border-border bg-card overflow-hidden">
                <div className="px-6 pt-4">
                  <h3 className="font-semibold text-sm">Отделка</h3>
                </div>
                <div className="aspect-[4/3] bg-muted/50 flex items-center justify-center p-8">
                  <img
                    src={apt.finishingImage}
                    alt="Отделка"
                    className="max-w-full max-h-full object-contain"
                    onError={(e) => {
                      e.currentTarget.src = LIVEGRID_LOGO_SRC;
                    }}
                  />
                </div>
              </div>
            ) : null}

            {apt.galleryImages && apt.galleryImages.length > 0 ? (
              <div className="rounded-2xl border border-border bg-card p-6">
                <h3 className="font-semibold mb-3">Фотографии</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {apt.galleryImages.map((src, i) => (
                    <div key={`${src}-${i}`} className="rounded-xl overflow-hidden border border-border bg-muted/30">
                      <img
                        src={src || LIVEGRID_LOGO_SRC}
                        alt=""
                        className="w-full h-48 object-cover"
                        onError={(e) => {
                          e.currentTarget.src = LIVEGRID_LOGO_SRC;
                        }}
                      />
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {/* Description */}
            <div className="rounded-2xl border border-border bg-card p-6">
              <h3 className="font-semibold mb-3">О квартире</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {roomLabel} площадью {apt.area} м² на {apt.floor} этаже {apt.totalFloors}-этажного дома в ЖК «{complex.name}».
                {apt.finishing !== 'без отделки' ? ` Отделка: ${apt.finishing}.` : ' Без отделки.'}
                {' '}Район: {complex.district}, метро {complex.subway} ({complex.subwayDistance}).
                {' '}Кухня {apt.kitchenArea} м².
                {ppmOk ? ` Цена за метр: ${apt.pricePerMeter.toLocaleString('ru-RU')} ₽/м².` : ''}
              </p>
            </div>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-2 space-y-4">
            {/* Price card */}
            <div className="rounded-2xl border border-border bg-card p-6">
              <p className="text-xs text-muted-foreground mb-1">
                <Link to={`/complex/${complex.slug}`} className="hover:text-primary transition-colors">{complex.name}</Link> · {building.name}
              </p>
              <h1 className="text-2xl font-bold mb-1">{roomLabel}, {apt.area} м²</h1>
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground mb-5">
                <MapPin className="w-3.5 h-3.5" />
                {complex.address} · м. {complex.subway}
              </div>

              <div className="border-t border-border pt-5 mb-5">
                <p className="text-3xl font-bold">{totalPriceDisplay}</p>
                {ppmOk ? (
                  <p className="text-sm text-muted-foreground mt-1">
                    {apt.pricePerMeter.toLocaleString('ru-RU')} ₽/м²
                  </p>
                ) : null}
              </div>

              <div className="space-y-3">
                {details.map(d => (
                  <div key={d.label} className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground flex items-center gap-2.5">
                      <d.icon className="w-4 h-4" />{d.label}
                    </span>
                    <span className="font-medium capitalize">{d.value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* CTA */}
            <div className="rounded-2xl border border-border bg-card p-6 space-y-3">
              <Button
                type="button"
                className="w-full h-12"
                onClick={() => toast.info('Телефон застройщика будет доступен после подключения справочника контактов')}
              >
                <Phone className="w-4 h-4 mr-2" /> Позвонить
              </Button>
              <Button
                type="button"
                variant="outline"
                className="w-full h-12"
                onClick={() => toast.info('Оставьте заявку ниже — менеджер согласует время просмотра')}
              >
                <MessageCircle className="w-4 h-4 mr-2" /> Записаться на просмотр
              </Button>
            </div>

            {/* LeadForm */}
            <LeadForm
              title="Узнать подробнее"
              source={`Квартира: ${apt.id}`}
              blockId={blockId ?? undefined}
              listingId={listingId ?? undefined}
              requestType="CONSULTATION"
            />

            {/* Builder */}
            <div className="rounded-2xl border border-border bg-card p-5">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-accent rounded-xl flex items-center justify-center text-sm font-bold text-accent-foreground">
                  {(complex.builder && complex.builder !== '—' ? complex.builder : 'З').charAt(0)}
                </div>
                <div>
                  <p className="font-semibold text-sm">{complex.builder}</p>
                  <p className="text-xs text-muted-foreground">Застройщик</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Similar apartments */}
        {similarApts.length > 0 && (
          <section className="mt-12">
            <h2 className="text-lg font-bold mb-4">Похожие квартиры в {complex.name}</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {similarApts.map(a => (
                <Link
                  key={a.id}
                  to={`/apartment/${a.id}`}
                  className="group rounded-xl border border-border bg-card overflow-hidden hover:shadow-md hover:-translate-y-px transition-all"
                >
                  <div className="aspect-square bg-muted/50 flex items-center justify-center p-6 sm:p-8">
                    <img
                      src={a.planImage}
                      alt="План"
                      className="max-h-[min(220px,40vw)] w-auto max-w-full object-contain opacity-60 transition-opacity group-hover:opacity-100"
                      onError={(e) => {
                        e.currentTarget.src = LIVEGRID_LOGO_SRC;
                        e.currentTarget.classList.remove('opacity-60');
                      }}
                    />
                  </div>
                  <div className="p-3 space-y-1">
                    <h4 className="font-semibold text-sm">{a.rooms === 0 ? 'Студия' : `${a.rooms}-комн`}, {a.area} м²</h4>
                    <p className="text-xs text-muted-foreground">Этаж {a.floor}/{a.totalFloors} · {a.finishing}</p>
                    <p className="font-bold text-sm text-primary">{formatPrice(a.price)}</p>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>

      <FooterSection />
    </div>
  );
};

export default RedesignApartment;
