import { Link } from 'react-router-dom';
import { Calculator, UserSearch, Building2, UserCircle } from 'lucide-react';

const tools = [
  {
    icon: Calculator,
    title: 'Ипотечный калькулятор',
    desc: 'Рассчитайте платёж',
    to: '/mortgage',
  },
  {
    icon: UserSearch,
    title: 'Индивидуальный подбор',
    desc: 'Подберём под запрос',
    to: '/selection',
  },
  {
    icon: Building2,
    title: 'Вся недвижимость',
    desc: 'Каталог объектов',
    to: '/catalog',
  },
  {
    icon: UserCircle,
    title: 'Личный кабинет',
    desc: 'Избранное и заявки',
    to: '/login',
  },
];

const AdditionalFeatures = () => (
  <section className="py-8 sm:py-12">
    <div className="max-w-[1400px] mx-auto px-4">
      <h2 className="text-base sm:text-xl font-bold mb-4 sm:mb-6">Инструменты</h2>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
        {tools.map((t) => (
          <Link
            key={t.to}
            to={t.to}
            className="flex items-center gap-3 rounded-xl border border-border bg-card p-3.5 sm:p-4 cursor-pointer select-none transition-all duration-200 hover:shadow-md hover:-translate-y-px hover:border-primary/30 group"
          >
            <div className="w-10 h-10 rounded-lg bg-accent flex items-center justify-center shrink-0">
              <t.icon className="w-5 h-5 text-primary" strokeWidth={1.5} />
            </div>
            <div className="min-w-0">
              <span className="text-sm font-semibold leading-tight block truncate group-hover:text-primary transition-colors">{t.title}</span>
              <span className="text-[11px] text-muted-foreground truncate block">{t.desc}</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  </section>
);

export default AdditionalFeatures;
