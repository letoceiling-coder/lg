import complex1 from '@/assets/complex-1.jpg';
import complex2 from '@/assets/complex-2.jpg';
import complex3 from '@/assets/complex-3.jpg';
import complex4 from '@/assets/complex-4.jpg';

const images = [complex1, complex2, complex3, complex4];

export interface MockApartment {
  id: string;
  complexName: string;
  complexSlug: string;
  rooms: number | 'studio';
  area: number;
  floor: number;
  totalFloors: number;
  price: number;
  priceLabel: string;
  finishing: string;
  deadline: string;
  address: string;
  district: string;
  subway: string;
  image: string;
}

export interface MockHouse {
  id: string;
  title: string;
  houseArea: number;
  landArea: number;
  price: number;
  priceLabel: string;
  material: string;
  address: string;
  district: string;
  image: string;
  status: 'building' | 'completed' | 'planned';
}

export interface MockLand {
  id: string;
  title: string;
  area: number;
  purpose: string;
  price: number;
  priceLabel: string;
  address: string;
  district: string;
  image: string;
}

export interface MockCommercial {
  id: string;
  title: string;
  area: number;
  type: string;
  price: number;
  priceLabel: string;
  address: string;
  district: string;
  image: string;
}

function fmt(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace('.0', '')} млн ₽`;
  return `${(n / 1000).toFixed(0)} тыс ₽`;
}

const roomLabels: Record<number | string, string> = { studio: 'Студия', 1: '1-комн.', 2: '2-комн.', 3: '3-комн.', 4: '4-комн.' };
const finishings = ['без отделки', 'черновая', 'чистовая', 'под ключ'];
const deadlines = ['2025 Q4', '2026 Q1', '2026 Q3', '2027 Q1', 'Сдан'];
const districts = ['Южное Бутово', 'Хорошёво-Мнёвники', 'Люблино', 'Пресненский', 'Коммунарка', 'Левобережный'];
const subways = ['Бунинская аллея', 'Хорошёвская', 'Люблино', 'Деловой центр', 'Коммунарка', 'Ховрино'];
const complexNames = ['Зелёный Квартал', 'Новые Берега', 'Городской Парк', 'Crystal Towers', 'Усадьба Покровское', 'Северная Долина'];
const complexSlugs = ['zelenyj-kvartal', 'novye-berega', 'gorodskoy-park', 'crystal-towers', 'usadba-pokrovskoe', 'severnaya-dolina'];

export const mockApartments: MockApartment[] = Array.from({ length: 24 }, (_, i) => {
  const rooms = i % 5 === 0 ? ('studio' as const) : ((i % 4) + 1);
  const area = rooms === 'studio' ? 22 + Math.round(Math.random() * 8) : 30 + (typeof rooms === 'number' ? rooms : 0) * 12 + Math.round(Math.random() * 10);
  const price = Math.round(area * (180000 + Math.random() * 120000) / 1000) * 1000;
  return {
    id: `apt-${i + 1}`,
    complexName: complexNames[i % 6],
    complexSlug: complexSlugs[i % 6],
    rooms,
    area,
    floor: 2 + (i % 20),
    totalFloors: 12 + (i % 13),
    price,
    priceLabel: fmt(price),
    finishing: finishings[i % 4],
    deadline: deadlines[i % 5],
    address: `ул. ${['Южная', 'Набережная', 'Люблинская', 'Пресненская', 'Покровская', 'Дмитровское'][i % 6]}, ${i + 1}`,
    district: districts[i % 6],
    subway: subways[i % 6],
    image: images[i % 4],
  };
});

const houseMaterials = ['Кирпич', 'Газобетон', 'Каркас', 'Брус', 'СИП-панели'];
export const mockHouses: MockHouse[] = Array.from({ length: 20 }, (_, i) => {
  const houseArea = 80 + i * 15 + Math.round(Math.random() * 40);
  const landArea = 4 + Math.round(Math.random() * 12);
  const price = Math.round(houseArea * (60000 + Math.random() * 40000) / 1000) * 1000;
  return {
    id: `house-${i + 1}`,
    title: `${['Коттедж', 'Таунхаус', 'Дуплекс', 'Дом'][i % 4]} в ${['Новой Москве', 'Подмосковье', 'КП Лесной', 'КП Речной'][i % 4]}`,
    houseArea,
    landArea,
    price,
    priceLabel: fmt(price),
    material: houseMaterials[i % 5],
    address: `${['пос. Коммунарка', 'д. Черкизово', 'пос. Горки', 'КП Лесной'][i % 4]}`,
    district: districts[i % 6],
    image: images[i % 4],
    status: (['building', 'completed', 'planned'] as const)[i % 3],
  };
});

const purposes = ['ИЖС', 'СНТ', 'Коммерция', 'ЛПХ'];
export const mockLand: MockLand[] = Array.from({ length: 20 }, (_, i) => {
  const area = 4 + Math.round(Math.random() * 20);
  const price = Math.round(area * (200000 + Math.random() * 300000) / 1000) * 1000;
  return {
    id: `land-${i + 1}`,
    title: `Участок ${area} сот. ${purposes[i % 4]}`,
    area,
    purpose: purposes[i % 4],
    price,
    priceLabel: fmt(price),
    address: `${['Белгородский р-н', 'Новая Москва', 'Подмосковье', 'Ленобласть'][i % 4]}`,
    district: districts[i % 6],
    image: images[i % 4],
  };
});

const commercialTypes = ['Офис', 'Склад', 'Торговое', 'Свободного назначения'];
export const mockCommercial: MockCommercial[] = Array.from({ length: 20 }, (_, i) => {
  const area = 30 + Math.round(Math.random() * 200);
  const price = Math.round(area * (80000 + Math.random() * 120000) / 1000) * 1000;
  return {
    id: `comm-${i + 1}`,
    title: `${commercialTypes[i % 4]} ${area} м²`,
    area,
    type: commercialTypes[i % 4],
    price,
    priceLabel: fmt(price),
    address: `${['ул. Центральная', 'пр. Ленина', 'ул. Промышленная', 'Бизнес-парк'][i % 4]}, ${i + 1}`,
    district: districts[i % 6],
    image: images[i % 4],
  };
});
