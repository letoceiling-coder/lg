import { useQuery } from '@tanstack/react-query';
import { Crown, Users, Heart, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { apiGet } from '@/lib/api';
import aboutMain from '@/assets/about-main.jpg';

type Counters = { blocks: number; apartments: number; builders: number; regions: number };

function fmtCount(n: number): string {
  if (n >= 1000) return `${Math.round(n / 1000)} 000+`;
  return String(n);
}

const fallbackStats = [
  { value: '12+ лет', label: 'опыта на рынке', icon: Crown },
  { value: '15+ человек', label: 'в команде', icon: Users },
  { value: '5 000+ клиентов', label: 'по всей России', icon: Heart },
];

const AboutPlatform = () => {
  const { data: counters } = useQuery({
    queryKey: ['stats', 'counters'],
    queryFn: () => apiGet<Counters>('/stats/counters'),
    staleTime: 5 * 60_000,
  });

  const stats = counters
    ? [
        { value: `${fmtCount(counters.apartments)}`, label: 'квартир в базе', icon: Building2 },
        { value: `${counters.blocks}`, label: 'жилых комплексов', icon: Crown },
        { value: `${counters.builders}`, label: 'застройщиков', icon: Users },
      ]
    : fallbackStats;

  return (
  <section className="py-8 sm:py-12 bg-secondary">
    <div className="max-w-[1400px] mx-auto px-4">

      {/* Main grid: image left, text right */}
      <div className="grid grid-cols-1 lg:grid-cols-[3fr_2fr] gap-6 lg:gap-8 items-start">

        {/* Image — fixed aspect, order-2 on mobile */}
        <div className="relative rounded-xl overflow-hidden aspect-[16/10] order-2 lg:order-1">
          <img
            src={aboutMain}
            alt="О платформе LiveGrid"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-foreground/50 via-foreground/10 to-transparent" />
          <div className="absolute bottom-0 left-0 p-4 sm:p-6 text-primary-foreground">
            <h3 className="text-sm sm:text-base font-bold mb-0.5">Эксклюзивные объекты</h3>
            <p className="text-[11px] sm:text-xs leading-relaxed opacity-90 max-w-[280px]">
              Работаем с редкими объектами недвижимости по всей России
            </p>
          </div>
        </div>

        {/* Text column — order-1 on mobile */}
        <div className="flex flex-col order-1 lg:order-2">
          <h2 className="text-base sm:text-xl font-bold mb-1">О платформе</h2>
          <p className="text-lg sm:text-2xl font-bold mb-4">Live Grid</p>

          <div className="text-xs sm:text-sm text-muted-foreground leading-[1.7] space-y-3 max-w-[440px]">
            <p>
              Современная платформа по недвижимости, созданная на базе агентства «Авангард». Сопровождаем сделки по всей России.
            </p>
            <p>
              Полный цикл: подбор, переговоры, юридическая защита и закрытие сделки. Экспертиза, прозрачность и результат.
            </p>
          </div>

          {/* CTA buttons — aligned, same height */}
          <div className="flex items-center gap-3 mt-5 sm:mt-6">
            <Button className="rounded-xl h-10 px-5 text-xs sm:text-sm">Зарегистрироваться</Button>
            <Button variant="outline" className="rounded-xl h-10 px-5 text-xs sm:text-sm">Помощь с подбором</Button>
          </div>
        </div>
      </div>

      {/* Stats row — full width, unified height */}
      <div className="grid grid-cols-3 gap-3 sm:gap-4 mt-6 sm:mt-8">
        {stats.map((s) => (
          <div
            key={s.label}
            className="flex items-center gap-3 bg-background rounded-xl p-3 sm:p-4 h-[64px] sm:h-[72px]"
          >
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-accent flex items-center justify-center shrink-0">
              <s.icon className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
            </div>
            <div className="min-w-0">
              <div className="text-sm sm:text-base font-bold leading-tight truncate">{s.value}</div>
              <div className="text-[10px] sm:text-xs text-muted-foreground truncate">{s.label}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  </section>
  );
};

export default AboutPlatform;
