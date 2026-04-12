import { Link } from 'react-router-dom';
import catNovostroyki from '@/assets/cat-novostroyki.png';
import catSecondary from '@/assets/cat-secondary.png';
import catRent from '@/assets/cat-rent.png';
import catHouses from '@/assets/cat-houses.png';
import catPlots from '@/assets/cat-plots.png';
import catMortgage from '@/assets/cat-mortgage.png';
import catApartments from '@/assets/cat-apartments.png';
import catParking from '@/assets/cat-parking.png';
import catCommercial from '@/assets/cat-commercial.png';
import catSearch from '@/assets/cat-search.png';

const categories = [
  { name: 'Новостройки', image: catNovostroyki },
  { name: 'Вторичная\nнедвижимость', image: catSecondary },
  { name: 'Аренда', image: catRent },
  { name: 'Дома', image: catHouses },
  { name: 'Участки', image: catPlots },
  { name: 'Ипотека', image: catMortgage },
  { name: 'Квартиры', image: catApartments },
  { name: 'Паркинги', image: catParking },
  { name: 'Коммерческая\nнедвижимость', image: catCommercial },
  { name: 'Подобрать\nобъект', image: catSearch },
];

const CategoryTiles = () => {
  return (
    <section className="py-8 sm:py-12">
      <div className="max-w-[1400px] mx-auto px-4">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
          {categories.map((cat, i) => (
            <Link
              key={i}
              to="/catalog"
              className="bg-secondary rounded-2xl p-4 flex flex-col items-start hover:shadow-md transition-shadow min-h-[130px] md:min-h-[150px] relative overflow-hidden group"
            >
            <span className="font-semibold text-sm whitespace-pre-line relative z-10">{cat.name}</span>
            <img
              src={cat.image}
              alt={cat.name}
              className="absolute bottom-0 right-0 w-20 h-20 md:w-28 md:h-28 object-contain group-hover:scale-105 transition-transform"
            />
          </Link>
        ))}
      </div>
    </div>
  </section>
  );
};

export default CategoryTiles;
