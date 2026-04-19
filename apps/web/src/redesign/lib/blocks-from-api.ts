import type { Apartment, Building, LayoutGroup, ResidentialComplex } from '@/redesign/data/types';
import { MIN_REASONABLE_PRICE_RUB } from '@/redesign/data/mock-data';

const PLACEHOLDER = '/placeholder.svg';

export type ApiBlockListRow = {
  id: number;
  slug: string;
  name: string;
  isPromoted?: boolean;
  description?: string | null;
  dataSource?: string;
  status: string;
  salesStartDate?: string | Date | null;
  latitude?: unknown;
  longitude?: unknown;
  region?: { id: number; code?: string; name?: string } | null;
  district?: { name: string } | null;
  builder?: { name: string } | null;
  addresses?: { address: string }[];
  images?: { url: string }[];
  subways?: { distanceTime: number | null; subway: { name: string } }[];
  infrastructure?: unknown;
  _count?: { listings: number };
  listingPriceMin?: number | null;
  listingPriceMax?: number | null;
};

export type ApiBlockDetail = ApiBlockListRow & {
  region?: { id: number; code?: string; name?: string } | null;
  buildings?: {
    id: number;
    name: string | null;
    queue: string | null;
    deadline: string | null;
  }[];
};

export type ApiListingRow = {
  id: number;
  blockId: number | null;
  buildingId: number | null;
  price: string | number | null;
  status: string;
  kind?: string;
  builder?: { name: string } | null;
  apartment: null | {
    floor: number | null;
    floorsTotal: number | null;
    areaTotal: string | number | null;
    areaKitchen: string | number | null;
    planUrl: string | null;
    finishingPhotoUrl?: string | null;
    extraPhotoUrls?: unknown;
    roomType: { name: string } | null;
    finishing: { name: string } | null;
    buildingDeadline?: string | null;
    buildingName?: string | null;
    buildingQueue?: string | null;
  };
};

function num(v: unknown): number {
  if (v == null) return 0;
  if (typeof v === 'number') return v;
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function coordsFromBlock(b: ApiBlockListRow): [number, number] {
  const lat = num(b.latitude);
  const lng = num(b.longitude);
  if (lat && lng) return [lat, lng];
  return [55.75, 37.62];
}

function statusFromApi(s: string): ResidentialComplex['status'] {
  if (s === 'COMPLETED') return 'completed';
  if (s === 'PROJECT') return 'planned';
  return 'building';
}

function deadlineLabel(_b: ApiBlockListRow): string {
  return '—';
}

function quarterLabel(value: string | Date | null | undefined): string | null {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return `${d.getFullYear()} Q${Math.ceil((d.getMonth() + 1) / 3)}`;
}

/** Плоский список ЖК (каталог, автодополнение). */
export function mapApiBlockListRowToResidentialComplex(b: ApiBlockListRow): ResidentialComplex {
  const addr = b.addresses?.[0]?.address ?? '';
  const metro = b.subways?.[0];
  const imgs = (b.images?.length ? b.images.map((i) => i.url) : [PLACEHOLDER]).slice(0, 6);
  const rawMin = b.listingPriceMin != null ? Math.round(b.listingPriceMin) : 0;
  const rawMax = b.listingPriceMax != null ? Math.round(b.listingPriceMax) : rawMin;
  // Отсекаем «мусор» вида 0..999 ₽ — карточка покажет «—».
  const priceMin = rawMin >= MIN_REASONABLE_PRICE_RUB ? rawMin : 0;
  const priceMax = rawMax >= MIN_REASONABLE_PRICE_RUB ? rawMax : priceMin;

  return {
    id: String(b.id),
    slug: b.slug,
    name: b.name,
    description: b.description?.trim() || 'Описание появится позже.',
    builder: b.builder?.name ?? '—',
    district: b.district?.name ?? '—',
    subway: metro?.subway.name ?? '—',
    subwayDistance: metro?.distanceTime != null ? `${metro.distanceTime} мин` : '—',
    address: addr || '—',
    deadline: deadlineLabel(b),
    status: statusFromApi(b.status),
    priceFrom: priceMin,
    priceTo: priceMax || priceMin,
    images: imgs,
    coords: coordsFromBlock(b),
    advantages: [],
    infrastructure: extractInfrastructureLabels(b.infrastructure),
    buildings: [],
    listingCount: b._count?.listings,
  };
}

function extractInfrastructureLabels(raw: unknown): string[] {
  if (raw == null) return [];
  if (!Array.isArray(raw)) return [];
  const out: string[] = [];
  for (const item of raw) {
    if (typeof item === 'string') {
      const t = item.trim();
      if (t) out.push(t);
    } else if (item && typeof item === 'object') {
      const obj = item as Record<string, unknown>;
      const name = typeof obj.name === 'string' ? obj.name.trim() : '';
      const distance =
        typeof obj.distance === 'number' || typeof obj.distance === 'string'
          ? String(obj.distance)
          : '';
      if (name) {
        out.push(distance ? `${name} · ${distance}` : name);
      }
    }
  }
  return out;
}

function mapFinishing(name: string | undefined): Apartment['finishing'] {
  const n = (name ?? '').toLowerCase();
  if (n.includes('чернов')) return 'черновая';
  if (n.includes('чистов') || n.includes('white box')) return 'чистовая';
  if (n.includes('под ключ') || n.includes('whitebox')) return 'под ключ';
  if (n.includes('без отделк')) return 'без отделки';
  return 'чистовая';
}

function roomsFromRoomTypeName(name: string | undefined): number {
  const n = (name ?? '').toLowerCase();
  if (n.includes('студ')) return 0;
  const m = n.match(/(\d)/);
  if (m) {
    const r = parseInt(m[1], 10);
    return r > 4 ? 4 : r;
  }
  return 1;
}

function listingStatus(s: string): Apartment['status'] {
  if (s === 'RESERVED') return 'reserved';
  if (s === 'SOLD') return 'sold';
  return 'available';
}

export function mapListingRowToApartment(
  listing: ApiListingRow,
  complexId: string,
  defaultBuildingId: string,
): Apartment | null {
  const apt = listing.apartment;
  if (!apt) return null;
  const area = num(apt.areaTotal);
  const price = num(listing.price);
  if (area <= 0) return null;
  // Отбрасываем мусорные цены (<100 000 ₽), но саму квартиру оставляем для шахматки.
  const safePrice = price >= MIN_REASONABLE_PRICE_RUB ? price : 0;
  const kitchen = num(apt.areaKitchen);
  const floor = apt.floor ?? 1;
  const totalFloors = apt.floorsTotal ?? 1;
  const gallery =
    Array.isArray(apt.extraPhotoUrls) && apt.extraPhotoUrls.length
      ? apt.extraPhotoUrls.filter((x): x is string => typeof x === 'string')
      : undefined;
  const finishingImg =
    typeof apt.finishingPhotoUrl === 'string' && apt.finishingPhotoUrl.trim()
      ? apt.finishingPhotoUrl
      : undefined;
  return {
    id: String(listing.id),
    complexId,
    buildingId: listing.buildingId != null ? String(listing.buildingId) : defaultBuildingId,
    rooms: roomsFromRoomTypeName(apt.roomType?.name),
    area,
    kitchenArea: kitchen > 0 ? kitchen : Math.round(area * 0.15 * 10) / 10,
    floor,
    totalFloors: totalFloors > 0 ? totalFloors : 1,
    price: safePrice,
    pricePerMeter: safePrice > 0 ? Math.round(safePrice / area) : 0,
    finishing: mapFinishing(apt.finishing?.name),
    status: listingStatus(listing.status),
    planImage: apt.planUrl || PLACEHOLDER,
    finishingImage: finishingImg,
    galleryImages: gallery,
    section: 1,
  };
}

export function buildLayoutGroupsFromApartments(complexId: string, apartments: Apartment[]): LayoutGroup[] {
  const map = new Map<string, LayoutGroup>();
  for (const a of apartments) {
    // Считаем «в продаже» = свободные + забронированные. Так совпадает со списком
    // квартир (где исключены только проданные) и убирает рассинхрон 128 vs 124.
    if (a.status === 'sold') continue;
    const key = `${a.rooms}-${a.planImage || 'no-plan'}`;
    if (!map.has(key)) {
      map.set(key, {
        id: key,
        complexId,
        rooms: a.rooms,
        area: a.area,
        priceFrom: a.price,
        planImage: a.planImage,
        availableCount: 0,
      });
    }
    const g = map.get(key)!;
    g.availableCount++;
    if (a.price > 0 && (g.priceFrom <= 0 || a.price < g.priceFrom)) {
      g.priceFrom = a.price;
    }
  }
  return Array.from(map.values()).sort((x, y) => x.rooms - y.rooms || x.area - y.area);
}

/** Карточка ЖК из ответа GET /blocks/:id|slug + опционально квартиры из GET /listings. */
export function mapApiBlockDetailToResidentialComplex(
  b: ApiBlockDetail,
  listingRows: ApiListingRow[],
): ResidentialComplex {
  const base = mapApiBlockListRowToResidentialComplex(b);
  const imgs = (b.images?.length ? b.images.map((i) => i.url) : base.images).slice(0, 12);
  const virtualId = `${b.id}-main`;

  const rawBuildings = b.buildings?.length ? b.buildings : null;

  const buildingShells: Building[] = rawBuildings
    ? rawBuildings.map((raw, idx) => {
        const id = String(raw.id);
        const aptsForB = listingRows
          .filter((l) => (l.buildingId != null ? String(l.buildingId) === id : idx === 0))
          .map((l) => mapListingRowToApartment(l, String(b.id), id))
          .filter((x): x is Apartment => x != null);
        const maxFloor = aptsForB.reduce((m, a) => Math.max(m, a.floor), 0);
        return {
          id,
          complexId: String(b.id),
          name: raw.name || raw.queue || `Корпус ${idx + 1}`,
          floors: maxFloor > 0 ? maxFloor : 25,
          sections: 1,
          deadline: raw.deadline
            ? (() => {
                const d = new Date(raw.deadline);
                return Number.isNaN(d.getTime()) ? '—' : `${d.getFullYear()} Q${Math.ceil((d.getMonth() + 1) / 3)}`;
              })()
            : base.deadline,
          apartments: aptsForB,
        };
      })
    : [
        {
          id: virtualId,
          complexId: String(b.id),
          name: 'Корпус 1',
          floors: 25,
          sections: 1,
          deadline: base.deadline,
          apartments: listingRows
            .map((l) => mapListingRowToApartment(l, String(b.id), virtualId))
            .filter((x): x is Apartment => x != null),
        },
      ];

  const allApts = buildingShells.flatMap((x) => x.apartments);
  // Цены берём только у свободных и забронированных, и только с валидной (>0) ценой,
  // чтобы «от …» не схлопывалась в 0 из-за мусора в фиде.
  const inSalePrices = allApts
    .filter((a) => a.status !== 'sold' && a.price > 0)
    .map((a) => a.price);
  const priceFrom = inSalePrices.length ? Math.min(...inSalePrices) : base.priceFrom;
  const priceTo = inSalePrices.length ? Math.max(...inSalePrices) : base.priceTo;
  // «В продаже» = свободные + забронированные. Так совпадает с layouts и с табом квартир.
  const inSaleFromLoaded = allApts.filter((a) => a.status !== 'sold').length;
  const listingCount =
    inSaleFromLoaded > 0 ? inSaleFromLoaded : (base.listingCount ?? 0);
  const quarterDates = [
    ...(b.buildings ?? []).map((x) => quarterLabel(x.deadline)).filter((x): x is string => Boolean(x)),
    ...listingRows
      .map((x) => quarterLabel(x.apartment?.buildingDeadline ?? null))
      .filter((x): x is string => Boolean(x)),
  ];
  const uniqueQuarters = Array.from(new Set(quarterDates));
  const deadline =
    uniqueQuarters.length === 0
      ? base.deadline
      : uniqueQuarters.length === 1
        ? uniqueQuarters[0]
        : `${uniqueQuarters[0]} — ${uniqueQuarters[uniqueQuarters.length - 1]}`;
  const fallbackBuilder =
    listingRows
      .map((x) => x.builder?.name?.trim() ?? '')
      .find((name) => name.length > 0) ?? null;
  const builder = base.builder === '—' && fallbackBuilder ? fallbackBuilder : base.builder;

  return {
    ...base,
    images: imgs.length ? imgs : base.images,
    builder,
    deadline,
    buildings: buildingShells,
    priceFrom: priceFrom || base.priceFrom,
    priceTo: priceTo || base.priceTo || priceFrom,
    listingCount,
  };
}
