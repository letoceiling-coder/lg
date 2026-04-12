import type { ResidentialComplex, Building, Apartment, LayoutGroup } from './types';

import complex1 from '@/assets/complex-1.jpg';
import complex2 from '@/assets/complex-2.jpg';
import complex3 from '@/assets/complex-3.jpg';
import complex4 from '@/assets/complex-4.jpg';

const planPlaceholder = '/placeholder.svg';
const buildingImages = [complex1, complex2, complex3, complex4];

function makeApartments(complexId: string, buildingId: string, floors: number, sections: number): Apartment[] {
  const apts: Apartment[] = [];
  const finishings: Apartment['finishing'][] = ['без отделки', 'черновая', 'чистовая', 'под ключ'];
  const statuses: Apartment['status'][] = ['available', 'available', 'available', 'reserved', 'sold'];
  let id = 0;
  for (let s = 1; s <= sections; s++) {
    for (let f = 1; f <= floors; f++) {
      const rooms = ((s + f) % 4) + 1;
      const area = 25 + rooms * 15 + Math.round(Math.random() * 10);
      const price = Math.round((area * (180000 + Math.random() * 120000)) / 1000) * 1000;
      apts.push({
        id: `${buildingId}-apt-${++id}`,
        complexId,
        buildingId,
        rooms: rooms > 4 ? 4 : rooms,
        area,
        kitchenArea: Math.round(6 + Math.random() * 8),
        floor: f,
        totalFloors: floors,
        price,
        pricePerMeter: Math.round(price / area),
        finishing: finishings[(s + f) % finishings.length],
        status: statuses[(s * f) % statuses.length],
        planImage: planPlaceholder,
        section: s,
      });
    }
  }
  return apts;
}

function makeBuildings(complexId: string, count: number): Building[] {
  return Array.from({ length: count }, (_, i) => {
    const floors = 12 + Math.round(Math.random() * 13);
    const sections = 2 + Math.round(Math.random() * 3);
    const bId = `${complexId}-b${i + 1}`;
    return {
      id: bId,
      complexId,
      name: `Корпус ${i + 1}`,
      floors,
      sections,
      deadline: ['2025 Q2', '2025 Q4', '2026 Q1', '2026 Q3'][i % 4],
      apartments: makeApartments(complexId, bId, floors, sections),
    };
  });
}

const complexesRaw: Omit<ResidentialComplex, 'buildings'>[] = [
  {
    id: 'c1', slug: 'zelenyj-kvartal', name: 'Зелёный Квартал', description: 'Современный жилой комплекс с развитой инфраструктурой и зелёными дворами. Расположен в экологически чистом районе с удобным выездом на основные магистрали. Продуманные планировки, высокие потолки и панорамное остекление.',
    builder: 'Группа ЛСР', district: 'Южное Бутово', subway: 'Бунинская аллея', subwayDistance: '7 мин', address: 'ул. Южная, 12',
    deadline: '2025 Q4', status: 'building', priceFrom: 6800000, priceTo: 18500000,
    images: [buildingImages[0], buildingImages[1], buildingImages[2]],
    coords: [55.5437, 37.5165],
    advantages: ['Зелёные дворы', 'Детские площадки', 'Подземный паркинг', 'Консьерж', 'Видеонаблюдение'],
    infrastructure: ['Школа №1234 — 500м', 'Поликлиника — 300м', 'ТЦ «Южный» — 1км', 'Парк «Зелёная роща» — 200м', 'Детский сад — 150м', 'Фитнес-центр — 400м'],
  },
  {
    id: 'c2', slug: 'novye-berega', name: 'Новые Берега', description: 'Премиальный жилой комплекс на набережной с видом на реку. Авторская архитектура и продуманные планировки для комфортной жизни. Закрытая территория с ландшафтным дизайном.',
    builder: 'ПИК', district: 'Хорошёво-Мнёвники', subway: 'Хорошёвская', subwayDistance: '5 мин', address: 'наб. Тараса Шевченко, 1',
    deadline: '2026 Q1', status: 'building', priceFrom: 9200000, priceTo: 32000000,
    images: [buildingImages[1], buildingImages[2], buildingImages[3]],
    coords: [55.7720, 37.4660],
    advantages: ['Набережная', 'Фитнес-центр', 'SPA', 'Ресторан на крыше', 'Консьерж-сервис'],
    infrastructure: ['Метро — 5 мин пешком', 'Набережная Москвы-реки', 'Парк Ходынское поле — 10 мин', 'Школа — 300м', 'Поликлиника — 500м'],
  },
  {
    id: 'c3', slug: 'gorodskoy-park', name: 'Городской Парк', description: 'Комфорт-класс рядом с крупным парком. Идеальный баланс цены и качества с современной отделкой квартир. Собственная социальная инфраструктура.',
    builder: 'Самолёт', district: 'Люблино', subway: 'Люблино', subwayDistance: '10 мин', address: 'Люблинская ул., 72',
    deadline: '2025 Q2', status: 'completed', priceFrom: 5400000, priceTo: 14900000,
    images: [buildingImages[2], buildingImages[0], buildingImages[3]],
    coords: [55.6768, 37.7613],
    advantages: ['Рядом парк', 'Своя школа', 'Коммерция на 1 этаже', 'Закрытый двор'],
    infrastructure: ['Парк — 100м', 'Школа в ЖК', 'Магазины на 1 этаже', 'Поликлиника — 400м', 'Детский сад — 200м'],
  },
  {
    id: 'c4', slug: 'crystal-towers', name: 'Crystal Towers', description: 'Бизнес-класс в центре Москвы. Панорамное остекление, высокие потолки 3.2м и премиальные материалы отделки. Умный дом и видовые квартиры.',
    builder: 'Capital Group', district: 'Пресненский', subway: 'Деловой центр', subwayDistance: '3 мин', address: 'Пресненская наб., 8',
    deadline: '2026 Q3', status: 'building', priceFrom: 15000000, priceTo: 65000000,
    images: [buildingImages[3], buildingImages[1], buildingImages[0]],
    coords: [55.7490, 37.5394],
    advantages: ['Панорамное остекление', 'Потолки 3.2м', 'Smart Home', 'Видовые квартиры', 'Премиальная отделка'],
    infrastructure: ['Москва-Сити', 'ТЦ «Афимолл» — 200м', 'Набережная Москвы-реки', 'Деловой центр', 'Рестораны'],
  },
  {
    id: 'c5', slug: 'usadba-pokrovskoe', name: 'Усадьба Покровское', description: 'Уютный малоэтажный комплекс в историческом районе с ландшафтным дизайном и закрытой территорией. Собственный детский сад и школа.',
    builder: 'А101', district: 'Коммунарка', subway: 'Коммунарка', subwayDistance: '12 мин', address: 'пос. Коммунарка, ул. Покровская, 5',
    deadline: '2025 Q4', status: 'building', priceFrom: 4900000, priceTo: 11500000,
    images: [buildingImages[0], buildingImages[3], buildingImages[2]],
    coords: [55.5617, 37.4881],
    advantages: ['Малоэтажная застройка', 'Закрытый двор', 'Ландшафтный дизайн', 'Детская площадка'],
    infrastructure: ['Школа — 400м', 'Детсад в ЖК', 'Лесопарк — 300м', 'Магазины — 200м'],
  },
  {
    id: 'c6', slug: 'severnaya-dolina', name: 'Северная Долина', description: 'Масштабный проект комфорт-класса с собственной социальной инфраструктурой и транспортной доступностью. Торговая галерея и спортивный комплекс на территории.',
    builder: 'Донстрой', district: 'Левобережный', subway: 'Ховрино', subwayDistance: '8 мин', address: 'Дмитровское ш., 165',
    deadline: '2026 Q1', status: 'planned', priceFrom: 5900000, priceTo: 16000000,
    images: [buildingImages[1], buildingImages[0], buildingImages[3]],
    coords: [55.8654, 37.4963],
    advantages: ['Своя школа', 'Торговая галерея', 'Спортивный комплекс', 'Подземный паркинг'],
    infrastructure: ['Метро — 8 мин', 'ТЦ в ЖК', 'Химкинское водохранилище', 'Школа в ЖК', 'Поликлиника — 500м'],
  },
];

export const complexes: ResidentialComplex[] = complexesRaw.map((c, i) => ({
  ...c,
  buildings: makeBuildings(c.id, 2 + (i % 3)),
}));

export function getAllApartments(): Apartment[] {
  return complexes.flatMap(c => c.buildings.flatMap(b => b.apartments));
}

export function getComplexBySlug(slug: string): ResidentialComplex | undefined {
  return complexes.find(c => c.slug === slug);
}

export function getApartmentById(id: string): { apartment: Apartment; complex: ResidentialComplex; building: Building } | undefined {
  for (const c of complexes) {
    for (const b of c.buildings) {
      const a = b.apartments.find(a => a.id === id);
      if (a) return { apartment: a, complex: c, building: b };
    }
  }
  return undefined;
}

export function getLayoutGroups(complexId: string): LayoutGroup[] {
  const complex = complexes.find(c => c.id === complexId);
  if (!complex) return [];
  const map = new Map<string, LayoutGroup>();
  for (const b of complex.buildings) {
    for (const a of b.apartments) {
      if (a.status === 'sold') continue;
      const key = `${a.rooms}-${a.area}`;
      if (!map.has(key)) {
        map.set(key, { id: key, complexId, rooms: a.rooms, area: a.area, priceFrom: a.price, planImage: a.planImage, availableCount: 0 });
      }
      const g = map.get(key)!;
      g.availableCount++;
      if (a.price < g.priceFrom) g.priceFrom = a.price;
    }
  }
  return Array.from(map.values()).sort((a, b) => a.rooms - b.rooms || a.area - b.area);
}

export function searchComplexes(query: string): ResidentialComplex[] {
  if (!query.trim()) return [];
  const q = query.toLowerCase();
  return complexes.filter(c =>
    c.name.toLowerCase().includes(q) ||
    c.district.toLowerCase().includes(q) ||
    c.subway.toLowerCase().includes(q) ||
    c.builder.toLowerCase().includes(q)
  ).slice(0, 8);
}

export const districts = [...new Set(complexesRaw.map(c => c.district))];
export const subways = [...new Set(complexesRaw.map(c => c.subway))];
export const builders = [...new Set(complexesRaw.map(c => c.builder))];
export const deadlines = [...new Set(complexesRaw.map(c => c.deadline))];

export function formatPrice(n: number): string {
  if (!n || n <= 0) return '—';
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace('.0', '')} млн ₽`;
  return `${(n / 1000).toFixed(0)} тыс ₽`;
}
