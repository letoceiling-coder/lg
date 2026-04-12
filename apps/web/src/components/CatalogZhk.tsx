import { MapPin, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import ZhkCard, { type ZhkData } from './ZhkCard';
import complex1 from '@/assets/complex-1.jpg';
import complex2 from '@/assets/complex-2.jpg';
import complex3 from '@/assets/complex-3.jpg';
import complex4 from '@/assets/complex-4.jpg';

const zhkList: ZhkData[] = [
  {
    images: [complex1, complex2, complex3],
    name: 'ЖК Снегири', price: 'от 5.6 млн', unitsCount: 'В продаже 226 квартир',
    badges: ['Рассрочка 1 год', 'Ипотека 6%'],
    apartments: [
      { type: 'Студия', area: 'от 24 м.кв.', price: 'от 5.6 млн' },
      { type: '1-комнатная', area: 'от 32 м.кв.', price: 'от 7.2 млн' },
      { type: '2-комнатная', area: 'от 52 м.кв.', price: 'от 10.5 млн' },
      { type: '3-комнатная', area: 'от 79 м.кв.', price: 'от 14.2 млн' },
    ],
  },
  {
    images: [complex2, complex1, complex4],
    name: 'КП Черкизово', price: 'от 16.6 млн', unitsCount: 'В продаже 56 коттеджей',
    badges: ['ТОП продаж', 'С ремонтом'],
    apartments: [
      { type: 'Коттедж', area: 'от 120 м.кв.', price: 'от 16.6 млн' },
      { type: 'Таунхаус', area: 'от 90 м.кв.', price: 'от 12.1 млн' },
    ],
  },
  {
    images: [complex3, complex2, complex1],
    name: 'ЖК Смородина', price: 'от 3.8 млн', unitsCount: 'В продаже 795 квартир',
    badges: ['Эконом+', 'Ипотека 6%'],
    apartments: [
      { type: 'Студия', area: 'от 20 м.кв.', price: 'от 3.8 млн' },
      { type: '1-комнатная', area: 'от 30 м.кв.', price: 'от 5.4 млн' },
      { type: '2-комнатная', area: 'от 48 м.кв.', price: 'от 8.1 млн' },
    ],
  },
  {
    images: [complex4, complex3, complex2],
    name: 'Таунхаусы в центре', price: 'от 32.8 млн', unitsCount: 'В продаже 22 таунхауса',
    badges: ['Рассрочка 1 год', 'Инвестиция'],
    apartments: [
      { type: 'Таунхаус', area: 'от 150 м.кв.', price: 'от 32.8 млн' },
    ],
  },
  {
    images: [complex1, complex3, complex4],
    name: 'КП Черкизово', price: 'от 16.6 млн', unitsCount: 'В продаже 56 коттеджей',
    badges: [],
    apartments: [{ type: 'Коттедж', area: 'от 120 м.кв.', price: 'от 16.6 млн' }],
  },
  {
    images: [complex2, complex4, complex1],
    name: 'КП Черкизово', price: 'от 16.6 млн', unitsCount: 'В продаже 56 коттеджей',
    badges: [],
    apartments: [{ type: 'Коттедж', area: 'от 120 м.кв.', price: 'от 16.6 млн' }],
  },
  {
    images: [complex3, complex1, complex2],
    name: 'ЖК Смородина', price: 'от 3.8 млн', unitsCount: 'В продаже 795 квартир',
    badges: [],
    apartments: [{ type: 'Студия', area: 'от 20 м.кв.', price: 'от 3.8 млн' }],
  },
  {
    images: [complex4, complex2, complex3],
    name: 'Таунхаусы в центре', price: 'от 32.8 млн', unitsCount: 'В продаже 22 таунхауса',
    badges: [],
    apartments: [{ type: 'Таунхаус', area: 'от 150 м.кв.', price: 'от 32.8 млн' }],
  },
];

const CatalogZhk = () => (
  <section className="py-8 sm:py-12">
    <div className="max-w-[1400px] mx-auto px-4">
      <div className="flex items-center justify-between mb-4 sm:mb-6">
        <h2 className="text-base sm:text-xl font-bold">Каталог ЖК</h2>
        <div className="hidden sm:flex items-center gap-2">
          <Link
            to="/catalog?view=map"
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-full border border-border text-xs sm:text-sm font-medium hover:bg-secondary transition-colors"
          >
            <MapPin className="w-3.5 h-3.5" /> На карте
          </Link>
          <Link
            to="/catalog"
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-full border border-border text-xs sm:text-sm font-medium hover:bg-secondary transition-colors"
          >
            Все ЖК
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {zhkList.map((zhk, i) => (
          <ZhkCard key={i} data={zhk} />
        ))}
      </div>
      <Link
        to="/catalog"
        className="flex sm:hidden items-center justify-center gap-1.5 mt-3 py-2 rounded-xl border border-border text-xs font-medium hover:bg-secondary transition-colors"
      >
        Все ЖК
        <ArrowRight className="w-3.5 h-3.5" />
      </Link>
    </div>
  </section>
);

export default CatalogZhk;
