import { useState, useMemo, lazy, Suspense } from 'react';
import { Search, ChevronDown } from 'lucide-react';
import Header from '@/components/Header';
import FooterSection from '@/components/FooterSection';
import PropertyGridSection from '@/components/PropertyGridSection';
import QuizSection from '@/components/QuizSection';
import AboutPlatform from '@/components/AboutPlatform';
import AdditionalFeatures from '@/components/AdditionalFeatures';
import LatestNews from '@/components/LatestNews';
import ContactsSection from '@/components/ContactsSection';
import ViewToggle, { type ViewMode } from '@/components/catalog/ViewToggle';
import CatalogGrid from '@/components/catalog/CatalogGrid';
import CatalogList from '@/components/catalog/CatalogList';
import CatalogFilters, { type FilterState } from '@/components/catalog/CatalogFilters';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
} from '@/components/ui/pagination';
import complex1 from '@/assets/complex-1.jpg';
import complex2 from '@/assets/complex-2.jpg';
import complex3 from '@/assets/complex-3.jpg';
import complex4 from '@/assets/complex-4.jpg';
import { cn } from '@/lib/utils';
import type { PropertyData } from '@/components/PropertyCard';

const CatalogMapView = lazy(() => import('@/components/catalog/CatalogMapView'));

/* ── mock properties ── */
const images = [complex1, complex2, complex3, complex4];

const moscowCoords: [number, number][] = [
  [55.76, 37.62], [55.74, 37.58], [55.78, 37.64], [55.72, 37.60],
];

const allProperties: PropertyData[] = Array.from({ length: 60 }, (_, i) => ({
  image: images[i % 4],
  title: ['ЖК Снегири', 'КП Черкизово', 'ЖК Смородина', 'Таунхаусы в центре'][i % 4],
  price: ['от 5.6 млн', 'от 16.6 млн', 'от 3.8 млн', 'от 32.8 млн'][i % 4],
  address: ['Москва, ул. Снежная 12', 'МО, д. Черкизово', 'Москва, ул. Ягодная 5', 'Москва, Центральный р-н'][i % 4],
  area: ['24 м²', '120 м²', '32 м²', '180 м²'][i % 4],
  rooms: ['Студия', '3 комн.', '1 комн.', '4 комн.'][i % 4],
  badges: i % 5 === 0 ? ['Старт продаж'] : i % 7 === 0 ? ['Ипотека'] : undefined,
  metro: ['Алексеевская · 5 мин', 'Бабушкинская · 10 мин', 'ВДНХ · 7 мин', 'Тверская · 3 мин'][i % 4],
  district: ['Алексеевский р-н', 'Лосиноостровский р-н', 'Останкинский р-н', 'ЦАО'][i % 4],
  buildingClass: ['Комфорт', 'Бизнес', 'Эконом', 'Премиум'][i % 4],
  deadline: ['2 кв. 2026', '4 кв. 2026', '1 кв. 2027', 'Сдан'][i % 4],
  mortgage: ['Ипотека от 4.5%', 'Рассрочка 0%', 'Ипотека от 6%', 'Субсидированная'][i % 4],
  coords: [
    moscowCoords[i % 4][0] + (Math.random() - 0.5) * 0.04,
    moscowCoords[i % 4][1] + (Math.random() - 0.5) * 0.06,
  ] as [number, number],
}));

const perPageOptions = [15, 30, 50, 100];
const tabs = ['Объекты', 'Избранное'];
const viewTabs = ['Квартиры', 'Паркинги', 'Участки', 'Дома', 'Коммерческая'];

const Catalog = () => {
  const [checked, setChecked] = useState<FilterState>({});
  const [currentPage, setCurrentPage] = useState(1);
  const [perPage, setPerPage] = useState(15);
  const [activeTab, setActiveTab] = useState(0);
  const [activeViewTab, setActiveViewTab] = useState(0);
  const [showFilters, setShowFilters] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');

  const toggle = (key: string) => setChecked(p => ({ ...p, [key]: !p[key] }));

  const totalPages = Math.ceil(allProperties.length / perPage);
  const paged = useMemo(
    () => allProperties.slice((currentPage - 1) * perPage, currentPage * perPage),
    [currentPage, perPage]
  );

  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* Top bar */}
      <div className="max-w-[1400px] mx-auto px-4 pt-6 pb-4">
        {/* Tabs */}
        <div className="flex items-center gap-4 mb-4">
          {tabs.map((t, i) => (
            <button
              key={i}
              onClick={() => setActiveTab(i)}
              className={cn(
                'text-lg font-bold pb-1 border-b-2 transition-colors',
                i === activeTab ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'
              )}
            >{t}</button>
          ))}
        </div>

        {/* Search + filter + sort + view */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="flex-1 flex items-center bg-background rounded-full px-4 py-2.5 border border-border">
            <Search className="w-4 h-4 text-muted-foreground mr-2 shrink-0" />
            <input type="text" placeholder="Поиск по сайту" className="bg-transparent outline-none w-full text-sm" />
          </div>
          <button
            className="w-10 h-10 rounded-full border border-border flex items-center justify-center hover:bg-secondary transition-colors shrink-0 lg:hidden"
            onClick={() => setShowFilters(!showFilters)}
          >
            <Search className="w-4 h-4" />
          </button>
          <div className="relative">
            <button
              onClick={() => setSortOpen(!sortOpen)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-full border border-border text-sm hover:bg-secondary transition-colors"
            >
              Сортировка <ChevronDown className="w-4 h-4" />
            </button>
            {sortOpen && (
              <div className="absolute top-full mt-1 right-0 bg-card border border-border rounded-xl shadow-lg z-30 py-1 min-w-[180px]">
                {['По цене ↑', 'По цене ↓', 'По площади', 'По дате'].map((s, i) => (
                  <button key={i} className="w-full text-left px-4 py-2 text-sm hover:bg-secondary transition-colors" onClick={() => setSortOpen(false)}>{s}</button>
                ))}
              </div>
            )}
          </div>
          <div className="hidden sm:block">
            <ViewToggle value={viewMode} onChange={setViewMode} />
          </div>
        </div>

        {/* View tabs */}
        <div className="flex items-center gap-2 mt-4 overflow-x-auto pb-2 scrollbar-hide">
          {viewTabs.map((vt, i) => (
            <button
              key={i}
              onClick={() => setActiveViewTab(i)}
              className={cn(
                'px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors',
                i === activeViewTab ? 'bg-primary text-primary-foreground' : 'bg-background border border-border hover:bg-secondary'
              )}
            >{vt}</button>
          ))}
          <span className="ml-auto text-sm text-muted-foreground whitespace-nowrap">
            {allProperties.length} объектов
          </span>
        </div>
      </div>

      {/* Sidebar + content */}
      <div className="max-w-[1400px] mx-auto px-4 pb-8">
        {viewMode === 'map' ? (
          <Suspense fallback={<div className="h-[70vh] bg-muted rounded-2xl animate-pulse" />}>
            <CatalogMapView items={paged} />
          </Suspense>
        ) : (
          <div className="flex gap-6">
            {/* Desktop sidebar */}
            <aside className="w-[240px] shrink-0 hidden lg:block">
              <CatalogFilters checked={checked} onToggle={toggle} />
            </aside>

            {/* Mobile filter offcanvas */}
            {showFilters && (
              <div className="fixed inset-0 z-[90] bg-background overflow-y-auto lg:hidden">
                <div className="px-4 py-6">
                  <div className="flex items-center justify-between mb-6">
                    <span className="font-bold">Фильтры</span>
                    <button className="text-sm font-medium text-primary" onClick={() => setShowFilters(false)}>Закрыть ✕</button>
                  </div>
                  <CatalogFilters checked={checked} onToggle={toggle} />
                  <button className="w-full bg-primary text-primary-foreground py-3 rounded-full font-medium text-sm mt-6" onClick={() => setShowFilters(false)}>
                    Показать {allProperties.length} объектов
                  </button>
                </div>
              </div>
            )}

            {/* Property content */}
            <div className="flex-1 min-w-0">
              {viewMode === 'list' ? (
                <CatalogList items={paged} />
              ) : (
                <CatalogGrid items={paged} />
              )}

              {/* Pagination */}
              <div className="flex flex-col sm:flex-row items-center justify-between mt-8 gap-4">
                <Pagination>
                  <PaginationContent>
                    {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => (
                      <PaginationItem key={i}>
                        <PaginationLink
                          href="#"
                          isActive={currentPage === i + 1}
                          onClick={(e) => { e.preventDefault(); setCurrentPage(i + 1); }}
                        >
                          {i + 1}
                        </PaginationLink>
                      </PaginationItem>
                    ))}
                    <PaginationItem>
                      <PaginationNext
                        href="#"
                        onClick={(e) => { e.preventDefault(); setCurrentPage(p => Math.min(totalPages, p + 1)); }}
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>

                <div className="flex items-center gap-2 text-sm">
                  <span className="text-muted-foreground">Показывать:</span>
                  <div className="relative">
                    <select
                      value={perPage}
                      onChange={(e) => { setPerPage(Number(e.target.value)); setCurrentPage(1); }}
                      className="appearance-none bg-background border border-border rounded-lg px-3 py-1.5 pr-8 text-sm cursor-pointer"
                    >
                      {perPageOptions.map(n => (
                        <option key={n} value={n}>{n}</option>
                      ))}
                    </select>
                    <ChevronDown className="w-3 h-3 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <PropertyGridSection title="Горячие предложения" type="hot" />
      <QuizSection />
      <AboutPlatform />
      <AdditionalFeatures />
      <LatestNews />
      <ContactsSection />
      <FooterSection />
    </div>
  );
};

export default Catalog;
