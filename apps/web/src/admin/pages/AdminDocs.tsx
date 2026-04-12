import { useState, useMemo } from 'react';
import { Copy, Check, BookOpen, RefreshCw } from 'lucide-react';

const generateDocs = () => {
  const now = new Date().toLocaleString('ru-RU');
  
  return `# Документация проекта Live Grid
Обновлено: ${now}

## Обзор
Live Grid — премиальная платформа по недвижимости. Веб-приложение на React + Vite + TypeScript + Tailwind CSS с shadcn/ui компонентами и framer-motion анимациями. Состояние управляется через Zustand.

## Технологический стек
- **Frontend**: React 18, TypeScript, Vite
- **Стили**: Tailwind CSS 3 + shadcn/ui
- **Роутинг**: React Router DOM 6
- **Анимации**: Framer Motion
- **Стейт**: Zustand (localStorage persistence)
- **Запросы**: TanStack React Query
- **DnD**: @dnd-kit (admin editor)
- **Графики**: Recharts

## Дизайн-система (index.css)
\`\`\`
Цвета (HSL):
--background: 0 0% 100%
--foreground: 222 47% 11%
--primary: 206 89% 60% (основной голубой)
--secondary: 220 25% 97%
--muted: 220 20% 96%
--accent: 206 100% 96%
--destructive: 0 84% 60%
--border: 220 15% 91%
--radius: 0.75rem

Темная тема:
--background: 222 47% 6%
--foreground: 210 40% 98%
--primary: 206 89% 60%
--secondary: 217 33% 17%
--muted: 217 33% 17%
\`\`\`

## Структура проекта

### Маршруты (App.tsx)
\`\`\`
/ — Главная (RedesignIndex)
/catalog — Каталог ЖК (RedesignCatalog)
/complex/:slug — Страница ЖК (RedesignComplex)
/apartment/:id — Страница квартиры (RedesignApartment)
/map — Поиск на карте (RedesignMap)
/layouts/:complex — Планировки ЖК (RedesignLayouts)

/old — Старая главная
/old/catalog — Старый каталог
/old/catalog-zhk — Каталог ЖК (старый)
/old/zhk/:slug — Детали ЖК (старый)
/old/object/:slug — Детали объекта (старый)
/old/news — Новости (старый)
/old/news/:slug — Новость (старый)

/login — Вход
/register — Регистрация
/forgot-password — Сброс пароля
/reset-password — Новый пароль

/admin — Дашборд админки
/admin/pages — Управление страницами
/admin/page-editor/:slug — Редактор контент-страниц
/admin/editor/:pageId — Визуальный конструктор
/admin/regions — Регионы: правка, ручное добавление, удаление пустых (БД не ограничена только фидом)
/admin/homepage — Главная: горячие, старт продаж, новости
/admin/media — Медиафайлы
/admin/users — Пользователи
/admin/tokens — Дизайн-токены
/admin/settings — Настройки сайта (в т.ч. Telegram: токен, chat id, username для Login — из БД, не из .env)
/admin/docs — Документация (эта страница)
\`\`\`

### Компоненты публичного сайта
\`\`\`
src/components/
├── Header.tsx — Шапка (старый дизайн)
├── HeroSection.tsx — Главный баннер
├── AboutPlatform.tsx — Блок "О платформе" (2 колонки: карточки + текст + статистика)
├── AdditionalFeatures.tsx — Доп. преимущества
├── CategoryTiles.tsx — Плитка категорий
├── PropertyGridSection.tsx — Сетка объектов
├── PropertyCard.tsx — Карточка объекта
├── NewListings.tsx — Новые объявления
├── QuizSection.tsx — Квиз подбора
├── LatestNews.tsx — Последние новости
├── ContactsSection.tsx — Контакты
├── FooterSection.tsx — Футер
├── FiltersOverlay.tsx — Оверлей фильтров
├── BurgerMenu.tsx — Мобильное меню
├── NavLink.tsx — Навигационная ссылка
├── ScrollToTop.tsx — Скролл наверх при смене роута
├── CatalogZhk.tsx — Каталог ЖК (старый)
├── ZhkCard.tsx — Карточка ЖК (старая)
\`\`\`

### Redesign компоненты (основные)
\`\`\`
src/redesign/components/
├── RedesignHeader.tsx — Шапка с живым поиском и мобильной навигацией
├── ComplexCard.tsx — Карточка ЖК (grid/list варианты)
├── ComplexHero.tsx — Герой страницы ЖК
├── FilterSidebar.tsx — Боковая панель фильтров (collapsible, теги, drawer mobile)
├── ApartmentTable.tsx — Таблица квартир (сортировка, пагинация)
├── Chessboard.tsx — Шахматка (этажи × секции, статусы)
├── LayoutGrid.tsx — Сетка планировок
├── MapSearch.tsx — Карта с маркерами ЖК (Yandex Maps)
\`\`\`

### Redesign страницы
\`\`\`
src/redesign/pages/
├── RedesignIndex.tsx — Главная: поиск, быстрые фильтры, карточки ЖК, секции
├── RedesignCatalog.tsx — Каталог: фильтры + grid/list/map переключение
├── RedesignComplex.tsx — ЖК: галерея, табы (квартиры, планировки, шахматка, описание, инфра, карта)
├── RedesignApartment.tsx — Квартира: план, характеристики, CTA
├── RedesignLayouts.tsx — Планировки ЖК
├── RedesignMap.tsx — Полноэкранная карта с боковым списком
\`\`\`

### Модели данных (src/redesign/data/types.ts)
\`\`\`typescript
ResidentialComplex {
  id, slug, name, description, builder, district, subway, subwayDistance,
  address, deadline, status ('building'|'completed'|'planned'),
  priceFrom, priceTo, images, coords, advantages, infrastructure, buildings
}

Building {
  id, complexId, name, floors, sections, deadline, apartments
}

Apartment {
  id, complexId, buildingId, rooms, area, kitchenArea, floor, totalFloors,
  price, pricePerMeter, finishing ('без отделки'|'черновая'|'чистовая'|'под ключ'),
  status ('available'|'reserved'|'sold'), planImage, section
}

LayoutGroup {
  id, complexId, rooms, area, priceFrom, planImage, availableCount
}

CatalogFilters {
  priceMin, priceMax, rooms[], areaMin, areaMax, district[], subway[],
  builder[], finishing[], deadline[], floorMin, floorMax, status[], search
}
\`\`\`

### CMS архитектура (admin)
\`\`\`
Модели: Page → Section → Block
Типы блоков: hero, text, image, gallery, button, cta, features, testimonials, faq, form, video, html, container
Роли: admin, editor, author, viewer
Статусы страниц: draft, published, archived
Хранение: Zustand + localStorage

Stores:
- cms-store.ts — CRUD страниц, медиа, пользователей, ревизий
- content-store.ts — контент секций (hero, about, contacts, features, property_grid, new_listings, footer)
- editor-store.ts — состояние визуального редактора (выделение, viewport, drag)
\`\`\`

### UI компоненты (shadcn/ui)
\`\`\`
Accordion, AlertDialog, Avatar, Badge, Breadcrumb, Button, Calendar,
Card, Carousel, Chart, Checkbox, Collapsible, Command, ContextMenu,
Dialog, Drawer, DropdownMenu, Form, HoverCard, Input, InputOTP,
Label, Menubar, NavigationMenu, Pagination, Popover, Progress,
RadioGroup, Resizable, ScrollArea, Select, Separator, Sheet,
Sidebar, Skeleton, Slider, Sonner, Switch, Table, Tabs, Textarea,
Toast, Toggle, ToggleGroup, Tooltip
\`\`\`

## Авторизация (API)
- \`POST /api/v1/auth/login\` — email и пароль
- \`GET /api/v1/auth/telegram-widget-config\` — поле \`botUsername\` для Telegram Login Widget (из настроек, без секрета)
- \`POST /api/v1/auth/telegram\` — JSON с полями виджета (\`id\`, \`auth_date\`, \`hash\`, …); подпись проверяется токеном \`telegram_bot_token\` из админки
- \`POST /api/v1/auth/link-telegram\` (Bearer) — то же тело, что от виджета: привязка Telegram к текущему пользователю; «пустой» TG-аккаунт без email объединяется (избранное переносится)
- \`POST /api/v1/auth/link-email\` (Bearer) — \`{ email, password }\` для аккаунта без email (например после входа через Telegram)
- В @BotFather для бота: команда привязки домена сайта (HTTPS), иначе виджет не откроется на проде

## Текущее состояние
- ✅ Главная страница с динамическим контентом из CMS
- ✅ Каталог ЖК с фильтрами и 3 режимами (grid/list/map)
- ✅ Страница ЖК с табами (квартиры, планировки, шахматка)
- ✅ Страница квартиры с характеристиками и CTA
- ✅ Карта с маркерами и боковым списком
- ✅ Админ-панель с управлением контентом
- ✅ Визуальный конструктор страниц (drag & drop)
- ✅ Система дизайн-токенов
- ✅ Адаптивный дизайн (mobile/tablet/desktop)
- ⚠️ Данные — mock (нет бэкенда)
- ⚠️ Авторизация — только UI (нет реальной аутентификации)
- ⚠️ Карта — зависит от Yandex Maps API

## Правила для промптов
1. НЕ менять глобальные стили (index.css, tailwind.config.ts)
2. НЕ добавлять новые цвета — использовать существующие токены
3. НЕ менять архитектуру роутинга без необходимости
4. Использовать shadcn/ui компоненты где возможно
5. Все цвета через CSS переменные (bg-primary, text-foreground и т.д.)
6. Адаптивность обязательна (mobile-first)
7. Анимации через framer-motion
8. Состояние через Zustand stores
`;
};

export default function AdminDocs() {
  const [copied, setCopied] = useState(false);
  const docs = useMemo(() => generateDocs(), []);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(docs);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
      const ta = document.createElement('textarea');
      ta.value = docs;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="p-6 max-w-5xl">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <BookOpen className="w-6 h-6 text-primary" />
          <h1 className="text-2xl font-bold">Документация проекта</h1>
        </div>
        <button
          onClick={handleCopy}
          className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          {copied ? 'Скопировано!' : 'Копировать всё'}
        </button>
      </div>

      <p className="text-sm text-muted-foreground mb-4">
        Скопируй документацию и вставь в ChatGPT как контекст для написания промптов.
      </p>

      <div className="bg-background border rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/30">
          <span className="text-xs font-medium text-muted-foreground">Markdown</span>
          <button
            onClick={handleCopy}
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? 'Готово' : 'Копировать'}
          </button>
        </div>
        <pre className="p-5 text-sm leading-relaxed overflow-auto max-h-[70vh] whitespace-pre-wrap font-mono text-foreground/90">
          {docs}
        </pre>
      </div>
    </div>
  );
}
