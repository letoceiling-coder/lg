import { useParams, Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useMemo, useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  MapPin,
  Building2,
  Ruler,
  Layers,
  Phone,
  MessageCircle,
  Heart,
  Share2,
  ChevronLeft,
  ChevronRight,
  TreePine,
  Hammer,
  Trees,
  Building as BuildingIcon,
  ParkingSquare,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import RedesignHeader from '@/redesign/components/RedesignHeader';
import FooterSection from '@/components/FooterSection';
import LeadForm from '@/shared/components/LeadForm';
import { apiGet } from '@/lib/api';
import { formatPrice } from '@/redesign/data/mock-data';
import { LIVEGRID_LOGO_SRC } from '@/redesign/lib/branding';
import { cn } from '@/lib/utils';
import { useAuth } from '@/shared/hooks/useAuth';
import ListingLocationMap from '@/redesign/components/ListingLocationMap';
import { useFavorites } from '@/shared/hooks/useFavorites';
import { shareCurrentPage } from '@/lib/share-page';
import { toast } from '@/components/ui/sonner';

  id: number;
  kind: 'APARTMENT' | 'HOUSE' | 'LAND' | 'COMMERCIAL' | 'PARKING';
  blockId: number | null;
  status: string;
  price: string | number | null;
  title: string | null;
  address: string | null;
  description: string | null;
  sourceUrl: string | null;
  region: { id: number; code?: string; name?: string } | null;
  block: { id: number; slug: string; name: string; addresses?: { address: string }[] } | null;
  builder: { name: string } | null;
  district: { name: string } | null;
  apartment: null | {
    floor: number | null;
    floorsTotal: number | null;
    areaTotal: string | number | null;
    areaKitchen: string | number | null;
    blockAddress?: string | null;
    planUrl?: string | null;
    finishingPhotoUrl?: string | null;
    extraPhotoUrls?: unknown;
    roomType?: { name: string } | null;
    finishing?: { name: string } | null;
  };
  house: null | {
    houseType?: string | null;
    areaTotal?: string | number | null;
    areaLand?: string | number | null;
    floorsCount?: number | null;
    bedrooms?: number | null;
    yearBuilt?: number | null;
    photoUrl?: string | null;
    extraPhotoUrls?: unknown;
  };
  land: null | {
    areaSotki?: string | number | null;
    landCategory?: string | null;
    photoUrl?: string | null;
    extraPhotoUrls?: unknown;
  };
  commercial: null | {
    commercialType?: string | null;
    area?: string | number | null;
    floor?: number | null;
    hasSeparateEntrance?: boolean | null;
  };
  parking: null | {
    parkingType?: string | null;
    area?: string | number | null;
    floor?: number | null;
    number?: string | null;
  };
  mediaFiles?: { id: number; url: string; kind: string; sortOrder: number | null }[];
};

const STATUS_LABEL: Record<string, string> = {
  ACTIVE: 'Свободно',
  RESERVED: 'Бронь',
  SOLD: 'Продано',
  DRAFT: 'Черновик',
  INACTIVE: 'Снято с публикации',
};

const STATUS_TONE: Record<string, string> = {
  ACTIVE: 'bg-emerald-100 text-emerald-800',
  RESERVED: 'bg-amber-100 text-amber-800',
  SOLD: 'bg-muted text-muted-foreground',
  DRAFT: 'bg-muted text-muted-foreground',
  INACTIVE: 'bg-red-100 text-red-800',
};

const KIND_LABEL: Record<string, string> = {
  APARTMENT: 'Квартира',
  HOUSE: 'Дом',
  LAND: 'Участок',
  COMMERCIAL: 'Коммерческое помещение',
  PARKING: 'Машиноместо',
};

const KIND_ICON: Record<string, typeof BuildingIcon> = {
  APARTMENT: BuildingIcon,
  HOUSE: TreePine,
  LAND: Trees,
  COMMERCIAL: Hammer,
  PARKING: ParkingSquare,
};

function num(v: unknown): number {
  if (v == null) return 0;
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
}

function arr(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.filter((x): x is string => typeof x === 'string' && x.trim().length > 0);
}

function buildTitle(l: ApiListingDetailUniversal): string {
  switch (l.kind) {
    case 'APARTMENT': {
      const rooms = l.apartment?.roomType?.name?.trim();
      const area = num(l.apartment?.areaTotal);
      const parts = [rooms || 'Квартира', area > 0 ? `${area} м²` : null].filter(Boolean);
      return parts.join(' · ');
    }
    case 'HOUSE': {
      const area = num(l.house?.areaTotal);
      const land = num(l.house?.areaLand);
      const head = 'Дом';
      const tail = [
        area > 0 ? `${area} м²` : null,
        land > 0 ? `участок ${land} сот.` : null,
      ].filter(Boolean);
      return tail.length ? `${head} · ${tail.join(' · ')}` : head;
    }
    case 'LAND': {
      const sotki = num(l.land?.areaSotki);
      return sotki > 0 ? `Участок · ${sotki} сот.` : 'Участок';
    }
    case 'COMMERCIAL': {
      const area = num(l.commercial?.area);
      const t = l.commercial?.commercialType?.trim() || 'Коммерция';
      return area > 0 ? `${t} · ${area} м²` : t;
    }
    case 'PARKING': {
      const area = num(l.parking?.area);
      const t = l.parking?.parkingType?.trim() || 'Машиноместо';
      return area > 0 ? `${t} · ${area} м²` : t;
    }
    default:
      return 'Объект';
  }
}

function buildPhotos(l: ApiListingDetailUniversal): string[] {
  const fromMedia = (l.mediaFiles ?? [])
    .filter((m) => m.kind === 'PHOTO')
    .map((m) => m.url);
  if (fromMedia.length) return fromMedia;
  const list: string[] = [];
  switch (l.kind) {
    case 'APARTMENT': {
      if (l.apartment?.finishingPhotoUrl) list.push(l.apartment.finishingPhotoUrl);
      if (l.apartment?.planUrl) list.push(l.apartment.planUrl);
      list.push(...arr(l.apartment?.extraPhotoUrls));
      break;
    }
    case 'HOUSE': {
      if (l.house?.photoUrl) list.push(l.house.photoUrl);
      list.push(...arr(l.house?.extraPhotoUrls));
      break;
    }
    case 'LAND': {
      if (l.land?.photoUrl) list.push(l.land.photoUrl);
      list.push(...arr(l.land?.extraPhotoUrls));
      break;
    }
    default:
      break;
  }
  if (!list.length) return [];
  return list;
}

function buildAttributes(l: ApiListingDetailUniversal): { label: string; value: string }[] {
  const out: { label: string; value: string }[] = [];
  switch (l.kind) {
    case 'APARTMENT': {
      const a = l.apartment;
      if (a?.areaTotal != null && num(a.areaTotal) > 0) out.push({ label: 'Общая площадь', value: `${num(a.areaTotal)} м²` });
      if (a?.areaKitchen != null && num(a.areaKitchen) > 0) out.push({ label: 'Кухня', value: `${num(a.areaKitchen)} м²` });
      if (a?.floor != null) out.push({ label: 'Этаж', value: a.floorsTotal ? `${a.floor} из ${a.floorsTotal}` : String(a.floor) });
      if (a?.finishing?.name) out.push({ label: 'Отделка', value: a.finishing.name });
      break;
    }
    case 'HOUSE': {
      const h = l.house;
      if (h?.areaTotal != null && num(h.areaTotal) > 0) out.push({ label: 'Площадь дома', value: `${num(h.areaTotal)} м²` });
      if (h?.areaLand != null && num(h.areaLand) > 0) out.push({ label: 'Участок', value: `${num(h.areaLand)} сот.` });
      if (h?.floorsCount != null) out.push({ label: 'Этажей', value: String(h.floorsCount) });
      if (h?.bedrooms != null) out.push({ label: 'Спален', value: String(h.bedrooms) });
      if (h?.yearBuilt != null) out.push({ label: 'Год постройки', value: String(h.yearBuilt) });
      if (h?.houseType) out.push({ label: 'Тип дома', value: h.houseType });
      break;
    }
    case 'LAND': {
      const land = l.land;
      if (land?.areaSotki != null && num(land.areaSotki) > 0) out.push({ label: 'Площадь', value: `${num(land.areaSotki)} сот.` });
      if (land?.landCategory) out.push({ label: 'Категория', value: land.landCategory });
      break;
    }
    case 'COMMERCIAL': {
      const c = l.commercial;
      if (c?.area != null && num(c.area) > 0) out.push({ label: 'Площадь', value: `${num(c.area)} м²` });
      if (c?.commercialType) out.push({ label: 'Тип', value: c.commercialType });
      if (c?.floor != null) out.push({ label: 'Этаж', value: String(c.floor) });
      if (c?.hasSeparateEntrance != null) out.push({ label: 'Отдельный вход', value: c.hasSeparateEntrance ? 'Да' : 'Нет' });
      break;
    }
    case 'PARKING': {
      const p = l.parking;
      if (p?.area != null && num(p.area) > 0) out.push({ label: 'Площадь', value: `${num(p.area)} м²` });
      if (p?.parkingType) out.push({ label: 'Тип', value: p.parkingType });
      if (p?.floor != null) out.push({ label: 'Этаж/Уровень', value: String(p.floor) });
      if (p?.number) out.push({ label: 'Номер', value: p.number });
      break;
    }
  }
  return out;
}

function pickAddress(l: ApiListingDetailUniversal): string | null {
  return (
    l.address ||
    l.apartment?.blockAddress ||
    l.block?.addresses?.[0]?.address ||
    null
  );
}

const RedesignListingDetail = () => {
  const { id: idParam } = useParams<{ id: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { isListingFavorite, toggleListing } = useFavorites();

  const listingId = useMemo(() => {
    const n = Number.parseInt(idParam ?? '', 10);
    return Number.isFinite(n) ? n : null;
  }, [idParam]);

  const [photoIdx, setPhotoIdx] = useState(0);
  const [heroFailed, setHeroFailed] = useState(false);

  const { data, isPending, isError } = useQuery({
    queryKey: ['listing', 'detail-universal', listingId],
    queryFn: () => apiGet<ApiListingDetailUniversal>(`/listings/${listingId}`),
    enabled: listingId != null,
    retry: false,
  });

  const photos = useMemo(() => {
    if (!data) return [];
    if (data.kind === 'APARTMENT' && data.block) return [];
    return buildPhotos(data);
  }, [data]);

  useEffect(() => {
    setHeroFailed(false);
  }, [photoIdx, listingId, photos.length, photos[0] ?? '']);

  if (listingId == null) {
    return <Navigate to="/catalog" replace />;
  }

  if (isPending) {
    return (
      <div className="min-h-screen bg-background">
        <RedesignHeader />
        <div className="max-w-[1200px] mx-auto px-4 py-16 text-center text-muted-foreground text-sm">Загрузка…</div>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="min-h-screen bg-background">
        <RedesignHeader />
        <div className="max-w-[1200px] mx-auto px-4 py-16 text-center">
          <p className="text-muted-foreground">Объект не найден</p>
          <Link to="/catalog" className="text-primary text-sm mt-2 inline-block">← Каталог</Link>
        </div>
      </div>
    );
  }

  // Если это квартира c блоком — отдадим работу старой странице.
  if (data.kind === 'APARTMENT' && data.block) {
    return <Navigate to={`/apartment/${data.id}`} replace />;
  }

  const attributes = buildAttributes(data);
  const computedTitle = buildTitle(data);
  const donorTitle = data.title?.trim() || null;
  const title = donorTitle ?? computedTitle;
  const description = data.description?.trim() || null;
  const KindIcon = KIND_ICON[data.kind] ?? BuildingIcon;
  const price = num(data.price);
  const priceDisplay = formatPrice(price);
  const address = pickAddress(data);
  const regionName = data.region?.name ?? '';
  const statusTone = STATUS_TONE[data.status] ?? 'bg-muted text-muted-foreground';
  const statusLabel = STATUS_LABEL[data.status] ?? data.status;

  const liked = isListingFavorite(data.id);
  const handleFavorite = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!isAuthenticated) {
      navigate('/login', { state: { from: location } });
      return;
    }
    void toggleListing(data.id);
  };

  const handleShare = (e: React.MouseEvent) => {
    e.preventDefault();
    void shareCurrentPage({ title });
  };

  return (
    <div className="min-h-screen bg-background pb-16 lg:pb-0">
      <RedesignHeader />

      <div className="max-w-[1200px] mx-auto px-4 py-6">
        {/* Breadcrumb */}
        <div className="flex items-center justify-between mb-5 gap-3 flex-wrap">
          <div className="flex items-center gap-2 text-sm text-muted-foreground flex-wrap">
            <Link to="/" className="hover:text-foreground transition-colors">Главная</Link>
            <span>/</span>
            <Link to="/catalog" className="hover:text-foreground transition-colors">Каталог</Link>
            {regionName ? (
              <>
                <span>/</span>
                <Link
                  to={`/catalog?region_id=${data.region!.id}`}
                  className="hover:text-foreground transition-colors"
                >
                  {regionName}
                </Link>
              </>
            ) : null}
            <span>/</span>
            <span className="text-foreground font-medium">{title}</span>
          </div>
          <div className="flex items-center gap-2">
            <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={handleFavorite}>
              <Heart className={cn('w-4 h-4', liked ? 'fill-destructive text-destructive' : 'text-muted-foreground')} />
            </Button>
            <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={handleShare}>
              <Share2 className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Photos + description */}
          <div className="lg:col-span-3 space-y-4">
            <div className="rounded-2xl border border-border bg-card overflow-hidden">
              <div className="relative aspect-[4/3] bg-muted/40">
                {photos.length === 0 || heroFailed ? (
                  <div className="absolute inset-0 flex items-center justify-center bg-muted/50 p-8">
                    <img
                      src={LIVEGRID_LOGO_SRC}
                      alt=""
                      className="max-h-[48%] max-w-[58%] object-contain opacity-45"
                    />
                  </div>
                ) : (
                  <img
                    src={photos[photoIdx]!}
                    alt={title}
                    className="absolute inset-0 w-full h-full object-cover"
                    onError={() => setHeroFailed(true)}
                  />
                )}
                <span
                  className={cn(
                    'absolute top-3 left-3 inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium',
                    statusTone,
                  )}
                >
                  {statusLabel}
                </span>
                {photos.length > 1 ? (
                  <>
                    <button
                      type="button"
                      onClick={() => setPhotoIdx((i) => (i - 1 + photos.length) % photos.length)}
                      className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-background/80 backdrop-blur border border-border text-muted-foreground hover:text-foreground hover:bg-background flex items-center justify-center"
                      aria-label="Предыдущее фото"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setPhotoIdx((i) => (i + 1) % photos.length)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-background/80 backdrop-blur border border-border text-muted-foreground hover:text-foreground hover:bg-background flex items-center justify-center"
                      aria-label="Следующее фото"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                    <div className="absolute bottom-3 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full bg-background/80 backdrop-blur text-xs text-muted-foreground border border-border">
                      {photoIdx + 1} / {photos.length}
                    </div>
                  </>
                ) : null}
              </div>
              {photos.length > 1 ? (
                <div className="px-3 py-3 flex gap-2 overflow-x-auto">
                  {photos.map((src, i) => (
                    <button
                      type="button"
                      key={`${src}-${i}`}
                      onClick={() => setPhotoIdx(i)}
                      className={cn(
                        'shrink-0 w-20 h-16 rounded-lg overflow-hidden border-2 transition-colors',
                        i === photoIdx ? 'border-primary' : 'border-transparent hover:border-border',
                      )}
                    >
                      <img src={src} alt="" className="w-full h-full object-cover" loading="lazy" />
                    </button>
                  ))}
                </div>
              ) : null}
            </div>

            {/* Attributes */}
            {attributes.length > 0 ? (
              <div className="rounded-2xl border border-border bg-card p-6">
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                  <KindIcon className="w-4 h-4 text-primary" />
                  Характеристики
                </h3>
                <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
                  {attributes.map((a) => (
                    <div key={a.label} className="flex items-baseline justify-between border-b border-dashed border-border/60 pb-1.5">
                      <dt className="text-muted-foreground">{a.label}</dt>
                      <dd className="font-medium text-right">{a.value}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            ) : null}

            {/* Description */}
            {description ? (
              <div className="rounded-2xl border border-border bg-card p-6">
                <h3 className="font-semibold mb-3">Описание</h3>
                <p className="text-sm text-foreground/90 whitespace-pre-line leading-relaxed">
                  {description}
                </p>
                {data.sourceUrl ? (
                  <a
                    href={data.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-4 inline-flex items-center text-xs text-primary hover:underline"
                  >
                    Источник объявления →
                  </a>
                ) : null}
              </div>
            ) : null}

            {/* Location */}
            {(address || regionName) ? (
              <div className="rounded-2xl border border-border bg-card p-6">
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-primary" />
                  Расположение
                </h3>
                <p className="text-sm mb-4">
                  {[regionName, address].filter(Boolean).join(', ')}
                </p>
                {address ? (
                  <ListingLocationMap address={address} regionName={regionName} height="280px" />
                ) : null}
              </div>
            ) : null}
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-2 space-y-4">
            <div className="rounded-2xl border border-border bg-card p-6">
              <p className="text-xs text-muted-foreground mb-1 inline-flex items-center gap-1.5">
                <KindIcon className="w-3.5 h-3.5" /> {KIND_LABEL[data.kind] ?? 'Объект'}
                {data.block ? (
                  <>
                    {' · '}
                    <Link to={`/complex/${data.block.slug}`} className="hover:text-primary">{data.block.name}</Link>
                  </>
                ) : null}
              </p>
              <h1 className="text-2xl font-bold mb-1">{title}</h1>
              {address || regionName ? (
                <div className="flex items-center gap-1.5 text-sm text-muted-foreground mb-5">
                  <MapPin className="w-3.5 h-3.5" />
                  {[regionName, address].filter(Boolean).join(' · ')}
                </div>
              ) : (
                <div className="mb-5" />
              )}

              <div className="border-t border-border pt-5 mb-5">
                <p className="text-3xl font-bold">{priceDisplay}</p>
                {data.kind === 'APARTMENT' &&
                data.apartment?.areaTotal &&
                num(data.apartment.areaTotal) > 0 &&
                priceDisplay !== 'Цена по запросу' ? (
                  <p className="text-sm text-muted-foreground mt-1">
                    {Math.round(price / num(data.apartment.areaTotal)).toLocaleString('ru-RU')} ₽/м²
                  </p>
                ) : null}
              </div>

              <div className="space-y-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground flex items-center gap-2.5">
                    <Building2 className="w-4 h-4" />
                    Тип
                  </span>
                  <span className="font-medium">{KIND_LABEL[data.kind]}</span>
                </div>
                {regionName ? (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground flex items-center gap-2.5">
                      <MapPin className="w-4 h-4" />
                      Регион
                    </span>
                    <span className="font-medium">{regionName}</span>
                  </div>
                ) : null}
                {data.kind === 'APARTMENT' && data.apartment?.areaTotal ? (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground flex items-center gap-2.5">
                      <Ruler className="w-4 h-4" />
                      Площадь
                    </span>
                    <span className="font-medium">{num(data.apartment.areaTotal)} м²</span>
                  </div>
                ) : null}
                {data.kind === 'APARTMENT' && data.apartment?.floor ? (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground flex items-center gap-2.5">
                      <Layers className="w-4 h-4" />
                      Этаж
                    </span>
                    <span className="font-medium">
                      {data.apartment.floor}{data.apartment.floorsTotal ? ` из ${data.apartment.floorsTotal}` : ''}
                    </span>
                  </div>
                ) : null}
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-card p-6 space-y-3">
              <Button
                type="button"
                className="w-full h-12"
                onClick={() => toast.info('Менеджер свяжется по форме ниже')}
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

            <LeadForm
              title="Узнать подробнее"
              source={`Объявление #${data.id} (${KIND_LABEL[data.kind]})`}
              listingId={data.id}
              requestType="CONSULTATION"
            />

            {data.builder?.name ? (
              <div className="rounded-2xl border border-border bg-card p-5">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-accent rounded-xl flex items-center justify-center text-sm font-bold text-accent-foreground">
                    {data.builder.name.charAt(0)}
                  </div>
                  <div>
                    <p className="font-semibold text-sm">{data.builder.name}</p>
                    <p className="text-xs text-muted-foreground">Партнёр</p>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <FooterSection />
    </div>
  );
};

export default RedesignListingDetail;
