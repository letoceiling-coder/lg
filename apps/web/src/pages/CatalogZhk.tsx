import { useState } from 'react';
import { MapPin, ChevronDown, Search, SlidersHorizontal } from 'lucide-react';
import Header from '@/components/Header';
import ZhkCard, { type ZhkData } from '@/components/ZhkCard';
import PropertyGridSection from '@/components/PropertyGridSection';
import AboutPlatform from '@/components/AboutPlatform';
import AdditionalFeatures from '@/components/AdditionalFeatures';
import LatestNews from '@/components/LatestNews';
import ContactsSection from '@/components/ContactsSection';
import FooterSection from '@/components/FooterSection';
import complex1 from '@/assets/complex-1.jpg';
import complex2 from '@/assets/complex-2.jpg';
import complex3 from '@/assets/complex-3.jpg';
import complex4 from '@/assets/complex-4.jpg';

const allZhk: ZhkData[] = [
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
    name: 'ЖК Парк Сити', price: 'от 7.1 млн', unitsCount: 'В продаже 340 квартир',
    badges: [],
    apartments: [{ type: '1-комнатная', area: 'от 38 м.кв.', price: 'от 7.1 млн' }],
  },
  {
    images: [complex2, complex4, complex1],
    name: 'ЖК Высота', price: 'от 12.3 млн', unitsCount: 'В продаже 180 квартир',
    badges: [],
    apartments: [{ type: '2-комнатная', area: 'от 68 м.кв.', price: 'от 12.3 млн' }],
  },
  {
    images: [complex3, complex1, complex2],
    name: 'ЖК Дубровка', price: 'от 4.2 млн', unitsCount: 'В продаже 520 квартир',
    badges: [],
    apartments: [{ type: 'Студия', area: 'от 22 м.кв.', price: 'от 4.2 млн' }],
  },
  {
    images: [complex4, complex2, complex3],
    name: 'ЖК Лесной', price: 'от 9.5 млн', unitsCount: 'В продаже 95 квартир',
    badges: [],
    apartments: [{ type: '2-комнатная', area: 'от 54 м.кв.', price: 'от 9.5 млн' }],
  },
  {
    images: [complex1, complex4, complex2],
    name: 'ЖК Снегири', price: 'от 5.6 млн', unitsCount: 'В продаже 226 квартир',
    badges: ['Рассрочка 1 год'],
    apartments: [
      { type: 'Студия', area: 'от 24 м.кв.', price: 'от 5.6 млн' },
      { type: '1-комнатная', area: 'от 32 м.кв.', price: 'от 7.2 млн' },
    ],
  },
  {
    images: [complex2, complex3, complex1],
    name: 'КП Черкизово', price: 'от 16.6 млн', unitsCount: 'В продаже 56 коттеджей',
    badges: ['ТОП продаж'],
    apartments: [{ type: 'Коттедж', area: 'от 120 м.кв.', price: 'от 16.6 млн' }],
  },
  {
    images: [complex3, complex4, complex1],
    name: 'ЖК Смородина', price: 'от 3.8 млн', unitsCount: 'В продаже 795 квартир',
    badges: ['Эконом+'],
    apartments: [{ type: 'Студия', area: 'от 20 м.кв.', price: 'от 3.8 млн' }],
  },
  {
    images: [complex4, complex1, complex3],
    name: 'Таунхаусы в центре', price: 'от 32.8 млн', unitsCount: 'В продаже 22 таунхауса',
    badges: [],
    apartments: [{ type: 'Таунхаус', area: 'от 150 м.кв.', price: 'от 32.8 млн' }],
  },
];

const filterCategories = ['Тд недвижимости', 'Цена', 'Площадь', 'Срок сдачи'];

const ITEMS_PER_PAGE_OPTIONS = [50, 80, 100];

const CatalogZhkPage = () => {
  const [currentPage, setCurrentPage] = useState(1);
  const [perPage, setPerPage] = useState(50);
  const totalPages = 5;
  const totalItems = 1784;

  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* Page title + location */}
      <section className="py-6">
        <div className="max-w-[1400px] mx-auto px-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <h1 className="text-2xl md:text-3xl font-bold">
              Каталог объектов в{' '}
              <button className="text-primary inline-flex items-center gap-1 underline decoration-primary underline-offset-4">
                Москве <ChevronDown className="w-5 h-5" />
              </button>
            </h1>
            <div className="flex items-center gap-3">
              <button className="flex items-center gap-2 px-4 py-2 rounded-full border border-border text-sm hover:bg-secondary transition-colors">
                <MapPin className="w-4 h-4" /> На карте
              </button>
              <button className="px-4 py-2 rounded-full border border-border text-sm hover:bg-secondary transition-colors">
                Все предложения
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Filters bar */}
      <section className="pb-6">
        <div className="max-w-[1400px] mx-auto px-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            {filterCategories.map((f, i) => (
              <button
                key={i}
                className="flex items-center justify-between gap-2 px-4 py-2.5 rounded-full border border-border text-sm hover:bg-secondary transition-colors min-w-[140px]"
              >
                <span className="text-muted-foreground">{f}</span>
                <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
              </button>
            ))}
            <button className="flex items-center gap-2 px-4 py-2.5 rounded-full border border-border text-sm hover:bg-secondary transition-colors">
              <SlidersHorizontal className="w-4 h-4" /> Фильтры
            </button>
            <button className="bg-primary text-primary-foreground px-6 py-2.5 rounded-full text-sm font-medium whitespace-nowrap">
              <Search className="w-4 h-4 inline mr-1.5" />
              Найти 1 563 объекта
            </button>
          </div>
        </div>
      </section>

      {/* ZhK Grid */}
      <section className="pb-8">
        <div className="max-w-[1400px] mx-auto px-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {allZhk.map((zhk, i) => (
              <ZhkCard key={i} data={zhk} />
            ))}
          </div>
        </div>
      </section>

      {/* Pagination */}
      <section className="pb-10">
        <div className="max-w-[1400px] mx-auto px-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            {/* Page numbers */}
            <div className="flex items-center gap-2">
              {[1, 2, 3, 4, 5].map(p => (
                <button
                  key={p}
                  onClick={() => setCurrentPage(p)}
                  className={`w-9 h-9 rounded-lg text-sm font-medium transition-colors ${
                    p === currentPage
                      ? 'bg-primary text-primary-foreground'
                      : 'border border-border hover:bg-secondary'
                  }`}
                >
                  {p}
                </button>
              ))}
              <button className="px-4 py-2 rounded-full bg-primary text-primary-foreground text-sm font-medium ml-2">
                Следующая →
              </button>
            </div>

            {/* Per page */}
            <div className="flex items-center gap-2">
              {ITEMS_PER_PAGE_OPTIONS.map(n => (
                <button
                  key={n}
                  onClick={() => setPerPage(n)}
                  className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                    n === perPage
                      ? 'bg-primary text-primary-foreground'
                      : 'border border-border hover:bg-secondary'
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          <p className="text-xs text-muted-foreground mt-3">
            Показано {allZhk.length} объектов из {totalItems} в Москве и области
          </p>
        </div>
      </section>

      {/* Start Sales */}
      <PropertyGridSection title="Старт продаж" type="start" />

      {/* About Platform */}
      <AboutPlatform />

      {/* Additional Features */}
      <AdditionalFeatures />

      {/* Latest News */}
      <LatestNews />

      {/* Contacts */}
      <ContactsSection />

      {/* Footer */}
      <FooterSection />
    </div>
  );
};

export default CatalogZhkPage;
