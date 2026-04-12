export interface ResidentialComplex {
  id: string;
  slug: string;
  name: string;
  description: string;
  builder: string;
  district: string;
  subway: string;
  subwayDistance: string;
  address: string;
  deadline: string;
  status: 'building' | 'completed' | 'planned';
  priceFrom: number;
  priceTo: number;
  images: string[];
  coords: [number, number];
  advantages: string[];
  infrastructure: string[];
  buildings: Building[];
  /** Если задано (данные с API), в карточке показываем число объявлений вместо разбора mock-квартир по корпусам. */
  listingCount?: number;
}

export interface Building {
  id: string;
  complexId: string;
  name: string;
  floors: number;
  sections: number;
  deadline: string;
  apartments: Apartment[];
}

export interface Apartment {
  id: string;
  complexId: string;
  buildingId: string;
  rooms: number;
  area: number;
  kitchenArea: number;
  floor: number;
  totalFloors: number;
  price: number;
  pricePerMeter: number;
  finishing: 'без отделки' | 'черновая' | 'чистовая' | 'под ключ';
  status: 'available' | 'reserved' | 'sold';
  planImage: string;
  /** Фото отделки (URL из медиатеки или внешний). */
  finishingImage?: string;
  /** Доп. фото (вид из окна и т.д.). */
  galleryImages?: string[];
  section: number;
}

export interface LayoutGroup {
  id: string;
  complexId: string;
  rooms: number;
  area: number;
  priceFrom: number;
  planImage: string;
  availableCount: number;
}

export type SortField = 'price' | 'area' | 'floor' | 'rooms';
export type SortDir = 'asc' | 'desc';

export type ObjectType = 'apartments' | 'houses' | 'land' | 'commercial';
export type MarketType = 'all' | 'new' | 'secondary';

export interface CatalogFilters {
  objectType: ObjectType;
  marketType: MarketType;
  priceMin?: number;
  priceMax?: number;
  rooms: number[];
  areaMin?: number;
  areaMax?: number;
  district: string[];
  subway: string[];
  builder: string[];
  finishing: string[];
  deadline: string[];
  floorMin?: number;
  floorMax?: number;
  status: string[];
  search: string;
}

export const defaultFilters: CatalogFilters = {
  objectType: 'apartments',
  marketType: 'all',
  rooms: [],
  district: [],
  subway: [],
  builder: [],
  finishing: [],
  deadline: [],
  status: [],
  search: '',
};
