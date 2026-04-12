import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Heart, ChevronRight, ChevronDown, Building, Layers, Maximize, Play } from 'lucide-react';
import Header from '@/components/Header';
import PropertyGridSection from '@/components/PropertyGridSection';
import AdditionalFeatures from '@/components/AdditionalFeatures';
import LatestNews from '@/components/LatestNews';
import ContactsSection from '@/components/ContactsSection';
import FooterSection from '@/components/FooterSection';
import ZhkCard, { type ZhkData } from '@/components/ZhkCard';
import complex1 from '@/assets/complex-1.jpg';
import complex2 from '@/assets/complex-2.jpg';
import complex3 from '@/assets/complex-3.jpg';
import complex4 from '@/assets/complex-4.jpg';
import { useState } from 'react';
import { cn } from '@/lib/utils';

/* ---- mock flats data ---- */
interface FlatData {
  slug: string;
  planImage: string;
  building: string;
  section: string;
  floor: string;
  number: string;
  area: string;
  kitchenArea: string;
  finishing: string;
  basePrice: string;
  fullPrice: string;
  pricePerM2: string;
  status: string;
}

const mockFlats: Record<string, FlatData[]> = {
  'Студии': [
    { slug: 'studio-1', planImage: complex1, building: '1', section: '1', floor: '3', number: '5', area: '29,5 м²', kitchenArea: '8,2 м²', finishing: 'Без отделки', basePrice: '4 420 000', fullPrice: '4 420 000', pricePerM2: '149 830', status: 'Свободна' },
    { slug: 'studio-2', planImage: complex1, building: '1', section: '2', floor: '5', number: '12', area: '31,2 м²', kitchenArea: '9,1 м²', finishing: 'Чистовая', basePrice: '4 680 000', fullPrice: '4 680 000', pricePerM2: '150 000', status: 'Свободна' },
    { slug: 'studio-3', planImage: complex1, building: '2', section: '1', floor: '8', number: '24', area: '34,8 м²', kitchenArea: '10,3 м²', finishing: 'Без отделки', basePrice: '5 220 000', fullPrice: '5 220 000', pricePerM2: '150 000', status: 'Бронь' },
  ],
  '1-спальные': [
    { slug: 'one-bed-1', planImage: complex2, building: '1', section: '1', floor: '4', number: '8', area: '42,5 м²', kitchenArea: '12,4 м²', finishing: 'Чистовая', basePrice: '8 200 000', fullPrice: '8 200 000', pricePerM2: '192 941', status: 'Свободна' },
    { slug: 'one-bed-2', planImage: complex2, building: '1', section: '3', floor: '7', number: '19', area: '38,9 м²', kitchenArea: '11,0 м²', finishing: 'Без отделки', basePrice: '8 560 000', fullPrice: '8 560 000', pricePerM2: '220 051', status: 'Свободна' },
  ],
  '2-спальные': [
    { slug: 'two-bed-1', planImage: complex3, building: '1', section: '2', floor: '6', number: '15', area: '62,3 м²', kitchenArea: '14,5 м²', finishing: 'Без отделки', basePrice: '12 200 000', fullPrice: '12 200 000', pricePerM2: '195 826', status: 'Свободна' },
    { slug: 'two-bed-2', planImage: complex3, building: '2', section: '1', floor: '10', number: '31', area: '58,7 м²', kitchenArea: '13,2 м²', finishing: 'Чистовая', basePrice: '12 800 000', fullPrice: '12 800 000', pricePerM2: '218 057', status: 'Бронь' },
  ],
};

/* ---- mock data ---- */
const zhkDatabase: Record<string, {
  name: string; heroImage: string; deliveryDate: string;
  priceFrom: string; pricePerM2: string; mortgage: string;
  apartments: { type: string; count: number; area: string; price: string }[];
  description: string[]; quota: string; floors: string; areaTotal: string;
  developer: string[];
  infrastructure: { title: string; image: string; accent?: boolean }[];
}> = {
  smorodina: {
    name: 'ЖК Смородина',
    heroImage: complex1,
    deliveryDate: 'Март 2027',
    priceFrom: 'от 3.4 млн руб',
    pricePerM2: 'от 150 000 за м2',
    mortgage: 'от 3%',
    apartments: [
      { type: 'Студии', count: 76, area: '29,45 м2 – 42,75 м2', price: 'от 4.4 млн' },
      { type: '1-спальные', count: 121, area: '29,45 м2 – 42,75 м2', price: 'от 8.2 млн' },
      { type: '2-спальные', count: 65, area: '29,45 м2 – 42,75 м2', price: 'от 12.2 млн' },
    ],
    description: [
      'Lorem ipsum, dolor sit amet consectetur adipisicing elit. Sed, aspernatur ratios. Nostrum eligendi similique, aliquam error repellendus totam, Lorem ipsum dolor sit amet.',
      'Placeat quasi qui esse mollitiae tempore? Expedita dignissimos voluptate sit explicabo, error earum, optio quos inventore autem nostrum itaque voluptas atque.',
      'Accusamus quas inventore earum maiores vel voluptas cum aliquam libero, alias aspernatur ratione temporibus sint dolor nostrum provident.'
    ],
    quota: '365 квартир',
    floors: '16 этажей',
    areaTotal: '1221 м2',
    developer: [
      'Компания Siam Oriental осуществляет свою деятельность в городе Паттайя, начиная с 2004 года, являясь крупнейшим финским застройщиком в Таиланде, преждевременно и успешно вводит объекты в эксплуатацию.',
      'Siam Oriental Dream — 11-й проект в районе Пратамнак. Уже более 1 400 владельцев квартир, в кондоминиумах Siam Oriental воплотили свою мечту о собственной недвижимости в Таиланде.',
      'При желании приобретенную квартиру можно отдать нам на управление, проект-менеджмент, или продвижение для сдачи в аренду.'
    ],
    infrastructure: [
      { title: 'Особенности', image: '', accent: true },
      { title: 'Современный фитнес-зал', image: complex2 },
      { title: 'Зона отдыха и парка', image: complex3 },
      { title: 'Сад и зеленая зона', image: complex4 },
      { title: 'Бассейн на 16 этаже\nс панорамным видом на море', image: complex1 },
    ]
  }
};

const similarZhk: ZhkData[] = [
  { images: [complex2, complex1, complex3], name: 'ЖК Высота', price: 'от 12.3 млн', unitsCount: 'В продаже 180 квартир', badges: ['Ипотека 6%'], apartments: [{ type: '2-комнатная', area: 'от 68 м.кв.', price: 'от 12.3 млн' }] },
  { images: [complex3, complex4, complex1], name: 'ЖК Парк Сити', price: 'от 7.1 млн', unitsCount: 'В продаже 340 квартир', badges: [], apartments: [{ type: '1-комнатная', area: 'от 38 м.кв.', price: 'от 7.1 млн' }] },
  { images: [complex1, complex2, complex4], name: 'ЖК Снегири', price: 'от 5.6 млн', unitsCount: 'В продаже 226 квартир', badges: ['Рассрочка 1 год'], apartments: [{ type: 'Студия', area: 'от 24 м.кв.', price: 'от 5.6 млн' }] },
  { images: [complex4, complex3, complex2], name: 'ЖК Лесной', price: 'от 9.5 млн', unitsCount: 'В продаже 95 квартир', badges: [], apartments: [{ type: '2-комнатная', area: 'от 54 м.кв.', price: 'от 9.5 млн' }] },
];

const ZhkDetail = () => {
  const { slug } = useParams<{ slug: string }>();
  const data = zhkDatabase[slug || 'smorodina'] || zhkDatabase.smorodina;
  const [liked, setLiked] = useState(false);
  const [expandedType, setExpandedType] = useState<string | null>(null);

  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* Hero */}
      <section className="relative">
        <div className="relative h-[320px] md:h-[420px] overflow-hidden">
          <img src={data.heroImage} alt={data.name} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-foreground/40" />

          {/* Back + breadcrumb */}
          <div className="absolute top-4 left-0 right-0 max-w-[1400px] mx-auto px-4">
            <Link to="/catalog-zhk" className="inline-flex items-center gap-2 text-background text-sm hover:underline mb-3">
              <ArrowLeft className="w-4 h-4" /> Назад
            </Link>
            <div className="flex items-center gap-1.5 text-background/80 text-xs flex-wrap mt-2">
              <Link to="/" className="hover:text-background">Главная</Link>
              <ChevronRight className="w-3 h-3" />
              <span>Новостройки</span>
              <ChevronRight className="w-3 h-3" />
              <span>Объекты в Москве</span>
              <ChevronRight className="w-3 h-3" />
              <span className="text-background">{data.name}</span>
            </div>
          </div>

          {/* Video mini-block */}
          <div className="absolute bottom-6 right-6 hidden md:flex w-28 h-20 rounded-xl overflow-hidden border-2 border-background/50 cursor-pointer group">
            <img src={complex2} alt="video" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-foreground/30 flex items-center justify-center group-hover:bg-foreground/50 transition-colors">
              <Play className="w-6 h-6 text-background fill-background" />
            </div>
          </div>
        </div>

        {/* Info card overlapping hero */}
        <div className="max-w-[1400px] mx-auto px-4 -mt-16 relative z-10">
          <div className="bg-card rounded-2xl border border-border p-5 md:p-6 shadow-sm">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <h1 className="text-xl md:text-2xl font-bold">{data.name}</h1>
                <p className="text-sm text-primary mt-0.5">Сдача в эксплуатацию: {data.deliveryDate}</p>
              </div>
              <div className="flex flex-wrap items-center gap-6">
                <div>
                  <p className="text-xs text-muted-foreground">Стоимость квартир</p>
                  <p className="font-bold text-sm">{data.priceFrom}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Ипотека</p>
                  <p className="font-bold text-sm">{data.mortgage}</p>
                </div>
                <button
                  onClick={() => setLiked(!liked)}
                  className="flex items-center gap-2 px-4 py-2 rounded-full border border-border text-sm hover:bg-secondary transition-colors"
                >
                  <Heart className={cn("w-4 h-4", liked ? "fill-primary text-primary" : "text-muted-foreground")} />
                  <span className="hidden sm:inline">Добавить в избранное</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Apartment types + contact form */}
      <section className="py-8">
        <div className="max-w-[1400px] mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left: apartment table */}
            <div className="lg:col-span-2">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
                <h2 className="text-lg md:text-xl font-bold">Стоимость квартир {data.priceFrom}</h2>
                <span className="px-4 py-2 rounded-full bg-secondary text-sm font-medium">{data.pricePerM2}</span>
              </div>

              <div className="space-y-0 border border-border rounded-2xl overflow-hidden">
                {data.apartments.map((apt, i) => {
                  const isExpanded = expandedType === apt.type;
                  const flats = mockFlats[apt.type] || [];
                  return (
                    <div key={i} className={cn(i < data.apartments.length - 1 && !isExpanded && "border-b border-border")}>
                      <div
                        className="flex items-center justify-between gap-3 px-5 py-4 hover:bg-secondary/50 transition-colors cursor-pointer"
                        onClick={() => setExpandedType(isExpanded ? null : apt.type)}
                      >
                        <span className="font-medium text-sm w-28 shrink-0">{apt.type}</span>
                        <span className="text-primary text-sm font-medium">{apt.count} квартир</span>
                        <span className="text-sm text-muted-foreground hidden sm:block">{apt.area}</span>
                        <span className="text-sm font-semibold">{apt.price}</span>
                        <ChevronDown className={cn("w-4 h-4 text-muted-foreground shrink-0 transition-transform", isExpanded && "rotate-180")} />
                      </div>

                      {isExpanded && flats.length > 0 && (
                        <div className="border-t border-border">
                          {/* Scrollable table */}
                          <div className="overflow-x-auto">
                            <table className="w-full text-sm min-w-[900px]">
                              <thead>
                                <tr className="border-b border-border bg-secondary/30">
                                  <th className="px-3 py-2.5 text-left font-medium text-muted-foreground w-[60px]"></th>
                                  <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">Корп.</th>
                                  <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">Секц.</th>
                                  <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">Эт.</th>
                                  <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">№ кв.</th>
                                  <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">S прив.</th>
                                  <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">S кухни</th>
                                  <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">Отделка</th>
                                  <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">При 100%</th>
                                  <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">За м²</th>
                                  <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">Статус</th>
                                </tr>
                              </thead>
                              <tbody>
                                {flats.map((flat, fi) => (
                                  <tr key={fi} className="border-b border-border last:border-0 hover:bg-secondary/30 transition-colors">
                                    <td className="px-3 py-2">
                                      <Link to={`/object/${flat.slug}`}>
                                        <img src={flat.planImage} alt="План" className="w-10 h-10 rounded object-cover" />
                                      </Link>
                                    </td>
                                    <td className="px-3 py-2"><Link to={`/object/${flat.slug}`} className="hover:text-primary">{flat.building}</Link></td>
                                    <td className="px-3 py-2"><Link to={`/object/${flat.slug}`} className="hover:text-primary">{flat.section}</Link></td>
                                    <td className="px-3 py-2"><Link to={`/object/${flat.slug}`} className="hover:text-primary">{flat.floor}</Link></td>
                                    <td className="px-3 py-2"><Link to={`/object/${flat.slug}`} className="hover:text-primary">{flat.number}</Link></td>
                                    <td className="px-3 py-2"><Link to={`/object/${flat.slug}`} className="hover:text-primary">{flat.area}</Link></td>
                                    <td className="px-3 py-2"><Link to={`/object/${flat.slug}`} className="hover:text-primary">{flat.kitchenArea}</Link></td>
                                    <td className="px-3 py-2"><Link to={`/object/${flat.slug}`} className="hover:text-primary">{flat.finishing}</Link></td>
                                    <td className="px-3 py-2 font-medium"><Link to={`/object/${flat.slug}`} className="hover:text-primary">{flat.fullPrice} ₽</Link></td>
                                    <td className="px-3 py-2"><Link to={`/object/${flat.slug}`} className="hover:text-primary">{flat.pricePerM2} ₽</Link></td>
                                    <td className="px-3 py-2">
                                      <Link to={`/object/${flat.slug}`}>
                                        <span className={cn(
                                          "px-2.5 py-1 rounded-full text-xs font-medium",
                                          flat.status === 'Свободна' ? "bg-primary/10 text-primary" : "bg-accent text-accent-foreground"
                                        )}>{flat.status}</span>
                                      </Link>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                          <div className="flex justify-center py-3 border-t border-border">
                            <button
                              onClick={() => setExpandedType(null)}
                              className="px-6 py-2 rounded-xl bg-secondary text-sm font-medium hover:bg-secondary/80 transition-colors"
                            >
                              Свернуть
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right: contact form */}
            <div className="bg-card rounded-2xl border border-border p-5">
              <p className="font-semibold text-sm mb-1">Свяжитесь сейчас</p>
              <p className="text-xs text-muted-foreground mb-4">или оставьте заявку</p>
              <div className="space-y-3">
                <input
                  type="text"
                  placeholder="Ваше имя"
                  className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
                <div className="flex gap-2">
                  <span className="flex items-center gap-1 px-3 py-2.5 rounded-xl border border-border text-sm bg-background shrink-0">
                    🇷🇺
                  </span>
                  <input
                    type="tel"
                    placeholder="+7 900 121 46 07"
                    className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                  <button className="bg-primary text-primary-foreground px-4 py-2.5 rounded-xl text-sm shrink-0">→</button>
                </div>
                <button className="w-full bg-primary text-primary-foreground py-2.5 rounded-xl text-sm font-medium">
                  Отправить заявку
                </button>
              </div>
              <div className="flex gap-2 mt-4 justify-center">
                {['VK', 'TG', 'YT', 'OK'].map((s) => (
                  <a key={s} href="#" className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center text-xs font-bold hover:bg-primary hover:text-primary-foreground transition-colors">
                    {s}
                  </a>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* About project */}
      <section className="py-8">
        <div className="max-w-[1400px] mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="rounded-2xl overflow-hidden">
              <img src={complex3} alt={data.name} className="w-full h-full object-cover min-h-[300px]" />
            </div>
            <div>
              <h2 className="text-xl md:text-2xl font-bold mb-4">О проекте</h2>
              {data.description.map((p, i) => (
                <p key={i} className="text-sm text-muted-foreground mb-3 leading-relaxed">{p}</p>
              ))}
              <div className="grid grid-cols-3 gap-4 mt-6">
                <div className="bg-secondary rounded-2xl p-4 text-center">
                  <Building className="w-6 h-6 text-primary mx-auto mb-2" />
                  <p className="text-xs text-muted-foreground">Квота</p>
                  <p className="font-bold text-sm">{data.quota}</p>
                </div>
                <div className="bg-secondary rounded-2xl p-4 text-center">
                  <Layers className="w-6 h-6 text-primary mx-auto mb-2" />
                  <p className="text-xs text-muted-foreground">Этажность</p>
                  <p className="font-bold text-sm">{data.floors}</p>
                </div>
                <div className="bg-secondary rounded-2xl p-4 text-center">
                  <Maximize className="w-6 h-6 text-primary mx-auto mb-2" />
                  <p className="text-xs text-muted-foreground">Площадь</p>
                  <p className="font-bold text-sm">{data.areaTotal}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Infrastructure */}
      <section className="py-8">
        <div className="max-w-[1400px] mx-auto px-4">
          <h2 className="text-xl md:text-2xl font-bold mb-2">Инфраструктура ЖК</h2>
          <p className="text-sm text-muted-foreground mb-6 max-w-2xl">
            Placeat quasi qui esse mollitiae tempore? Expedita dignissimos voluptate sit explicabo, error earum, optio quos inventore nostrum itaque voluptas atque.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Accent card */}
            <div className="bg-primary rounded-2xl p-6 flex flex-col justify-between min-h-[200px] sm:row-span-2">
              <div>
                <span className="px-3 py-1 bg-primary-foreground/20 text-primary-foreground rounded-full text-xs font-medium">Особенности</span>
              </div>
              <p className="text-primary-foreground text-sm leading-relaxed mt-4">
                Проект получил свое название, благодаря своей внутренней инфраструктуре, террасе с бассейном на крыше, фитнесу, сауне.
              </p>
            </div>

            {data.infrastructure.filter(inf => !inf.accent).map((inf, i) => (
              <div key={i} className="rounded-2xl overflow-hidden relative group cursor-pointer">
                <img src={inf.image} alt={inf.title} className="w-full h-full object-cover min-h-[160px] group-hover:scale-105 transition-transform duration-500" />
                <div className="absolute inset-0 bg-gradient-to-t from-foreground/60 to-transparent" />
                <p className="absolute bottom-3 left-3 right-3 text-background text-sm font-medium whitespace-pre-line">{inf.title}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Map */}
      <section className="py-8">
        <div className="max-w-[1400px] mx-auto px-4">
          <h2 className="text-xl md:text-2xl font-bold mb-2">Объект на карте</h2>
          <p className="text-sm text-muted-foreground mb-4 flex items-center gap-1.5">
            <span className="text-primary">📍</span> Местоположение
          </p>
          <div className="bg-secondary rounded-2xl overflow-hidden relative" style={{ height: '400px' }}>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center mx-auto mb-2">
                  <span className="text-primary-foreground text-lg">📍</span>
                </div>
                <span className="bg-primary text-primary-foreground px-4 py-1.5 rounded-full text-sm font-medium">{data.name}</span>
              </div>
            </div>
            <div className="absolute inset-0 bg-[url('https://api.mapbox.com/styles/v1/mapbox/light-v11/static/37.6173,55.7558,12,0/1400x400@2x?access_token=placeholder')] bg-cover bg-center opacity-30" />
          </div>
        </div>
      </section>

      {/* Developer */}
      <section className="py-8">
        <div className="max-w-[1400px] mx-auto px-4">
          <h2 className="text-xl md:text-2xl font-bold mb-4">О застройщике</h2>
          {data.developer.map((p, i) => (
            <p key={i} className="text-sm text-muted-foreground mb-3 leading-relaxed max-w-3xl">{p}</p>
          ))}
        </div>
      </section>

      {/* Similar ZHK */}
      <section className="py-8">
        <div className="max-w-[1400px] mx-auto px-4">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl md:text-2xl font-bold">Похожие объекты</h2>
            <Link to="/catalog-zhk" className="text-primary text-sm font-medium hover:underline">Все предложения →</Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {similarZhk.map((zhk, i) => (
              <ZhkCard key={i} data={zhk} />
            ))}
          </div>
        </div>
      </section>

      <AdditionalFeatures />
      <LatestNews />
      <ContactsSection />
      <FooterSection />
    </div>
  );
};

export default ZhkDetail;
