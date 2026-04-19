import { Link } from 'react-router-dom';
import { MapPin } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatPrice } from '@/redesign/data/mock-data';

const PLACEHOLDER = '/placeholder.svg';

export type ApiListingCardRow = {
  id: number;
  kind: string;
  price: string | number | null;
  status: string;
  block?: { name: string; slug: string } | null;
  region?: { code?: string; name?: string } | null;
  apartment?: {
    areaTotal: string | number | null;
    areaKitchen: string | number | null;
    floor: number | null;
    floorsTotal: number | null;
    planUrl: string | null;
    finishingPhotoUrl?: string | null;
    extraPhotoUrls?: unknown;
    roomType?: { name: string } | null;
  } | null;
  house?: {
    areaTotal?: string | number | null;
    areaLand?: string | number | null;
    floorsCount?: number | null;
    bedrooms?: number | null;
    photoUrl?: string | null;
    extraPhotoUrls?: unknown;
  } | null;
  land?: {
    areaSotki?: string | number | null;
    landCategory?: string | null;
    photoUrl?: string | null;
    extraPhotoUrls?: unknown;
  } | null;
  commercial?: {
    commercialType?: string | null;
    area?: string | number | null;
    floor?: number | null;
  } | null;
  parking?: {
    parkingType?: string | null;
    area?: string | number | null;
    floor?: number | null;
  } | null;
};

interface Props {
  listing: ApiListingCardRow;
  variant?: 'grid' | 'list';
}

function num(v: unknown): number {
  if (v == null) return 0;
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
}

function pickImage(l: ApiListingCardRow): string {
  const tryUrl = (raw: unknown): string | null => {
    if (typeof raw === 'string' && raw.trim()) return raw;
    return null;
  };
  const fromArray = (arr: unknown): string | null => {
    if (!Array.isArray(arr)) return null;
    for (const it of arr) {
      const u = tryUrl(it);
      if (u) return u;
    }
    return null;
  };
  return (
    tryUrl(l.house?.photoUrl) ??
    fromArray(l.house?.extraPhotoUrls) ??
    tryUrl(l.land?.photoUrl) ??
    fromArray(l.land?.extraPhotoUrls) ??
    tryUrl(l.apartment?.finishingPhotoUrl) ??
    fromArray(l.apartment?.extraPhotoUrls) ??
    tryUrl(l.apartment?.planUrl) ??
    PLACEHOLDER
  );
}

function buildTitle(l: ApiListingCardRow): string {
  switch (l.kind) {
    case 'HOUSE': {
      const area = num(l.house?.areaTotal);
      return area > 0 ? `Дом · ${area} м²` : 'Дом';
    }
    case 'LAND': {
      const sotki = num(l.land?.areaSotki);
      return sotki > 0 ? `Участок · ${sotki} сот.` : 'Участок';
    }
    case 'COMMERCIAL': {
      const t = l.commercial?.commercialType?.trim();
      const area = num(l.commercial?.area);
      const head = t || 'Коммерция';
      return area > 0 ? `${head} · ${area} м²` : head;
    }
    case 'PARKING': {
      const t = l.parking?.parkingType?.trim();
      const area = num(l.parking?.area);
      const head = t || 'Машиноместо';
      return area > 0 ? `${head} · ${area} м²` : head;
    }
    case 'APARTMENT':
    default: {
      const rooms = l.apartment?.roomType?.name?.trim();
      const area = num(l.apartment?.areaTotal);
      const parts = [rooms, area > 0 ? `${area} м²` : null].filter(Boolean);
      return parts.length ? parts.join(' · ') : 'Объект';
    }
  }
}

function buildSubtitle(l: ApiListingCardRow): string {
  const block = l.block?.name?.trim();
  const region = l.region?.name?.trim();
  if (block && region) return `${block} · ${region}`;
  return block || region || '—';
}

const STATUS_LABEL: Record<string, string> = {
  ACTIVE: 'Свободно',
  RESERVED: 'Бронь',
  SOLD: 'Продано',
  DRAFT: 'Черновик',
};

const STATUS_TONE: Record<string, string> = {
  ACTIVE: 'bg-emerald-100 text-emerald-800',
  RESERVED: 'bg-amber-100 text-amber-800',
  SOLD: 'bg-muted text-muted-foreground',
  DRAFT: 'bg-muted text-muted-foreground',
};

const ListingCard = ({ listing, variant = 'grid' }: Props) => {
  const price = num(listing.price);
  const formatted = formatPrice(price);
  const img = pickImage(listing);
  const title = buildTitle(listing);
  const subtitle = buildSubtitle(listing);
  const statusLabel = STATUS_LABEL[listing.status] ?? listing.status;
  const statusTone = STATUS_TONE[listing.status] ?? 'bg-muted text-muted-foreground';

  const linkTo = listing.kind === 'APARTMENT' ? `/apartment/${listing.id}` : `/listing/${listing.id}`;

  const isList = variant === 'list';

  return (
    <Link
      to={linkTo}
      className={cn(
        'group block overflow-hidden rounded-xl border border-border bg-card transition-shadow hover:shadow-sm',
        isList ? 'sm:flex sm:items-stretch' : '',
      )}
    >
      <div
        className={cn(
          'relative w-full bg-muted/30 overflow-hidden',
          isList ? 'sm:w-56 sm:shrink-0 h-[160px]' : 'h-[160px]',
        )}
      >
        <img
          src={img}
          alt=""
          loading="lazy"
          className="absolute inset-0 w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-200"
        />
        <span
          className={cn(
            'absolute top-2 left-2 inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium',
            statusTone,
          )}
        >
          {statusLabel}
        </span>
      </div>
      <div className="p-3 flex flex-col gap-0.5 flex-1 min-w-0">
        <div className="flex justify-between items-start gap-2">
          <h3 className="font-semibold text-sm leading-tight truncate">{title}</h3>
          <span className="font-bold text-sm shrink-0 text-primary">{formatted}</span>
        </div>
        <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
          <MapPin className="w-3 h-3 shrink-0" />
          <span className="truncate">{subtitle}</span>
        </div>
        <span className="text-primary text-[11px] font-medium mt-1 group-hover:underline">Подробнее</span>
      </div>
    </Link>
  );
};

export default ListingCard;
