import PropertyCard, { type PropertyData } from './PropertyCard';
import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import complex1 from '@/assets/complex-1.jpg';
import complex2 from '@/assets/complex-2.jpg';
import complex3 from '@/assets/complex-3.jpg';
import complex4 from '@/assets/complex-4.jpg';

const properties: PropertyData[] = [
  { image: complex1, title: 'ЖК Снегири', price: 'от 5.6 млн', address: 'Москва, ул. Снежная 12', area: '24 м²', rooms: 'Студия', badges: ['Рассрочка 1 год'] },
  { image: complex2, title: 'КП Черкизово', price: 'от 16.6 млн', address: 'МО, д. Черкизово', area: '120 м²', rooms: '3 комн.', badges: ['ТОП продаж'] },
  { image: complex3, title: 'ЖК Смородина', price: 'от 3.8 млн', address: 'Москва, ул. Ягодная 5', area: '32 м²', rooms: '1 комн.', badges: ['Эконом+'] },
  { image: complex4, title: 'Таунхаусы в центре', price: 'от 32.8 млн', address: 'Москва, Центральный р-н', area: '180 м²', rooms: '4 комн.', badges: ['Инвестиция'] },
  { image: complex3, title: 'ЖК Дубровка', price: 'от 4.2 млн', address: 'Москва, ул. Дубровская 8', area: '28 м²', rooms: 'Студия' },
  { image: complex1, title: 'ЖК Парк Сити', price: 'от 7.1 млн', address: 'Москва, Парковая 15', area: '45 м²', rooms: '1 комн.' },
  { image: complex2, title: 'ЖК Высота', price: 'от 12.3 млн', address: 'Москва, пр-т Мира 88', area: '68 м²', rooms: '2 комн.' },
  { image: complex4, title: 'ЖК Лесной', price: 'от 9.5 млн', address: 'МО, г. Мытищи', area: '54 м²', rooms: '2 комн.' },
];

const NewListings = () => (
  <section className="py-8 sm:py-12">
    <div className="max-w-[1400px] mx-auto px-4">
      <div className="flex items-center justify-between mb-4 sm:mb-6">
        <h2 className="text-base sm:text-xl font-bold">Новые объявления</h2>
        <Link
          to="/catalog"
          className="hidden sm:flex items-center gap-1.5 px-3.5 py-2 rounded-full border border-border text-xs sm:text-sm font-medium hover:bg-secondary transition-colors"
        >
          Все объявления
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {properties.map((p, i) => (
          <PropertyCard key={i} data={p} />
        ))}
      </div>
      <Link
        to="/catalog"
        className="flex sm:hidden items-center justify-center gap-1.5 mt-3 py-2 rounded-xl border border-border text-xs font-medium hover:bg-secondary transition-colors"
      >
        Все объявления
        <ArrowRight className="w-3.5 h-3.5" />
      </Link>
    </div>
  </section>
);

export default NewListings;
