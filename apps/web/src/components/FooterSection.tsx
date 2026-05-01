import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Phone, Mail, MapPin, Clock, ChevronDown, Send, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useSiteSettings, settingOptional } from '@/redesign/hooks/useSiteSettings';
import { telHref, yandexMapsHref } from '@/lib/contact-links';

const navColumns = [
  {
    title: 'Недвижимость',
    links: [
      { label: 'Квартиры', to: '/catalog?type=apartments' },
      { label: 'Дома', to: '/catalog?type=houses' },
      { label: 'Участки', to: '/catalog?type=land' },
      { label: 'Коммерция', to: '/catalog?type=commercial' },
      { label: 'Новостройки', to: '/catalog?type=apartments&market=new' },
      { label: 'Вторичка', to: '/catalog?type=apartments&market=secondary' },
    ],
  },
  {
    title: 'Сервисы',
    links: [
      { label: 'Подбор объекта', to: '/selection' },
      { label: 'Каталог', to: '/catalog' },
      { label: 'На карте', to: '/map' },
    ],
  },
  {
    title: 'Компания',
    links: [
      { label: 'О компании', to: '/about' },
      { label: 'Контакты', to: '/contacts' },
      { label: 'Новости', to: '/news' },
      { label: 'Партнерам', to: '/partners' },
      { label: 'Карьера', to: '/career' },
    ],
  },
  {
    title: 'Аккаунт',
    links: [
      { label: 'Войти', to: '/login' },
      { label: 'Регистрация', to: '/register' },
      { label: 'Избранное', to: '/favorites' },
      { label: 'Личный кабинет', to: '/profile' },
    ],
  },
];

const socialsDefs = [
  { label: 'Telegram', icon: Send, settingsKey: 'telegram_url' },
  { label: 'VK', icon: MessageCircle, settingsKey: 'vk_url' },
  { label: 'YouTube', icon: () => <span className="text-[10px] font-bold leading-none">YT</span>, settingsKey: 'youtube_url' },
  { label: 'Одноклассники', icon: () => <span className="text-[10px] font-bold leading-none">OK</span>, settingsKey: 'ok_url' },
];

const legalLinks: { label: string; to: string }[] = [
  { label: 'Пользовательское соглашение', to: '/terms' },
  { label: 'Политика конфиденциальности', to: '/privacy' },
  { label: 'Обработка персональных данных (152-ФЗ)', to: '/privacy' },
  { label: 'Согласие на обработку ПД', to: '/privacy' },
  { label: 'Оферта', to: '/offer' },
];

/* Mobile accordion column */
const MobileColumn = ({ title, links }: { title: string; links: { label: string; to: string }[] }) => {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-primary-foreground/10">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center justify-between w-full py-3 text-sm font-medium"
      >
        {title}
        <ChevronDown className={cn('w-4 h-4 opacity-50 transition-transform duration-200', open && 'rotate-180')} />
      </button>
      <div className={cn('overflow-hidden transition-all duration-250', open ? 'max-h-[300px] pb-3' : 'max-h-0')}>
        <ul className="space-y-2">
          {links.map((l) => (
            <li key={l.label}>
              <Link to={l.to} className="text-xs opacity-60 hover:opacity-100 transition-opacity">{l.label}</Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

const FooterSection = React.forwardRef<HTMLElement>((_, ref) => {
  const { data: s } = useSiteSettings();

  const phoneMain = settingOptional(s, 'phone_main');
  const phoneHref = phoneMain ? telHref(phoneMain) : undefined;
  const emailVal = settingOptional(s, 'email');
  const addressVal = settingOptional(s, 'address');
  const officeLat = settingOptional(s, 'office_lat');
  const officeLng = settingOptional(s, 'office_lng');
  const mapsUrl =
    addressVal || (officeLat && officeLng)
      ? yandexMapsHref({ address: addressVal, officeLat, officeLng })
      : undefined;

  const whWeekday = settingOptional(s, 'work_hours_weekdays');
  const whWeekend = settingOptional(s, 'work_hours_weekend');
  const whSingle = settingOptional(s, 'work_hours');
  const hourLines = [whWeekday, whWeekend].filter(Boolean) as string[];
  if (hourLines.length === 0 && whSingle) hourLines.push(whSingle);
  const showHours = hourLines.length > 0;

  const companyName = settingOptional(s, 'company_name');
  const inn = settingOptional(s, 'inn');
  const ogrn = settingOptional(s, 'ogrn');
  const companyParts: string[] = [];
  if (companyName) companyParts.push(companyName);
  if (inn) companyParts.push(`ИНН ${inn}`);
  if (ogrn) companyParts.push(`ОГРН ${ogrn}`);
  const companyLine =
    companyParts.length > 0 ? companyParts.join(' · ') : settingOptional(s, 'company_info');

  const copyrightYear = settingOptional(s, 'copyright_year') ?? '2026';

  const socials = socialsDefs
    .map((d) => ({ ...d, href: settingOptional(s, d.settingsKey) }))
    .filter((x): x is (typeof socialsDefs)[number] & { href: string } => Boolean(x.href));

  return (
  <footer ref={ref} className="bg-foreground text-primary-foreground">

    {/* LEVEL 1 — CTA */}
    <div className="border-b border-primary-foreground/10">
      <div className="max-w-[1400px] mx-auto px-4 py-8 sm:py-10 flex flex-col sm:flex-row items-center justify-between gap-4 sm:gap-6">
        <div className="text-center sm:text-left">
          <h3 className="text-base sm:text-lg font-bold mb-1">Нужна помощь с выбором?</h3>
          <p className="text-xs sm:text-sm opacity-70">Эксперты LiveGrid подберут объект бесплатно</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap justify-center sm:justify-end">
          <Button asChild className="rounded-xl h-10 px-5 text-xs sm:text-sm">
            <Link to="/contacts">Получить консультацию</Link>
          </Button>
          {phoneHref ? (
            <a
              href={phoneHref}
              className="inline-flex items-center gap-2 h-10 px-5 rounded-xl border border-primary-foreground/20 text-xs sm:text-sm font-medium hover:bg-primary-foreground/10 transition-colors"
            >
              <Phone className="w-3.5 h-3.5" />
              Позвонить
            </a>
          ) : null}
          <Link
            to="/register"
            className="inline-flex items-center gap-2 h-10 px-5 rounded-xl bg-primary-foreground/10 text-xs sm:text-sm font-medium hover:bg-primary-foreground/20 transition-colors"
          >
            Зарегистрироваться
          </Link>
        </div>
      </div>
    </div>

    {/* LEVEL 2 — Main footer */}
    <div className="max-w-[1400px] mx-auto px-4 py-8 sm:py-10">

      {/* Desktop grid */}
      <div className="hidden md:grid md:grid-cols-[1.3fr_1fr_1fr_1fr_1fr] gap-6 lg:gap-8">

        {/* Brand + contacts */}
        <div>
          <Link to="/" className="flex items-center gap-2.5 mb-4">
            <img src="/logo.svg" alt="Live Grid" className="w-8 h-8 object-contain" />
            <span className="font-bold text-sm">Live Grid</span>
          </Link>

          <div className="space-y-2.5 text-xs opacity-70">
            {phoneMain && phoneHref ? (
              <a href={phoneHref} className="flex items-center gap-2 hover:opacity-100 transition-opacity">
                <Phone className="w-3.5 h-3.5 shrink-0" />
                {phoneMain}
              </a>
            ) : null}
            {emailVal ? (
              <a href={`mailto:${emailVal}`} className="flex items-center gap-2 hover:opacity-100 transition-opacity">
                <Mail className="w-3.5 h-3.5 shrink-0" />
                {emailVal}
              </a>
            ) : null}
            {addressVal ? (
              <div className="flex items-start gap-2">
                <MapPin className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                {mapsUrl ? (
                  <a
                    href={mapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:opacity-100 transition-opacity underline-offset-2 hover:underline"
                  >
                    {addressVal}
                  </a>
                ) : (
                  <span>{addressVal}</span>
                )}
              </div>
            ) : null}
            {showHours ? (
              <div className="flex items-start gap-2">
                <Clock className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                <div>
                  {hourLines.map((line, i) => (
                    <p key={`${line}-${i}`}>{line}</p>
                  ))}
                </div>
              </div>
            ) : null}
          </div>

          {socials.length > 0 ? (
          <div className="flex items-center gap-2 mt-4">
            {socials.map((s) => (
              <a
                key={s.label}
                href={s.href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={s.label}
                className="w-8 h-8 rounded-lg bg-primary-foreground/10 flex items-center justify-center hover:bg-primary hover:text-primary-foreground transition-colors"
              >
                {typeof s.icon === 'function' && s.icon.length === 0
                  ? <s.icon />
                  : <s.icon className="w-3.5 h-3.5" />
                }
              </a>
            ))}
          </div>
          ) : null}
        </div>

        {/* Nav columns */}
        {navColumns.map((col) => (
          <div key={col.title}>
            <h4 className="text-xs font-semibold uppercase tracking-wider opacity-50 mb-3">{col.title}</h4>
            <ul className="space-y-2">
              {col.links.map((l) => (
                <li key={l.label}>
                  <Link to={l.to} className="text-xs opacity-60 hover:opacity-100 transition-opacity">{l.label}</Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {/* Mobile: contacts + accordion */}
      <div className="md:hidden">
        {/* Brand */}
        <Link to="/" className="flex items-center gap-2.5 mb-5">
          <img src="/logo.svg" alt="Live Grid" className="w-8 h-8 object-contain" />
          <span className="font-bold text-sm">Live Grid</span>
        </Link>

        {/* Contacts inline */}
        <div className="flex flex-wrap gap-x-5 gap-y-2 text-xs opacity-70 mb-5">
          {phoneMain && phoneHref ? (
            <a href={phoneHref} className="flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5" /> {phoneMain}
            </a>
          ) : null}
          {emailVal ? (
            <a href={`mailto:${emailVal}`} className="flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5" /> {emailVal}
            </a>
          ) : null}
        </div>

        {/* Accordion */}
        {navColumns.map((col) => (
          <MobileColumn key={col.title} title={col.title} links={col.links} />
        ))}

        {socials.length > 0 ? (
        <div className="flex items-center gap-2 mt-5">
          {socials.map((s) => (
            <a
              key={s.label}
              href={s.href}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={s.label}
              className="w-9 h-9 rounded-lg bg-primary-foreground/10 flex items-center justify-center hover:bg-primary transition-colors"
            >
              {typeof s.icon === 'function' && s.icon.length === 0
                ? <s.icon />
                : <s.icon className="w-4 h-4" />
              }
            </a>
          ))}
        </div>
        ) : null}
      </div>
    </div>

    {/* LEVEL 3 — Legal */}
    <div className="border-t border-primary-foreground/10">
      <div className="max-w-[1400px] mx-auto px-4 py-5 sm:py-6">
        {/* Legal links */}
        <div className="flex flex-wrap gap-x-4 gap-y-1.5 mb-3">
          {legalLinks.map((l) => (
            <Link
              key={l.label}
              to={l.to}
              className="text-[10px] sm:text-[11px] opacity-40 hover:opacity-70 transition-opacity"
            >
              {l.label}
            </Link>
          ))}
        </div>

        {/* Company details */}
        {companyLine || addressVal ? (
          <p className="text-[10px] sm:text-[11px] opacity-30 leading-relaxed mb-2">
            {[companyLine, addressVal].filter(Boolean).join(' · ')}
          </p>
        ) : null}

        {/* Copyright */}
        <p className="text-[10px] sm:text-[11px] opacity-40">
          © {copyrightYear} LiveGrid. Все права защищены.
        </p>
      </div>
    </div>
  </footer>
  );
});

FooterSection.displayName = 'FooterSection';

export default FooterSection;
