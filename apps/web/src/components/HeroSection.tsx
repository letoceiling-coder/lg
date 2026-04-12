import { useState } from 'react';
import { MapPin, Search, SlidersHorizontal } from 'lucide-react';
import FiltersOverlay from './FiltersOverlay';

const tabs = ['Квартиры', 'Паркинги', 'Дома с участками', 'Участки', 'Коммерция'];

const HeroSection = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [filtersOpen, setFiltersOpen] = useState(false);

  return (
    <>
      <section className="py-8 md:py-12">
        <div className="max-w-[1400px] mx-auto px-4">
          <div className="flex items-center gap-2 mb-6">
            <MapPin className="w-5 h-5 text-primary" />
            <span className="text-sm font-medium">Москва и МО</span>
          </div>
          <h1 className="text-3xl md:text-5xl font-bold text-center mb-8">
            <span className="text-primary italic">Live Grid.</span>{' '}
            Более 100 000 объектов по России
          </h1>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 max-w-[800px] mx-auto mb-6">
            <div className="flex-1 flex items-center bg-background rounded-full px-4 py-3 border border-border">
              <Search className="w-5 h-5 text-muted-foreground mr-3 shrink-0" />
              <input type="text" placeholder="Поиск по сайту" className="bg-transparent outline-none w-full text-sm" />
            </div>
            <button
              className="w-12 h-12 rounded-full border border-border flex items-center justify-center hover:bg-secondary transition-colors shrink-0 self-center"
              onClick={() => setFiltersOpen(true)}
            >
              <SlidersHorizontal className="w-5 h-5" />
            </button>
            <button className="bg-primary text-primary-foreground px-6 py-3 rounded-full text-sm font-medium whitespace-nowrap shrink-0">
              Показать 121 563 объекта
            </button>
          </div>
          <div className="flex items-center justify-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {tabs.map((tab, i) => (
              <button
                key={i}
                onClick={() => setActiveTab(i)}
                className={`px-5 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                  i === activeTab ? 'bg-primary text-primary-foreground' : 'bg-background border border-border hover:bg-secondary'
                }`}
              >{tab}</button>
            ))}
          </div>
        </div>
      </section>
      <FiltersOverlay open={filtersOpen} onClose={() => setFiltersOpen(false)} />
    </>
  );
};

export default HeroSection;
