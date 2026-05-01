import { useParams, Link, useLocation, useNavigate, Navigate } from 'react-router-dom';
import { useEffect, useMemo, useRef, useState } from 'react';
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
import MissingPhotoPlaceholder from '@/redesign/components/MissingPhotoPlaceholder';
import { cn } from '@/lib/utils';
import { useAuth } from '@/shared/hooks/useAuth';
import { useFavorites } from '@/shared/hooks/useFavorites';
import { useCompare } from '@/shared/hooks/useCompare';
import { shareCurrentPage } from '@/lib/share-page';
import { toast } from '@/components/ui/sonner';
import { useYandexMapsReady } from '@/shared/hooks/useYandexMapsReady';

function parseNumericListingId(id: string | undefined): number | null {
  if (!id) return null;
  const n = Number.parseInt(id, 10);
  if (!Number.isFinite(n) || String(n) !== id) return null;
  return n;
}

declare global {
  interface Window { ymaps: any; }
}

const STATUS_LABEL = {
  available: 'Свободна',
  reserved: 'Бронь',
  sold: 'Продана',
} as const;

type LightboxState = {
  src: string;
  label: string;
} | null;

function isValidImageSrc(src?: string | null): src is string {
  return Boolean(src && !src.endsWith('/placeholder.svg'));
}

function PlanImage({ src, onOpen }: { src?: string | null; onOpen?: (src: string) => void }) {
  const [failed, setFailed] = useState(false);
  const valid = isValidImageSrc(src) && !failed;
  if (!valid) {
    return <MissingPhotoPlaceholder className="aspect-square max-h-[min(640px,78vh)] max-w-full rounded-xl" />;
  }
  return (
    <button type="button" className="max-w-full cursor-zoom-in" onClick={() => onOpen?.(src)}>
      <img
        src={src}
        alt="Планировка"
        className="mx-auto max-h-[min(640px,78vh)] w-auto max-w-full object-contain"
        onError={() => setFailed(true)}
      />
    </button>
  );
}

function ImageTile({
  src,
  alt,
  className,
  imageClassName,
  onOpen,
}: {
  src?: string | null;
  alt: string;
  className?: string;
  imageClassName?: string;
  onOpen?: (src: string) => void;
}) {
  const [failed, setFailed] = useState(false);
  const valid = isValidImageSrc(src) && !failed;
  if (!valid) {
    return <MissingPhotoPlaceholder className={className} />;
  }
  const image = (
    <img
      src={src}
      alt={alt}
      className={cn('h-full w-full object-cover', imageClassName)}
      loading="lazy"
      onError={() => setFailed(true)}
    />
  );
  if (!onOpen) {
    return <div className={cn('overflow-hidden', className)}>{image}</div>;
  }
  return (
    <button type="button" className={cn('block overflow-hidden text-left', className)} onClick={() => onOpen(src)}>
      {image}
    </button>
  );
}

const RedesignApartment = () => {
  const { id: idParam } = useParams<{ id: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { isListingFavorite, toggleListing } = useFavorites();
  const { isCompared, toggle: toggleCompare, count: compareCount } = useCompare();
  const { ready: ymapsReady } = useYandexMapsReady();
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const [lightbox, setLightbox] = useState<LightboxState>(null);
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

  const mediaImages = useMemo(() => {
    const fromListing = listingQuery.data && Array.isArray((listingQuery.data as any).mediaFiles)
      ? ((listingQuery.data as any).mediaFiles as { url?: string | null; kind?: string | null }[])
          .map((file) => file.url)
          .filter((url): url is string => isValidImageSrc(url))
      : [];
    const fromApartment = apt?.galleryImages?.filter(isValidImageSrc) ?? [];
    return Array.from(new Set([...fromApartment, ...fromListing]));
  }, [apt?.galleryImages, listingQuery.data]);

  useEffect(() => {
    mapInstanceRef.current?.destroy?.();
    mapInstanceRef.current = null;
  }, [complex?.coords[0], complex?.coords[1]]);

  useEffect(() => {
    if (!ymapsReady || !complex || !mapRef.current || mapInstanceRef.current || !window.ymaps) return;
    window.ymaps.ready(() => {
      if (!mapRef.current || mapInstanceRef.current) return;
      const map = new window.ymaps.Map(mapRef.current, {
        center: complex.coords,
        zoom: 15,
        controls: ['zoomControl'],
      });
      const placemark = new window.ymaps.Placemark(
        complex.coords,
        {
          balloonContentHeader: `<strong>${complex.name}</strong>`,
          balloonContentBody: `<div>${complex.address}</div>`,
        },
        { preset: 'islands#blueCircleDotIcon' },
      );
      map.geoObjects.add(placemark);
      mapInstanceRef.current = map;
    });
  }, [ymapsReady, complex]);

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

  const listingCompareKey = listingId != null ? `l:${listingId}` : complex.slug;
  const inCompare = isCompared(listingCompareKey);
  const handleCompare = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!inCompare && compareCount >= 3) {
      toast.error('В сравнении не более 3 объектов');
      return;
    }
    toggleCompare(listingCompareKey);
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

  const parameterRows = [
    { label: 'Жилой комплекс', value: complex.name },
    { label: 'Адрес', value: complex.address },
    { label: 'Застройщик', value: complex.builder },
    { label: 'Корпус', value: building.name },
    { label: 'Секция', value: apt.section > 0 ? String(apt.section) : null },
    { label: 'Номер квартиры', value: apt.number },
    { label: 'Статус', value: STATUS_LABEL[apt.status] },
    { label: 'Комнатность', value: roomLabel },
    { label: 'Общая площадь', value: `${apt.area} м²` },
    { label: 'Площадь кухни', value: apt.kitchenArea > 0 ? `${apt.kitchenArea} м²` : null },
    { label: 'Этаж', value: apt.floor > 0 ? `${apt.floor} из ${apt.totalFloors}` : null },
    { label: 'Отделка', value: apt.finishing },
    { label: 'Срок сдачи', value: building.deadline },
    { label: 'Район', value: complex.district },
    { label: 'Метро', value: complex.subway !== '—' ? `${complex.subway} · ${complex.subwayDistance}` : null },
    { label: 'Цена', value: totalPriceDisplay },
    { label: 'Цена за м²', value: ppmOk ? `${apt.pricePerMeter.toLocaleString('ru-RU')} ₽/м²` : 'Цена по запросу' },
  ].filter((row) => {
    if (row.value == null) return false;
    const value = String(row.value).trim();
    return value.length > 0 && value !== '—' && value !== 'undefined';
  });

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
                    title={
                      listingId != null
                        ? inCompare
                          ? 'Убрать объект из сравнения'
                          : 'Добавить объект в сравнение'
                        : inCompare
                          ? 'Убрать ЖК из сравнения'
                          : 'Добавить ЖК в сравнение'
                    }
                    onClick={handleCompare}
                  >
                    <GitCompare className={cn('w-4 h-4', inCompare ? 'text-primary' : 'text-muted-foreground')} />
                  </Button>
                  <Button variant="ghost" size="sm" className="h-8 w-8 px-2" title="Презентация объекта (фото и планы)" asChild>
                    <Link to={listingId != null ? `/presentation/listing/${listingId}` : `/presentation/${complex.slug}`}>
                      <FileText className="w-4 h-4" />
                    </Link>
                  </Button>
                  {listingId != null ? (
                    <Button variant="ghost" size="sm" className="h-8 w-8 px-2" title="Презентация всего ЖК" asChild>
                      <Link to={`/presentation/${complex.slug}`}>
                        <Building2 className="w-4 h-4" />
                      </Link>
                    </Button>
                  ) : null}
                  <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0" title="Поделиться" onClick={handleShare}>
                    <Share2 className="w-4 h-4" />
                  </Button>
                </div>
                <PlanImage src={apt.planImage} onOpen={(src) => setLightbox({ src, label: 'Планировка' })} />
              </div>
            </div>

            {apt.finishingImage ? (
              <div className="rounded-2xl border border-border bg-card overflow-hidden">
                <div className="px-6 pt-4">
                  <h3 className="font-semibold text-sm">Отделка</h3>
                </div>
                <div className="aspect-[4/3] bg-muted/50 flex items-center justify-center p-8">
                  <ImageTile
                    src={apt.finishingImage}
                    alt="Отделка"
                    className="h-full w-full rounded-xl bg-muted/30"
                    imageClassName="object-contain"
                    onOpen={(src) => setLightbox({ src, label: 'Отделка' })}
                  />
                </div>
              </div>
            ) : null}

            {mediaImages.length > 0 ? (
              <div className="rounded-2xl border border-border bg-card p-6">
                <h3 className="font-semibold mb-3">Фотографии</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {mediaImages.map((src, i) => (
                    <ImageTile
                      key={`${src}-${i}`}
                      src={src}
                      alt={`Фото квартиры ${i + 1}`}
                      className="h-48 rounded-xl border border-border bg-muted/30"
                      onOpen={(imageSrc) => setLightbox({ src: imageSrc, label: `Фото квартиры ${i + 1}` })}
                    />
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

            <div className="rounded-2xl border border-border bg-card p-6">
              <h3 className="font-semibold mb-4">Параметры квартиры</h3>
              <div className="overflow-hidden rounded-xl border border-border">
                {parameterRows.map((row, index) => (
                  <div
                    key={row.label}
                    className={cn(
                      'grid grid-cols-1 gap-1 px-4 py-3 text-sm sm:grid-cols-[220px_1fr] sm:gap-4',
                      index > 0 && 'border-t border-border',
                    )}
                  >
                    <span className="text-muted-foreground">{row.label}</span>
                    <span className={cn('font-medium', row.value === 'Цена по запросу' && 'text-[#6b7280]')}>{row.value}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-card overflow-hidden">
              <div className="p-4 border-b border-border flex flex-wrap items-center gap-2">
                <MapPin className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium">{complex.address}</span>
                {complex.subway !== '—' ? <span className="text-xs text-muted-foreground">· м. {complex.subway} · {complex.subwayDistance}</span> : null}
              </div>
              <div ref={mapRef} className="h-[320px] bg-muted" />
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
                <p className={cn('text-3xl font-bold', totalPriceDisplay === 'Цена по запросу' ? 'text-[#6b7280]' : 'text-primary')}>
                  {totalPriceDisplay}
                </p>
                {ppmOk ? (
                  <p className="text-sm text-muted-foreground mt-1">
                    {apt.pricePerMeter.toLocaleString('ru-RU')} ₽/м²
                  </p>
                ) : (
                  <p className="text-sm text-[#6b7280] mt-1">Цена по запросу</p>
                )}
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
                    <ImageTile
                      src={a.planImage}
                      alt="План"
                      className="h-full w-full bg-transparent"
                      imageClassName="object-contain p-6 sm:p-8 opacity-60 transition-opacity group-hover:opacity-100"
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

      {lightbox ? (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/75 p-4" role="dialog" aria-modal="true">
          <button
            type="button"
            className="absolute inset-0 cursor-zoom-out"
            aria-label="Закрыть изображение"
            onClick={() => setLightbox(null)}
          />
          <div className="relative z-10 max-h-full w-full max-w-5xl rounded-2xl bg-background p-3 shadow-2xl">
            <div className="mb-2 flex items-center justify-between gap-3 px-1">
              <p className="text-sm font-medium">{lightbox.label}</p>
              <button type="button" className="text-sm text-muted-foreground hover:text-foreground" onClick={() => setLightbox(null)}>
                Закрыть
              </button>
            </div>
            <img src={lightbox.src} alt={lightbox.label} className="max-h-[82vh] w-full rounded-xl object-contain" />
          </div>
        </div>
      ) : null}

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 p-3 shadow-[0_-8px_24px_rgba(15,23,42,0.12)] backdrop-blur lg:hidden">
        <div className="mx-auto flex max-w-[1400px] gap-2">
          <Button
            type="button"
            className="h-11 flex-1"
            onClick={() => toast.info('Телефон застройщика будет доступен после подключения справочника контактов')}
          >
            <Phone className="mr-2 h-4 w-4" /> Позвонить
          </Button>
          <Button
            type="button"
            variant="outline"
            className="h-11 flex-1"
            onClick={() => toast.info('Оставьте заявку ниже — менеджер согласует время просмотра')}
          >
            <MessageCircle className="mr-2 h-4 w-4" /> Просмотр
          </Button>
        </div>
      </div>

      <FooterSection />
    </div>
  );
};

export default RedesignApartment;
