# LiveGrid (lg) — План реализации проекта

> Документ создан: 2026-04-11
> Сервер: 85.198.64.93 | Домен: lg.livegrid.ru (SSL LE)
> Репозиторий фронтенда: https://github.com/Neeklo1606/strict-template

---

## Содержание

1. [Обзор проекта](#1-обзор-проекта)
2. [Инфраструктура (текущее состояние)](#2-инфраструктура-текущее-состояние)
3. [Источники данных — TrendAgent Feed](#3-источники-данных--trendagent-feed)
4. [Технологический стек](#4-технологический-стек)
5. [Архитектура системы](#5-архитектура-системы)
6. [Структура монорепозитория](#6-структура-монорепозитория)
7. [Проектирование базы данных](#7-проектирование-базы-данных)
8. [Backend API — модули и эндпоинты](#8-backend-api--модули-и-эндпоинты)
9. [Импорт фидов — процесс и pipeline](#9-импорт-фидов--процесс-и-pipeline)
10. [Административная панель — CRM-система](#10-административная-панель--crm-система)
11. [Публичный сайт (фронтенд)](#11-публичный-сайт-фронтенд)
12. [Безопасность и роли](#12-безопасность-и-роли)
13. [Этапы реализации (roadmap)](#13-этапы-реализации-roadmap)
14. [Приложение A — Маппинг полей фида → БД](#приложение-a--маппинг-полей-фида--бд)
15. [Приложение B — Статистика фида MSK](#приложение-b--статистика-фида-msk)
16. [Приложение C — Анализ ТЗ LIVEGRID.RU (полное)](#приложение-c--анализ-тз-livegridru-полное)

---

## 1. Обзор проекта

**LiveGrid (lg)** — платформа агрегации и управления объектами недвижимости.

### Ключевые требования

- Автоматический импорт данных из фидов TrendAgent (JSON, обновление раз в неделю).
- Ручное добавление / редактирование / удаление объектов через административную панель.
- Расширяемость типов объектов: **ЖК, квартиры, дома, участки, коммерция** (+ паркинги).
- Расширяемость регионов: МСК, далее СПБ, КРД и др. + **Белгород** (ручной ввод).
- Удобная фильтрация по любым свойствам объектов.
- В административной панели **нет JSON-полей** для пользователей — только типизированные формы.
- **19 публичных страниц**, включая каталоги по типам, карту, сравнение, избранное, ипотеку, презентации.
- **Авторизация пользователей** (клиент / агент) + Telegram Login.
- **Система заявок** (формы → БД + Telegram-бот уведомления).
- **Telegram-бот** для поиска и каталога.
- **Парсер новостей** из Telegram-каналов / RSS.
- **Дедлайн финальной сдачи: 17.04.2026** (по ТЗ v1.0 от 07.04.2026).

---

## 2. Инфраструктура (текущее состояние)

| Компонент | Значение |
|-----------|---------|
| Сервер | Ubuntu 22.04, 85.198.64.93 |
| Web-сервер | nginx 1.24 |
| PHP | 8.2-fpm (для существующих проектов; для lg не используется) |
| Домен | `lg.livegrid.ru` → SSL Let's Encrypt (до 2026-07-10, webroot auto-renew) |
| Каталог проекта | `/var/www/lg/` |
| Хранилище фидов | `/var/www/lg/storage/trendagent/msk/` |
| Скрипт загрузки | `/var/www/lg/scripts/trendagent-fetch-msk.sh` |
| Соседние проекты | `livegrid.ru`, `dev.livegrid.ru` — **не затронуты**, отдельные vhost и сертификаты |

### Что нужно установить на сервер

- Node.js 22 LTS (через nvm или nodesource)
- PostgreSQL 16
- Redis 7
- pnpm (глобально)
- PM2 или systemd-сервисы для Node-приложения

---

## 3. Источники данных — TrendAgent Feed

### 3.1. Доступ

Доступ по **белому списку IP** на сервере TrendAgent (`dataout.trendagent.ru`).

| Регион | URL | Статус |
|--------|-----|--------|
| **МСК** | `https://dataout.trendagent.ru/msk/about.json` | **200** — доступ открыт |
| СПБ | `https://dataout.trendagent.ru/spb/about.json` | 403 — ожидает согласования |
| КРД | `https://dataout.trendagent.ru/krasnodar/about.json` | 403 |
| НСК | `https://dataout.trendagent.ru/nsk/about.json` | 403 |
| РСТ | `https://dataout.trendagent.ru/rostov/about.json` | 403 |
| КЗН | `https://dataout.trendagent.ru/kzn/about.json` | 403 |
| ЕКБ | `https://dataout.trendagent.ru/ekb/about.json` | 403 |
| Крым | `https://dataout.trendagent.ru/crimea/about.json` | 403 |

### 3.2. Структура фида (MSK, актуальные данные от 2026-04-06)

Корневой файл `about.json` — массив сущностей с полем `url` на отдельный JSON-файл.

| Файл фида | Описание | Записей (MSK) | Ключи первого объекта |
|-----------|----------|---------------|----------------------|
| `blocks.json` | Жилые комплексы | **1 308** | `_id, address, crm_id, description, district, geometry, name, plan, renderer, subway` |
| `buildings.json` | Корпуса | **9 341** | `_id, address, block_id, building_type, crm_id, deadline, deadline_key, geometry, name, queue, subsidy` |
| `apartments.json` | Квартиры | **61 899** | см. Приложение A (41 поле) |
| `builders.json` | Застройщики | **563** | `_id, crm_id, name` |
| `regions.json` | Районы | **181** | `_id, crm_id, name` |
| `subways.json` | Метро | **447** | `_id, crm_id, name` |
| `rooms.json` | Комнатность | **28** | `_id, crm_id, name` |
| `finishings.json` | Отделка | **7** | `_id, crm_id, name` |
| `buildingtypes.json` | Технология строительства | **11** | `_id, crm_id, name` |

### 3.3. Частота обновления

Фид обновляется **раз в неделю — по понедельникам** (согласно документации ТА).

**Cron-задача на сервере** — загрузка по **вторникам в 06:00 MSK** (03:00 UTC), чтобы фид гарантированно успел обновиться:

```
# /var/spool/cron/crontabs/root
0 3 * * 2 /var/www/lg/scripts/trendagent-fetch-msk.sh >> /var/log/lg-feed-import.log 2>&1
```

**Ручное обновление**: через кнопку в админ-панели → `POST /api/v1/admin/feed-import/trigger` → BullMQ job (тот же pipeline, что и cron).

---

## 4. Технологический стек

| Слой | Технология | Обоснование |
|------|-----------|-------------|
| **База данных** | PostgreSQL 16 | Реляционная модель для связей ЖК→корпус→квартира, JSONB для гибкости, GIN-индексы, PostGIS при необходимости |
| **ORM / миграции** | Prisma | Типобезопасность, автогенерация типов для TS, удобные миграции |
| **Backend** | NestJS (Node.js 22) | Модульность, Swagger/OpenAPI из коробки, guards/pipes, интеграция с BullMQ |
| **Очереди** | Redis + BullMQ | Фоновый импорт фидов, пересчёт витрин |
| **Фронтенд (сайт)** | Vite + React + TypeScript + Tailwind + shadcn/ui | Из strict-template |
| **Админка** | Vite + React + TypeScript + shadcn/ui + Refine (опционально) | Единый дизайн-стек, CRUD без JSON-полей |
| **API-контракт** | OpenAPI 3.1 → сгенерированный клиент (orval / openapi-typescript) | Типы фронтенда всегда совпадают с бэком |
| **Аутентификация** | JWT (access + refresh) | Достаточно для MVP; позже — OIDC |
| **Файлы/медиа** | S3-совместимое (MinIO self-host или облако) | В БД только URL/key, загрузка через API |
| **Процесс-менеджер** | PM2 или systemd | Запуск API, worker-ов |

---

## 5. Архитектура системы

```
┌─────────────────┐     ┌─────────────────┐
│  Публичный сайт │     │   Админ-панель   │
│  (React SPA)    │     │   (React SPA)    │
│  lg.livegrid.ru │     │  admin.lg.*      │
└────────┬────────┘     └────────┬────────┘
         │  REST / OpenAPI       │  REST / OpenAPI
         └──────────┬────────────┘
                    │
              ┌─────┴─────┐
              │  NestJS    │
              │  API       │
              │  /api/v1/* │
              └─────┬──────┘
                    │
         ┌──────────┼──────────┐
         │          │          │
    ┌────┴────┐ ┌───┴───┐ ┌───┴────┐
    │PostgreSQL│ │ Redis │ │ MinIO  │
    │  (БД)   │ │(очер.)│ │(файлы) │
    └─────────┘ └───┬───┘ └────────┘
                    │
              ┌─────┴─────┐
              │  BullMQ    │
              │  Workers   │
              │ (импорт    │
              │  фидов)    │
              └─────┬──────┘
                    │ HTTPS
         ┌──────────┴──────────┐
         │ dataout.trendagent  │
         │     .ru/msk/*       │
         └─────────────────────┘
```

### Принцип разделения

- **API** — единая точка входа для обоих фронтендов.
- **Workers** — отдельные процессы, работают с очередями Redis; импорт фидов, тяжёлые пересчёты.
- **Админка** — CRM-система (SPA), авторизация JWT, роли `admin`, `editor`, `manager` (см. раздел 12).
- **Публичный сайт** — каталог + ЛК (авторизация для `client`/`agent`): избранное, заявки, подборки.

---

## 6. Структура монорепозитория

```
lg/
├── apps/
│   ├── api/                          # NestJS backend
│   │   ├── src/
│   │   │   ├── main.ts
│   │   │   ├── app.module.ts
│   │   │   ├── common/              # guards, pipes, filters, interceptors
│   │   │   │   ├── guards/
│   │   │   │   ├── pipes/
│   │   │   │   ├── filters/
│   │   │   │   ├── decorators/
│   │   │   │   └── dto/             # PaginationDto, SortDto, FilterDto
│   │   │   ├── config/              # env validation, database config
│   │   │   └── modules/
│   │   │       ├── auth/            # JWT login, refresh, register
│   │   │       ├── users/           # CRUD пользователей
│   │   │       ├── regions/         # feed_regions + districts
│   │   │       ├── builders/        # застройщики
│   │   │       ├── blocks/          # ЖК
│   │   │       ├── buildings/       # корпуса
│   │   │       ├── subways/         # метро
│   │   │       ├── reference/       # room_types, finishings, building_types
│   │   │       ├── listings/        # ФАСАД: apartments, parking, land, commercial, house
│   │   │       │   ├── apartments/
│   │   │       │   ├── parking/     # (Phase 2)
│   │   │       │   ├── land/        # (Phase 2)
│   │   │       │   ├── commercial/  # (Phase 2)
│   │   │       │   └── houses/      # (Phase 2)
│   │   │       ├── feed-import/     # импорт фидов: jobs, processors
│   │   │       ├── media/           # загрузка / управление файлами
│   │   │       └── audit/           # журнал действий
│   │   ├── test/
│   │   ├── nest-cli.json
│   │   └── package.json
│   │
│   ├── web/                          # Публичный сайт (strict-template)
│   │   ├── src/
│   │   │   ├── components/
│   │   │   ├── pages/
│   │   │   ├── hooks/
│   │   │   ├── lib/
│   │   │   │   └── api-client.ts    # сгенерирован из OpenAPI
│   │   │   └── App.tsx
│   │   ├── public/
│   │   ├── index.html
│   │   ├── vite.config.ts
│   │   └── package.json
│   │
│   └── admin/                        # CRM-админка (на базе strict-template)
│       ├── src/
│       │   ├── components/
│       │   │   ├── layout/          # AdminLayout, AdminHeader, NavGroup
│       │   │   ├── data-table/      # DataTable, Toolbar, Pagination, Filters
│       │   │   ├── forms/           # EntityForm, MoneyInput, AreaInput, PhoneInput,
│       │   │   │                    # SearchCombobox, TagInput, ImageUpload,
│       │   │   │                    # MapPicker, RichTextEditor
│       │   │   ├── kanban/          # KanbanBoard, KanbanColumn, KanbanCard
│       │   │   ├── stats/           # StatCard, SparklineChart, StatusBadge
│       │   │   └── common/          # ConfirmDialog, PageHeader, EmptyState
│       │   ├── modules/
│       │   │   ├── dashboard/       # KPI, графики, быстрые действия
│       │   │   ├── blocks/          # CRUD ЖК (6 табов)
│       │   │   ├── buildings/       # CRUD корпусов
│       │   │   ├── listings/        # CRUD объектов (табы по kind)
│       │   │   ├── builders/        # CRUD застройщиков
│       │   │   ├── requests/        # CRM-воронка: канбан + таблица
│       │   │   ├── content/         # CMS: редактор блоков страниц
│       │   │   ├── navigation/      # Управление меню (дерево)
│       │   │   ├── banks/           # Ипотечные банки
│       │   │   ├── news/            # CRUD новостей (RichTextEditor)
│       │   │   ├── feed-import/     # История + кнопка запуска + прогресс
│       │   │   ├── reference/       # Справочники (табы)
│       │   │   ├── static-pages/    # Статические страницы
│       │   │   ├── users/           # CRUD пользователей + роли
│       │   │   ├── audit-log/       # Журнал действий (read-only)
│       │   │   └── settings/        # Настройки сайта (site_settings)
│       │   ├── lib/
│       │   │   ├── api-client.ts    # сгенерирован из OpenAPI (orval)
│       │   │   └── permissions.ts   # ROLE_HIERARCHY, canAccess()
│       │   ├── hooks/
│       │   │   ├── useAuth.ts       # JWT auth state
│       │   │   └── usePermission.ts # проверка роли текущего пользователя
│       │   └── App.tsx
│       ├── vite.config.ts
│       └── package.json
│
├── packages/
│   ├── database/                     # Prisma schema + миграции
│   │   ├── prisma/
│   │   │   ├── schema.prisma
│   │   │   ├── seed.ts
│   │   │   └── migrations/
│   │   └── package.json
│   │
│   └── shared/                       # общие типы, константы, утилиты
│       ├── src/
│       │   ├── enums/
│       │   │   └── listing-kind.ts  # APARTMENT, PARKING, LAND, COMMERCIAL, HOUSE
│       │   ├── constants/
│       │   └── types/
│       └── package.json
│
├── deploy/                           # nginx конфиги, docker
│   ├── nginx/
│   │   ├── lg.livegrid.ru.ssl.conf
│   │   └── lg.livegrid.ru.http.conf
│   └── docker-compose.yml           # postgres, redis, minio (dev)
│
├── TrendAgent/                       # документация фидов + загруженные данные
│   ├── data/msk/                    # скачанные JSON-файлы
│   ├── scripts/
│   │   ├── trendagent-fetch-msk.sh
│   │   ├── pull-feeds-from-server.ps1
│   │   └── inspect-feeds.py
│   └── *.html                       # документация полей от TA
│
├── docs/                             # проектная документация
│   └── PROJECT_PLAN.md              # этот файл
│
├── pnpm-workspace.yaml
├── package.json
├── turbo.json                        # Turborepo (опционально)
├── .env.example
├── .gitignore
└── README.md
```

---

## 7. Проектирование базы данных

### 7.1. Принципы

1. **Единая БД PostgreSQL**, мультирегион через `region_id` во всех таблицах.
2. **Уникальность внешних сущностей**: составной ключ `(region_id, external_id)` — ID из фида.
3. **Разделение фид/ручное**: поле `data_source` (`FEED` | `MANUAL`) + отдельная таблица `field_overrides` для ручных правок поверх данных из фида.
4. **Расширяемые типы объектов**: базовая таблица `listings` + детальные 1:1 таблицы (`listing_apartments`, `listing_parking`, `listing_land`, `listing_commercial`, `listing_houses`).
5. **Нет EAV как основы**: частые фильтры — нормальные колонки с индексами; редкие — `metadata JSONB` + GIN (пользователи никогда не видят этот JSON).
6. **Аудит**: таблица `audit_events` с полями `entity_type`, `entity_id`, `action`, `old_data`, `new_data`, `user_id`, `timestamp`.

### 7.2. Схема таблиц (полная)

#### Системные и пользовательские

```
users
├── id                  UUID PK
├── email               VARCHAR UNIQUE
├── phone               VARCHAR UNIQUE               -- телефон (основной идентификатор для клиентов)
├── password_hash       VARCHAR                      -- nullable если Telegram-only auth
├── full_name           VARCHAR
├── role                ENUM('admin','editor','manager','agent','client') DEFAULT 'client'
├── telegram_id         BIGINT UNIQUE                -- Telegram user ID для OAuth
├── telegram_username   VARCHAR                      -- @username
├── is_active           BOOLEAN DEFAULT true
├── created_at          TIMESTAMPTZ
└── updated_at          TIMESTAMPTZ

sessions
├── id                  UUID PK
├── user_id             UUID FK → users
├── refresh_token_hash  VARCHAR NOT NULL
├── expires_at          TIMESTAMPTZ
└── created_at          TIMESTAMPTZ
```

#### Регионы и география

```
feed_regions
├── id                  SERIAL PK
├── code                VARCHAR UNIQUE NOT NULL      -- 'msk', 'spb', ...
├── name                VARCHAR NOT NULL             -- 'Москва', 'Санкт-Петербург'
├── base_url            VARCHAR                      -- 'https://dataout.trendagent.ru/msk'
├── is_enabled          BOOLEAN DEFAULT false
├── last_imported_at    TIMESTAMPTZ
├── created_at          TIMESTAMPTZ
└── updated_at          TIMESTAMPTZ

districts
├── id                  SERIAL PK
├── region_id           INT FK → feed_regions
├── external_id         VARCHAR                      -- _id из фида (MongoDB ObjectId)
├── crm_id              INT
├── name                VARCHAR NOT NULL
├── created_at          TIMESTAMPTZ
└── updated_at          TIMESTAMPTZ
└── UNIQUE(region_id, external_id)

subways
├── id                  SERIAL PK
├── region_id           INT FK → feed_regions
├── external_id         VARCHAR
├── crm_id              INT
├── name                VARCHAR NOT NULL
├── created_at          TIMESTAMPTZ
└── updated_at          TIMESTAMPTZ
└── UNIQUE(region_id, external_id)
```

#### Застройщики

```
builders
├── id                  SERIAL PK
├── region_id           INT FK → feed_regions
├── external_id         VARCHAR                      -- _id из фида
├── crm_id              BIGINT
├── name                VARCHAR NOT NULL
├── data_source         ENUM('FEED','MANUAL') DEFAULT 'FEED'
├── created_at          TIMESTAMPTZ
└── updated_at          TIMESTAMPTZ
└── UNIQUE(region_id, external_id)
```

#### Справочники

```
room_types
├── id                  SERIAL PK
├── external_id         VARCHAR
├── crm_id              INT
├── name                VARCHAR NOT NULL             -- 'Студии', '1-к.кв', '2-к.кв', ... (множ. число)
├── name_one            VARCHAR                      -- 'Студия', '1-к.кв' (ед. число, из room.html)
└── UNIQUE(external_id)

finishings
├── id                  SERIAL PK
├── external_id         VARCHAR
├── crm_id              INT
├── name                VARCHAR NOT NULL             -- 'Без отделки', 'Чистовая', ...
└── UNIQUE(external_id)

building_types
├── id                  SERIAL PK
├── external_id         VARCHAR
├── crm_id              INT
├── name                VARCHAR NOT NULL             -- 'Монолитный', 'Панельный', ...
└── UNIQUE(external_id)
```

#### ЖК (блоки)

```
blocks
├── id                  SERIAL PK
├── region_id           INT FK → feed_regions
├── external_id         VARCHAR                      -- _id из фида
├── crm_id              BIGINT
├── slug                VARCHAR UNIQUE NOT NULL       -- URL-slug для /complex/:slug
├── name                VARCHAR NOT NULL
├── description         TEXT                         -- HTML-описание
├── district_id         INT FK → districts           -- район
├── builder_id          INT FK → builders            -- застройщик (для фильтрации)
├── status              ENUM('BUILDING','COMPLETED','PROJECT') -- строится / сдан / проект
├── latitude            DECIMAL(10,8)                -- из geometry.coordinates[1]
├── longitude           DECIMAL(11,8)                -- из geometry.coordinates[0]
├── is_promoted         BOOLEAN DEFAULT false         -- «Популярный ЖК» / «Горячее предложение»
├── sales_start_date    DATE                         -- старт продаж (для блока «Старт продаж»)
├── data_source         ENUM('FEED','MANUAL') DEFAULT 'FEED'
├── created_at          TIMESTAMPTZ
└── updated_at          TIMESTAMPTZ
└── UNIQUE(region_id, external_id)

block_addresses                                       -- ЖК может иметь несколько адресов
├── id                  SERIAL PK
├── block_id            INT FK → blocks
├── address             VARCHAR NOT NULL
└── sort_order          INT DEFAULT 0

block_images                                          -- рендеры и генпланы
├── id                  SERIAL PK
├── block_id            INT FK → blocks
├── url                 VARCHAR NOT NULL
├── kind                ENUM('RENDER','PLAN') NOT NULL
└── sort_order          INT DEFAULT 0

block_subways                                         -- связь ЖК ↔ метро (N:M с доп. полями)
├── id                  SERIAL PK
├── block_id            INT FK → blocks
├── subway_id           INT FK → subways
├── distance_time       INT                          -- минуты
├── distance_type       SMALLINT                     -- 1=пешком, 2=транспортом
└── UNIQUE(block_id, subway_id, distance_type)
```

#### Корпуса (buildings)

```
buildings
├── id                  SERIAL PK
├── region_id           INT FK → feed_regions
├── block_id            INT FK → blocks
├── external_id         VARCHAR
├── crm_id              BIGINT
├── name                VARCHAR                      -- '1', 'корпус A'
├── queue               VARCHAR                      -- очередь строительства
├── building_type_id    INT FK → building_types
├── deadline            DATE                         -- срок сдачи
├── deadline_key        DATE                         -- ключ-дата из фида
├── subsidy             BOOLEAN DEFAULT false
├── latitude            DECIMAL(10,8)                -- центроид полигона
├── longitude           DECIMAL(11,8)
├── data_source         ENUM('FEED','MANUAL') DEFAULT 'FEED'
├── created_at          TIMESTAMPTZ
└── updated_at          TIMESTAMPTZ
└── UNIQUE(region_id, external_id)

building_addresses                                    -- адрес корпуса (street, house, housing)
├── id                  SERIAL PK
├── building_id         INT FK → buildings
├── street              VARCHAR
├── house               VARCHAR
├── housing             VARCHAR
├── street_en           VARCHAR
├── house_en            VARCHAR
└── housing_en          VARCHAR
```

#### Листинги (универсальная таблица объектов)

```
listings
├── id                  SERIAL PK
├── region_id           INT FK → feed_regions
├── kind                ENUM('APARTMENT','PARKING','LAND','COMMERCIAL','HOUSE')
├── block_id            INT FK → blocks              -- nullable (участок может не быть в ЖК)
├── building_id         INT FK → buildings            -- nullable
├── builder_id          INT FK → builders             -- nullable (денормализация для быстрых фильтров)
├── district_id         INT FK → districts            -- денормализация: район из block_district
├── external_id         VARCHAR                      -- _id из фида (для apartments)
├── crm_id              BIGINT                       -- crm_id из фида (block_crm_id для квартир)
├── price               DECIMAL(15,2)                -- цена при 100% оплате
├── price_base          DECIMAL(15,2)                -- базовая цена
├── currency            VARCHAR(3) DEFAULT 'RUB'
├── status              ENUM('ACTIVE','SOLD','RESERVED','DRAFT') DEFAULT 'ACTIVE'
├── data_source         ENUM('FEED','MANUAL') DEFAULT 'FEED'
├── is_published        BOOLEAN DEFAULT true
├── created_at          TIMESTAMPTZ
└── updated_at          TIMESTAMPTZ
└── UNIQUE(region_id, external_id) WHERE external_id IS NOT NULL
```

#### Детали: квартиры (1:1 к listings)

```
listing_apartments
├── listing_id          INT PK FK → listings
├── room_type_id        INT FK → room_types          -- ID комнатности (room / crm_id из фида)
├── finishing_id        INT FK → finishings           -- ID отделки
├── building_type_id    INT FK → building_types       -- ID технологии строительства (из building_type)
├── floor               INT                          -- этаж
├── floors_total        INT                          -- этажей в секции
├── number              VARCHAR                      -- номер квартиры (по ПИБ/БТИ)
├── area_total          DECIMAL(8,2)                 -- общая площадь
├── area_given          DECIMAL(8,2)                 -- приведённая площадь
├── area_rooms_total    DECIMAL(8,2)                 -- жилая площадь
├── area_kitchen        DECIMAL(8,2)                 -- площадь кухни
├── area_balconies      DECIMAL(8,2)                 -- площадь балконов
├── area_rooms_detail   VARCHAR                      -- '12.39+10.05+9.31' (строка, площадь каждой комнаты)
├── ceiling_height      DECIMAL(4,2)                 -- высота потолков (height из фида)
├── wc_count            INT                          -- кол-во санузлов
├── has_mortgage         BOOLEAN                     -- наличие ипотеки (building_mortgage)
├── has_installment      BOOLEAN                     -- рассрочка (building_installment)
├── has_subsidy          BOOLEAN                     -- субсидия (building_subsidy)
├── has_military_mortgage BOOLEAN                    -- военная ипотека (building_voen_mortgage)
├── building_deadline   TIMESTAMPTZ                  -- срок сдачи корпуса (building_deadline)
├── building_name       VARCHAR                      -- название корпуса (building_name)
├── building_queue      VARCHAR                      -- очередь (building_queue)
├── block_address       VARCHAR                      -- адрес ЖК (block_address — денормализация)
├── block_name          VARCHAR                      -- название ЖК (block_name — денормализация)
├── block_is_city       BOOLEAN                      -- ЖК в городе (block_iscity)
├── block_city_id       VARCHAR                      -- ID города (block_city)
└── plan_url            VARCHAR                      -- ссылка на планировку (plan[0])
```

#### Банки и договоры корпуса (денормализация из apartments.json)

```
listing_apartment_banks                               -- building_bank[] из apartments.json
├── id                  SERIAL PK
├── listing_id          INT FK → listing_apartments
└── bank_external_id    VARCHAR NOT NULL              -- ID банка из фида

listing_apartment_contracts                           -- building_contract[] из apartments.json
├── id                  SERIAL PK
├── listing_id          INT FK → listing_apartments
└── contract_external_id VARCHAR NOT NULL             -- ID договора из фида
```

#### Детали: паркинги (Phase 2)

```
listing_parking
├── listing_id          INT PK FK → listings
├── parking_type        ENUM('UNDERGROUND','GROUND','MULTILEVEL')
├── area                DECIMAL(8,2)
├── floor               INT                          -- уровень паркинга
└── number              VARCHAR
```

#### Детали: участки (Phase 2)

```
listing_land
├── listing_id          INT PK FK → listings
├── area_sotki          DECIMAL(10,2)                -- площадь в сотках
├── land_category       VARCHAR                      -- ИЖС, СНТ, ...
├── cadastral_number    VARCHAR
└── has_communications  BOOLEAN
```

#### Детали: коммерция (Phase 2)

```
listing_commercial
├── listing_id          INT PK FK → listings
├── commercial_type     ENUM('OFFICE','RETAIL','WAREHOUSE','RESTAURANT','OTHER')
├── area                DECIMAL(10,2)
├── floor               INT
└── has_separate_entrance BOOLEAN
```

#### Детали: дома (Phase 2)

```
listing_houses
├── listing_id          INT PK FK → listings
├── house_type          ENUM('DETACHED','SEMI','TOWNHOUSE','DUPLEX')
├── area_total          DECIMAL(10,2)
├── area_land           DECIMAL(10,2)                -- участок в сотках
├── floors_count        INT
├── bedrooms            INT
├── bathrooms           INT
├── has_garage           BOOLEAN
└── year_built          INT
```

#### Ручные правки поверх фида

```
field_overrides
├── id                  SERIAL PK
├── entity_type         VARCHAR NOT NULL              -- 'listing', 'block', 'building'
├── entity_id           INT NOT NULL
├── field_name          VARCHAR NOT NULL              -- 'price', 'name', ...
├── value_text          TEXT
├── value_number        DECIMAL
├── value_boolean       BOOLEAN
├── overridden_by       UUID FK → users
├── overridden_at       TIMESTAMPTZ
└── UNIQUE(entity_type, entity_id, field_name)
```

#### Медиа

```
media_files
├── id                  SERIAL PK
├── entity_type         VARCHAR                      -- 'listing', 'block'
├── entity_id           INT
├── kind                ENUM('PHOTO','PLAN','RENDER','DOCUMENT')
├── url                 VARCHAR NOT NULL
├── original_filename   VARCHAR
├── size_bytes          BIGINT
├── sort_order          INT DEFAULT 0
├── uploaded_by         UUID FK → users
├── created_at          TIMESTAMPTZ
└── updated_at          TIMESTAMPTZ
```

#### Импорт фидов

```
import_batches
├── id                  SERIAL PK
├── region_id           INT FK → feed_regions
├── status              ENUM('PENDING','RUNNING','COMPLETED','FAILED')
├── feed_exported_at    TIMESTAMPTZ                  -- exported_at из about.json
├── started_at          TIMESTAMPTZ
├── finished_at         TIMESTAMPTZ
├── stats               JSONB                        -- { blocks_upserted: 1308, ... } (системное)
├── error_message       TEXT
├── triggered_by        UUID FK → users              -- null = cron
└── created_at          TIMESTAMPTZ
```

#### CMS — управляемый контент (не-feed блоки сайта)

```
site_settings
├── id                  SERIAL PK
├── key                 VARCHAR UNIQUE NOT NULL       -- 'company_name', 'phone_main', etc.
├── value               TEXT NOT NULL
├── group_name          VARCHAR NOT NULL              -- 'contacts', 'company', 'social', 'seo'
├── label               VARCHAR NOT NULL              -- Человекочитаемое название для формы
├── field_type          ENUM('TEXT','TEXTAREA','URL','PHONE','EMAIL','IMAGE','BOOLEAN')
├── sort_order          INT DEFAULT 0
├── updated_by          UUID FK → users
├── updated_at          TIMESTAMPTZ
└── created_at          TIMESTAMPTZ
```

Хранит глобальные настройки сайта: телефоны, email, адреса, соцсети, реквизиты и т.д.

```
content_blocks
├── id                  SERIAL PK
├── page_slug           VARCHAR NOT NULL              -- 'home', 'catalog', 'mortgage', etc.
├── block_type          VARCHAR NOT NULL              -- 'hero', 'about', 'features', etc.
├── sort_order          INT DEFAULT 0                 -- порядок блоков на странице
├── is_visible          BOOLEAN DEFAULT true          -- скрыть/показать блок
├── updated_by          UUID FK → users
├── created_at          TIMESTAMPTZ
└── updated_at          TIMESTAMPTZ
└── UNIQUE(page_slug, block_type)

content_block_fields
├── id                  SERIAL PK
├── block_id            INT FK → content_blocks ON DELETE CASCADE
├── field_key           VARCHAR NOT NULL              -- 'title', 'subtitle', 'image_url', ...
├── field_type          ENUM('TEXT','TEXTAREA','RICHTEXT','NUMBER','URL','IMAGE','BOOLEAN','JSON_ARRAY')
├── value_text          TEXT                          -- основное значение
├── value_number        DECIMAL                      -- для числовых
├── value_boolean       BOOLEAN                      -- для toggle
├── sort_order          INT DEFAULT 0
├── label               VARCHAR NOT NULL              -- подпись в форме
├── created_at          TIMESTAMPTZ
└── updated_at          TIMESTAMPTZ
└── UNIQUE(block_id, field_key)
```

Хранит редактируемый контент каждого блока на каждой странице.
Пользователь видит типизированную форму, а не JSON.

```
content_block_items
├── id                  SERIAL PK
├── block_id            INT FK → content_blocks ON DELETE CASCADE
├── collection_key      VARCHAR NOT NULL              -- 'stats', 'tools', 'categories', 'banks', 'nav_columns'
├── sort_order          INT DEFAULT 0
├── created_at          TIMESTAMPTZ
└── updated_at          TIMESTAMPTZ

content_block_item_fields
├── id                  SERIAL PK
├── item_id             INT FK → content_block_items ON DELETE CASCADE
├── field_key           VARCHAR NOT NULL              -- 'title', 'description', 'icon', 'url', 'image'
├── field_type          ENUM('TEXT','TEXTAREA','URL','IMAGE','NUMBER','BOOLEAN')
├── value_text          TEXT
├── value_number        DECIMAL
├── value_boolean       BOOLEAN
├── label               VARCHAR NOT NULL
└── UNIQUE(item_id, field_key)
```

Хранит повторяемые элементы внутри блоков (карточки статистики, инструменты, категории, банки, колонки навигации и т.д.).

```
navigation_menus
├── id                  SERIAL PK
├── location            VARCHAR UNIQUE NOT NULL       -- 'header_main', 'header_catalog', 'footer_col_1', etc.
├── label               VARCHAR NOT NULL              -- 'Главное меню', 'Каталог', 'Футер колонка 1'
├── updated_at          TIMESTAMPTZ

navigation_items
├── id                  SERIAL PK
├── menu_id             INT FK → navigation_menus ON DELETE CASCADE
├── parent_id           INT FK → navigation_items     -- nullable (для подменю)
├── title               VARCHAR NOT NULL
├── url                 VARCHAR NOT NULL
├── icon                VARCHAR                       -- lucide icon name
├── is_external         BOOLEAN DEFAULT false
├── is_visible          BOOLEAN DEFAULT true
├── sort_order          INT DEFAULT 0
├── created_at          TIMESTAMPTZ
└── updated_at          TIMESTAMPTZ

mortgage_banks
├── id                  SERIAL PK
├── name                VARCHAR NOT NULL              -- 'Сбербанк', 'ВТБ', etc.
├── rate_from           DECIMAL(5,2)                  -- ставка от (%)
├── rate_to             DECIMAL(5,2)                  -- ставка до (%)
├── logo_url            VARCHAR                       -- логотип банка
├── url                 VARCHAR                       -- ссылка на сайт банка
├── is_active           BOOLEAN DEFAULT true
├── sort_order          INT DEFAULT 0
├── created_at          TIMESTAMPTZ
└── updated_at          TIMESTAMPTZ
```

#### Аудит

```
audit_events
├── id                  BIGSERIAL PK
├── user_id             UUID FK → users
├── entity_type         VARCHAR NOT NULL
├── entity_id           INT NOT NULL
├── action              ENUM('CREATE','UPDATE','DELETE')
├── old_data            JSONB                        -- системное, не видно в UI
├── new_data            JSONB
├── ip_address          INET
└── created_at          TIMESTAMPTZ
```

### 7.3. Индексы (ключевые)

```sql
-- === listings: общие фильтры ===
CREATE INDEX idx_listings_region_kind       ON listings(region_id, kind);
CREATE INDEX idx_listings_region_price      ON listings(region_id, price);
CREATE INDEX idx_listings_region_district   ON listings(region_id, district_id);
CREATE INDEX idx_listings_block             ON listings(block_id);
CREATE INDEX idx_listings_building          ON listings(building_id);
CREATE INDEX idx_listings_builder           ON listings(builder_id);
CREATE INDEX idx_listings_status            ON listings(status) WHERE status = 'ACTIVE';
CREATE INDEX idx_listings_source            ON listings(data_source);

-- === listing_apartments: все фильтруемые поля ===
CREATE INDEX idx_la_room_type              ON listing_apartments(room_type_id);
CREATE INDEX idx_la_finishing               ON listing_apartments(finishing_id);
CREATE INDEX idx_la_building_type           ON listing_apartments(building_type_id);
CREATE INDEX idx_la_floor                  ON listing_apartments(floor);
CREATE INDEX idx_la_floors_total           ON listing_apartments(floors_total);
CREATE INDEX idx_la_area_total             ON listing_apartments(area_total);
CREATE INDEX idx_la_area_given             ON listing_apartments(area_given);
CREATE INDEX idx_la_area_rooms_total       ON listing_apartments(area_rooms_total);
CREATE INDEX idx_la_area_kitchen           ON listing_apartments(area_kitchen);
CREATE INDEX idx_la_ceiling_height         ON listing_apartments(ceiling_height);
CREATE INDEX idx_la_wc_count               ON listing_apartments(wc_count);
CREATE INDEX idx_la_has_mortgage            ON listing_apartments(has_mortgage) WHERE has_mortgage = true;
CREATE INDEX idx_la_has_installment         ON listing_apartments(has_installment) WHERE has_installment = true;
CREATE INDEX idx_la_has_subsidy             ON listing_apartments(has_subsidy) WHERE has_subsidy = true;
CREATE INDEX idx_la_has_mil_mortgage        ON listing_apartments(has_military_mortgage) WHERE has_military_mortgage = true;
CREATE INDEX idx_la_building_deadline       ON listing_apartments(building_deadline);
CREATE INDEX idx_la_block_is_city           ON listing_apartments(block_is_city);

-- === Связи ===
CREATE INDEX idx_buildings_block           ON buildings(block_id);
CREATE INDEX idx_block_subways_block       ON block_subways(block_id);
CREATE INDEX idx_block_subways_subway      ON block_subways(subway_id);
CREATE INDEX idx_block_subways_time        ON block_subways(distance_time, distance_type);

-- === Внешние ID (для upsert при импорте) ===
CREATE INDEX idx_listings_external         ON listings(region_id, external_id) WHERE external_id IS NOT NULL;

-- === Аудит ===
CREATE INDEX idx_audit_entity              ON audit_events(entity_type, entity_id);
CREATE INDEX idx_audit_user                ON audit_events(user_id);
CREATE INDEX idx_audit_created             ON audit_events(created_at);

-- === CMS ===
CREATE INDEX idx_site_settings_group       ON site_settings(group_name);
CREATE INDEX idx_content_blocks_page       ON content_blocks(page_slug);
CREATE INDEX idx_content_block_fields_block ON content_block_fields(block_id);
CREATE INDEX idx_content_block_items_block ON content_block_items(block_id);
CREATE INDEX idx_nav_items_menu            ON navigation_items(menu_id);
CREATE INDEX idx_nav_items_parent          ON navigation_items(parent_id);
```

---

## 8. Backend API — модули и эндпоинты

### 8.1. Публичные (без авторизации)

| Метод | Путь | Описание |
|-------|------|----------|
| GET | `/api/v1/regions` | Список доступных регионов (feed_regions) |
| GET | `/api/v1/districts` | Районы (по региону) |
| GET | `/api/v1/subways` | Станции метро (по региону) |
| GET | `/api/v1/builders` | Застройщики (по региону) |
| GET | `/api/v1/blocks` | ЖК с фильтрами (регион, район, метро, застройщик, цена) |
| GET | `/api/v1/blocks/:id` | Детали ЖК + корпуса + статистика квартир + метро + рендеры |
| GET | `/api/v1/buildings` | Корпуса (по block_id или фильтры) |
| GET | `/api/v1/listings` | Объекты с фильтрами — **все параметры из 8.3** |
| GET | `/api/v1/listings/:id` | Детали объекта + все связанные данные |
| GET | `/api/v1/reference/room-types` | Справочник комнатности (name, name_one, crm_id) |
| GET | `/api/v1/reference/finishings` | Справочник отделки |
| GET | `/api/v1/reference/building-types` | Справочник технологий строительства |
| GET | `/api/v1/content/settings` | Глобальные настройки сайта (телефоны, адрес, соцсети) |
| GET | `/api/v1/content/page/:slug` | Все блоки страницы с полями и коллекциями |
| GET | `/api/v1/content/navigation/:location` | Меню по location (header, footer) |
| GET | `/api/v1/content/banks` | Список ипотечных банков (для калькулятора) |

### 8.2. Административные (JWT, role-based)

| Метод | Путь | Роли | Описание |
|-------|------|------|----------|
| POST | `/api/v1/auth/login` | * | Авторизация |
| POST | `/api/v1/auth/refresh` | * | Обновление токена |
| GET/POST/PUT/DELETE | `/api/v1/admin/blocks/*` | editor+ | CRUD ЖК |
| GET/POST/PUT/DELETE | `/api/v1/admin/buildings/*` | editor+ | CRUD корпусов |
| GET/POST/PUT/DELETE | `/api/v1/admin/listings/*` | editor+ | CRUD объектов |
| GET/POST/PUT/DELETE | `/api/v1/admin/builders/*` | editor+ | CRUD застройщиков |
| GET/POST/PUT/DELETE | `/api/v1/admin/reference/*` | admin | CRUD справочников |
| GET/POST/PUT/DELETE | `/api/v1/admin/users/*` | admin | Управление пользователями |
| POST | `/api/v1/admin/feed-import/trigger` | admin | Запуск импорта вручную |
| GET | `/api/v1/admin/feed-import/history` | editor+ | История импортов |
| GET | `/api/v1/admin/audit` | admin | Журнал действий |
| POST | `/api/v1/admin/media/upload` | editor+ | Загрузка файлов |
| GET/PUT | `/api/v1/admin/content/settings` | admin | Чтение/обновление настроек сайта |
| GET | `/api/v1/admin/content/pages` | editor+ | Список управляемых страниц |
| GET/PUT | `/api/v1/admin/content/page/:slug` | editor+ | Чтение/обновление блоков страницы |
| POST/PUT/DELETE | `/api/v1/admin/content/page/:slug/block/:type/items` | editor+ | CRUD коллекций в блоке |
| GET/POST/PUT/DELETE | `/api/v1/admin/content/navigation/*` | admin | CRUD меню и пунктов навигации |
| GET/POST/PUT/DELETE | `/api/v1/admin/content/banks/*` | editor+ | CRUD ипотечных банков |

### 8.3. Фильтрация (query параметры для GET /listings)

Все поля из фида доступны для фильтрации. Ни одно поле не теряется.

```
# === Общие ===
?region=msk                           // код региона (feed_regions.code)
&kind=APARTMENT                       // тип объекта
&status=ACTIVE                        // статус
&data_source=FEED                     // источник данных

# === Цена ===
&price_min=5000000                    // цена при 100% оплате ≥
&price_max=15000000                   // цена при 100% оплате ≤
&price_base_min=5000000               // базовая цена ≥
&price_base_max=15000000              // базовая цена ≤

# === Площади (все из фида) ===
&area_total_min=30                    // общая площадь ≥
&area_total_max=80                    // общая площадь ≤
&area_given_min=28                    // приведённая площадь ≥
&area_given_max=75                    // приведённая площадь ≤
&area_rooms_min=20                    // жилая площадь ≥
&area_rooms_max=60                    // жилая площадь ≤
&area_kitchen_min=8                   // кухня ≥
&area_kitchen_max=30                  // кухня ≤

# === Этаж ===
&floor_min=3                          // этаж ≥
&floor_max=20                         // этаж ≤
&floors_total_min=10                  // этажей в секции ≥
&floors_total_max=30                  // этажей в секции ≤
&not_first_floor=true                 // исключить 1 этаж
&not_last_floor=true                  // исключить последний этаж

# === Комнатность и отделка ===
&rooms=0,1,2                          // ID комнатности (несколько через запятую)
&finishing=1,2                        // ID отделки (несколько)

# === Технология строительства ===
&building_type=0,3                    // ID технологии строительства

# === География ===
&block_id=123                         // конкретный ЖК
&builder_id=45                        // застройщик
&district_id=67                       // район
&subway_id=89                         // станция метро
&subway_time_max=15                   // макс. время до метро (мин)
&subway_walk_only=true                // только пешком (distance_type=1)
&is_city=true                         // в городе (block_iscity)

# === Сроки и ипотека ===
&deadline_before=2027-01-01           // срок сдачи до
&deadline_after=2026-01-01            // срок сдачи после
&has_mortgage=true                    // наличие ипотеки
&has_installment=true                 // рассрочка
&has_subsidy=true                     // субсидия
&has_military_mortgage=true           // военная ипотека

# === Доп. параметры квартиры ===
&ceiling_height_min=2.7               // высота потолков ≥
&wc_count_min=2                       // кол-во санузлов ≥

# === Сортировка и пагинация ===
&sort=price_asc                       // price_asc/desc, area_asc/desc, floor_asc/desc, created_desc
&page=1
&per_page=20

# === Поиск по тексту ===
&search=Скай Спутник                  // полнотекстовый по названию ЖК / адресу
```

---

## 9. Импорт фидов — процесс и pipeline

### 9.1. Триггеры

1. **Cron** (основной): каждый **вторник**, 06:00 MSK (03:00 UTC) — shell cron → `/var/www/lg/scripts/trendagent-fetch-msk.sh`.
   После внедрения NestJS — заменяется на **BullMQ repeatable job** внутри API (тот же график).
2. **Ручной (админка)**: кнопка «Запустить импорт» → `POST /api/v1/admin/feed-import/trigger` → BullMQ job.
   - Доступно ролям: `admin`.
   - Перед запуском проверяется, нет ли уже запущенного импорта (`status=RUNNING`).
   - В UI отображается прогресс: скачивание файлов → парсинг → upsert → готово.
   - Результат записывается в `import_batches` с `triggered_by = user_id`.

### 9.2. Pipeline (последовательность шагов)

```
1. CREATE import_batch (status=PENDING)
2. Скачать about.json → проверить exported_at (если не изменилась — skip)
3. UPDATE import_batch (status=RUNNING)
4. Для каждого файла из about.json:
   a. Скачать JSON (curl/fetch с таймаутами и retry)
   b. Валидировать структуру (Zod-схема)
   c. Для справочников (rooms, finishings, buildingtypes, regions, subways, builders):
      → UPSERT по (region_id, external_id)
   d. Для blocks:
      → UPSERT block + sync block_addresses, block_images, block_subways
   e. Для buildings:
      → UPSERT building + sync building_addresses
   f. Для apartments:
      → UPSERT listing (kind=APARTMENT) + listing_apartments
      → Связать FK: block_id, building_id, room_type_id, finishing_id, builder_id
      → Учесть field_overrides: не перезаписывать поля, у которых есть ручные правки
5. Пометить удалённые: объекты из БД, которых нет в фиде → status=SOLD (или soft-delete)
6. UPDATE import_batch (status=COMPLETED, stats={...})
7. При ошибке → status=FAILED, error_message, уведомление super_admin
```

### 9.3. Маппинг external_id

Все `_id` из фида TrendAgent — это MongoDB ObjectId (24-символьная hex-строка).
Хранятся в `external_id VARCHAR(24)`. Уникальность: `(region_id, external_id)`.

### 9.4. Защита ручных данных при импорте

- При UPSERT проверять таблицу `field_overrides`.
- Если для поля есть override — **не перезаписывать** значение из фида.
- Объекты с `data_source=MANUAL` — **не трогать** при импорте.

---

## 10. Административная панель — CRM-система

> Базируется на стеке из `strict-template` (React + shadcn/ui + Tailwind + Zustand).
> Существующая структура `src/admin/` в strict-template — основа layout и навигации.
> Проектируется как полноценная CRM для управления данными недвижимости.

### 10.1. Технологический стек админки

| Компонент | Технология | Обоснование |
|-----------|-----------|-------------|
| Фреймворк | React 18 + TypeScript | Единый стек с публичным сайтом |
| UI-библиотека | shadcn/ui (48 компонентов) | Уже установлена в strict-template |
| Стили | Tailwind CSS + tailwindcss-animate | Из strict-template |
| Состояние | Zustand (глобальное) + React Query (серверное) | Zustand для UI-state, RQ для кэша API |
| Формы | react-hook-form + zod | Типизированная валидация, уже в strict-template |
| Таблицы | TanStack Table (react-table v8) | Сортировка, фильтры, пагинация, выбор строк |
| Rich-text | TipTap | Редактирование описаний, новостей, статических страниц |
| DnD | @dnd-kit | Сортировка фото, блоков (уже в strict-template) |
| Графики | Recharts | Dashboard KPI (уже в strict-template) |
| Роутинг | React Router 6 | Lazy-loading модулей |
| API-клиент | orval (из OpenAPI) + React Query хуки | Типобезопасность, автогенерация |

### 10.2. Layout и навигация

Базируется на `AdminLayout.tsx` из strict-template — коллапсируемый sidebar + outlet.

```
┌─────────────────────────────────────────────────────────────┐
│  LG Admin        🔔 3   👤 Иван (admin)   ⚙️              │
├──────────┬──────────────────────────────────────────────────┤
│          │                                                  │
│ 📊 Сводка│    [Content area — Outlet]                       │
│          │                                                  │
│ 🏠 ЖК   │                                                  │
│ 🏗 Корпус│                                                  │
│ 🏢 Объект│                                                  │
│ 👷 Застр.│                                                  │
│          │                                                  │
│ 📋 Заявки│                                                  │
│ 📰 Новост│                                                  │
│          │                                                  │
│ 📥 Импорт│                                                  │
│ 📚 Справ.│                                                  │
│ 📄 Стран.│                                                  │
│          │                                                  │
│ 👥 Польз.│                                                  │
│ 📝 Журнал│                                                  │
│ ⚙ Настр. │                                                  │
└──────────┴──────────────────────────────────────────────────┘
```

**Группы навигации sidebar:**

| Группа | Пункты | Минимальная роль |
|--------|--------|-----------------|
| Основное | Сводка (Dashboard) | manager |
| Объекты недвижимости | ЖК, Корпуса, Объекты, Застройщики | editor |
| CRM | Заявки | manager |
| Контент | Контент страниц (CMS), Навигация, Новости, Статические страницы, Ипотечные банки | editor |
| Данные | Импорт фидов, Справочники | admin |
| Система | Пользователи, Журнал действий, Настройки сайта | admin |

### 10.3. Принцип: «Нет JSON для пользователя»

Все поля в формах — **типизированные виджеты**:

| Тип данных | Виджет в форме | shadcn-компонент |
|-----------|---------------|-----------------|
| Строка | `<Input>` или `<Textarea>` | `input`, `textarea` |
| Число | `<Input type="number">` с min/max | `input` |
| Деньги | `<Input>` с маской валюты (₽) | `input` + mask |
| Площадь | `<Input type="number">` с суффиксом «м²» | `input` |
| Дата | `<DatePicker>` | `calendar` + `popover` |
| Boolean | `<Switch>` или `<Checkbox>` | `switch`, `checkbox` |
| Enum | `<Select>` с предопределёнными вариантами | `select` |
| FK (связь) | `<Combobox>` с поиском (выбор ЖК, района) | `command` + `popover` |
| Файлы | `<FileUpload>` drag-and-drop + preview | custom + `avatar` |
| Массив строк | `<TagInput>` (несколько адресов) | custom на `badge` + `input` |
| HTML-описание | `<RichTextEditor>` | TipTap |
| Координаты | Карта с маркером (click-to-place) | Yandex Maps / Leaflet |
| Телефон | `<Input>` с маской +7 (___) ___-__-__ | `input-otp` / mask |

### 10.4. Маршруты админки

```
/admin                            → Dashboard
/admin/blocks                     → Список ЖК
/admin/blocks/create              → Создание ЖК
/admin/blocks/:id                 → Редактирование ЖК
/admin/buildings                  → Список корпусов
/admin/buildings/create           → Создание корпуса
/admin/buildings/:id              → Редактирование корпуса
/admin/listings                   → Объекты (с табами по kind)
/admin/listings/create            → Создание объекта (выбор kind)
/admin/listings/:id               → Редактирование объекта
/admin/builders                   → Застройщики
/admin/builders/create            → Создание застройщика
/admin/builders/:id               → Редактирование застройщика
/admin/requests                   → Заявки (CRM-воронка)
/admin/requests/:id               → Детали заявки
/admin/news                       → Новости
/admin/news/create                → Создание новости
/admin/news/:id                   → Редактирование новости
/admin/feed-import                → История импортов + кнопка запуска
/admin/reference                  → Справочники (табы: комнатность, отделка, типы строительства, районы, метро)
/admin/static-pages               → Статические страницы
/admin/static-pages/:slug         → Редактирование страницы
/admin/users                      → Пользователи
/admin/users/create               → Создание пользователя
/admin/users/:id                  → Редактирование пользователя
/admin/content                    → Список управляемых страниц (CMS)
/admin/content/:slug              → Редактор блоков страницы
/admin/content/:slug/block/:type  → Редактор конкретного блока
/admin/navigation                 → Управление меню
/admin/navigation/:location       → Редактор меню (дерево)
/admin/banks                      → Ипотечные банки
/admin/banks/create               → Добавить банк
/admin/banks/:id                  → Редактировать банк
/admin/audit                      → Журнал действий
/admin/settings                   → Настройки сайта (телефоны, адрес, соцсети, реквизиты)
```

### 10.5. Экраны — детализация

#### 10.5.1. Dashboard (Сводка)

KPI-карточки (shadcn `Card` + `Recharts`):

| Карточка | Данные | Визуализация |
|----------|--------|-------------|
| Всего объектов | `count(listings)` по kind | Число + sparkline |
| Активные ЖК | `count(blocks WHERE status='BUILDING')` | Число |
| Заявки сегодня | `count(requests WHERE created_at >= today)` | Число + badge NEW |
| Необработанные заявки | `count(requests WHERE status='NEW')` | Число красным |
| Последний импорт | `import_batches.finished_at` + статус | Дата + badge |
| Объектов по регионам | group by region | Donut chart |
| Динамика цен (7 дней) | средняя цена по дням | Line chart |
| Последние действия | `audit_events` top-5 | Список |

**Быстрые действия:**
- Кнопка «Запустить импорт» (admin)
- Кнопка «Добавить объект» (editor+)
- Ссылка на необработанные заявки

#### 10.5.2. ЖК (blocks) — Список

| Элемент | Реализация |
|---------|-----------|
| Таблица | TanStack Table: колонки — название, регион, район, застройщик, статус, кол-во объектов, дата обновления |
| Поиск | debounced текстовый поиск по `name`, `address` |
| Фильтры | region (select), status (select), district (combobox), builder (combobox), data_source (select) |
| Сортировка | по имени, региону, дате обновления |
| Действия строки | Редактировать, Удалить (dialog confirm), Открыть на сайте (external link) |
| Пакетные действия | Выбор чекбоксами → массовое удаление, смена статуса |
| Кнопка | «+ Создать ЖК» |

#### 10.5.3. ЖК — Форма создания/редактирования

Табы формы (shadcn `Tabs`):

**Таб 1: Основное**
- Название (`Input`, required)
- Slug (`Input`, auto-generate из названия, editable)
- Регион (`Select` из feed_regions)
- Район (`Combobox` с поиском, фильтр по региону)
- Застройщик (`Combobox` с поиском)
- Статус (`Select`: Строится / Сдан / Проект)
- Описание (`RichTextEditor` — TipTap)
- Источник данных (`Badge`: FEED / MANUAL, read-only для FEED)

**Таб 2: Адреса и геолокация**
- Адреса (`TagInput` — добавить/удалить)
- Координаты: карта с маркером (click-to-place) + поля lat/lng
- Промо-флаги: «Популярный ЖК» (`Switch`), «Горячее предложение» (`Switch`)
- Дата старта продаж (`DatePicker`)

**Таб 3: Метро**
- Таблица связей: станция (`Combobox`) + время (мин, `Input number`) + тип (пешком/транспорт, `Select`)
- Кнопка «+ Добавить станцию»
- Inline-удаление строк

**Таб 4: Медиа**
- Рендеры: drag-and-drop загрузка, сортировка (@dnd-kit), превью
- Генпланы: отдельная секция
- Удаление: иконка × на каждом файле

**Таб 5: Корпуса (inline-preview)**
- Read-only таблица корпусов в этом ЖК
- Кнопка «Добавить корпус» → переход на `/admin/buildings/create?block_id=...`

**Таб 6: Объекты (inline-preview)**
- Счётчик: N квартир, цена от X до Y
- Кнопка «Все объекты в этом ЖК» → переход с фильтром

#### 10.5.4. Объекты (listings) — Список

**Табы по типам:** Все | Квартиры | Дома | Участки | Коммерция | Паркинги

Таблица для каждого таба:

| Колонка | Квартиры | Дома | Участки | Коммерция |
|---------|---------|------|---------|-----------|
| ЖК | ✓ | ✓ | — | ✓ |
| Корпус | ✓ | — | — | — |
| Адрес | ✓ | ✓ | ✓ | ✓ |
| Комнатность | ✓ | ✓ (спальни) | — | — |
| Площадь | ✓ (общая) | ✓ (дома+участок) | ✓ (сотки) | ✓ |
| Этаж | ✓ | ✓ (этажей) | — | ✓ |
| Цена | ✓ | ✓ | ✓ | ✓ |
| Статус | ✓ | ✓ | ✓ | ✓ |
| Источник | ✓ | ✓ | ✓ | ✓ |

Фильтры адаптируются под активный таб.

#### 10.5.5. Объекты — Форма создания/редактирования

**Шаг 1:** Выбор типа (`kind`) — `RadioGroup` с иконками (квартира, дом, участок, коммерция, паркинг).
При редактировании `kind` заблокирован.

**Общие поля (все типы):**
- Регион, ЖК (optional), Корпус (optional), Застройщик
- Цена (маска ₽), Базовая цена
- Статус (Active/Sold/Reserved/Draft)
- Источник (FEED/MANUAL) — read-only для FEED

**Поля по типу (динамическая секция):**

*Квартира:*
- Комнатность (`Select` из room_types), Отделка (`Select` из finishings)
- Этаж (`Input number`), Этажей в секции (`Input number`)
- Номер квартиры (`Input`)
- Площади: общая, приведённая, жилая, кухня, балконы (все `Input number` с «м²»)
- Высота потолков (`Input number` с «м»)
- Кол-во санузлов (`Input number`)
- Ипотека, Рассрочка, Субсидия, Военная ипотека (`Switch` каждый)
- Планировка: загрузка изображения или URL
- Тип строительства (`Select` из building_types)
- Срок сдачи корпуса (`DatePicker`)

*Дом:*
- Тип дома (Отдельный / Дуплекс / Таунхаус / Секция)
- Площадь дома, Площадь участка (сотки)
- Этажей, Спален, Санузлов (`Input number` каждый)
- Гараж (`Switch`), Год постройки (`Input number`)

*Участок:*
- Площадь (сотки)
- Категория (ИЖС / СНТ / ДНП)
- Кадастровый номер (`Input`)
- Коммуникации (`Switch`)

*Коммерция:*
- Тип (Офис / Торговля / Склад / Ресторан / Другое)
- Площадь, Этаж (`Input number`)
- Отдельный вход (`Switch`)

**Секция «Ручные правки» (только для объектов из фида):**
- Показывается если `data_source=FEED`
- Список полей с toggle «Переопределить значение из фида»
- При включении — поле становится editable, запись сохраняется в `field_overrides`
- При импорте переопределённые поля не перезаписываются

#### 10.5.6. Заявки (requests) — CRM-воронка

**Три режима отображения:**

1. **Канбан-доска** (по умолчанию):
   ```
   | НОВЫЕ (5)     | В РАБОТЕ (3)   | ЗАВЕРШЕНЫ (8)  | ОТМЕНЕНЫ (1) |
   |───────────────|────────────────|────────────────|──────────────|
   | [Карточка]    | [Карточка]     | [Карточка]     | [Карточка]   |
   | [Карточка]    | [Карточка]     | [Карточка]     |              |
   |               |                |                |              |
   ```
   Drag-and-drop между колонками (@dnd-kit) → смена статуса.

2. **Таблица** — фильтры по статусу, типу, дате, менеджеру. Массовые действия.

3. **Календарь** — заявки на таймлайне (по created_at).

**Карточка заявки (detail):**
- Имя, телефон (click-to-call), email
- Тип заявки (Консультация / Ипотека / Обратный звонок / Подбор / Контакт)
- Привязка: ЖК и/или объект (ссылки)
- Страница-источник (URL)
- Статус (`Select` с подтверждением)
- Назначен менеджеру (`Combobox` из users с ролью manager+)
- Комментарий менеджера (`Textarea`)
- Telegram-уведомление отправлено (`Badge`)
- История изменений (timeline из audit_events)

#### 10.5.7. Импорт фидов

**Секции экрана:**

1. **Статус:** последний импорт — дата, длительность, статистика (upserted/skipped/failed)
2. **Кнопка «Запустить импорт»** (admin) — с подтверждением, показывает прогресс:
   - Прогресс-бар + лог в реальном времени (WebSocket или polling)
   - Файлы: about.json ✅ → apartments.json ⏳ (45%) → ...
3. **Расписание:** текущий cron (read-only) — «Каждый вторник, 06:00 MSK»
4. **История:** таблица `import_batches` — дата, статус, регион, кто запустил, статистика, ошибки

#### 10.5.8. Справочники

Один экран с **табами** (shadcn `Tabs`):

| Таб | Таблица | Поля для редактирования |
|-----|---------|------------------------|
| Комнатность | room_types | name, name_one, crm_id |
| Отделка | finishings | name, crm_id |
| Типы строительства | building_types | name, crm_id |
| Районы | districts | name, region (select), crm_id |
| Метро | subways | name, region (select), crm_id |
| Регионы | feed_regions | code, name, base_url, is_enabled (switch) |

Inline-editing: двойной клик по ячейке → редактирование → Enter/Escape.
Или modal dialog для создания новых записей.

#### 10.5.9. Пользователи

**Таблица:** имя, email, телефон, роль, Telegram, статус (активен/заблокирован), дата регистрации.

**Фильтры:** роль (multi-select), статус, поиск по имени/email/телефону.

**Форма:**
- Имя, Email, Телефон (с маской)
- Роль (`Select`: client / agent / manager / editor / admin)
- Telegram ID, Telegram username (read-only если привязан через OAuth)
- Статус (`Switch`: активен)
- Пароль (только при создании, кнопка «Сбросить пароль»)

**Карточка пользователя:**
- Основные данные + статистика (кол-во заявок, избранных, подборок)
- Для агентов: список опубликованных объявлений
- История действий (последние 20 записей из audit_events)

#### 10.5.10. Новости

**Таблица:** заголовок, источник, дата публикации, опубликована (toggle).
**Форма:** заголовок, тело (TipTap RichTextEditor), изображение (upload), источник, URL оригинала, дата, published (`Switch`).

#### 10.5.11. Статические страницы

**Таблица:** slug, заголовок, дата обновления.
**Форма:** заголовок, slug (read-only), содержимое (TipTap RichTextEditor).

#### 10.5.12. Журнал действий (Audit Log)

Read-only таблица:
- Фильтры: пользователь, тип сущности, действие (CREATE/UPDATE/DELETE), период
- Колонки: дата, пользователь, действие, тип сущности, ID, IP
- Expand row: diff old_data → new_data (подсветка изменений)

#### 10.5.13. Настройки

| Секция | Параметры |
|--------|----------|
| Общие | Название сайта, контакты, адрес, телефоны, email |
| Интеграции | Telegram Bot Token, Telegram notify chat ID, Yandex Maps API key |
| Импорт | Расписание cron (info), макс. допустимый % ошибок при импорте |
| Медиа | Лимит размера файла, допустимые форматы |

### 10.6. Паттерны UI-компонентов (переиспользуемые)

Из анализа strict-template выделены следующие переиспользуемые компоненты:

```
admin/src/components/
├── layout/
│   ├── AdminLayout.tsx           # sidebar + outlet (из strict-template)
│   ├── AdminHeader.tsx           # topbar: уведомления, профиль
│   └── NavGroup.tsx              # группа навигации с иконкой
├── data-table/
│   ├── DataTable.tsx             # универсальная таблица (TanStack Table)
│   ├── DataTableToolbar.tsx      # поиск + фильтры + кнопки действий
│   ├── DataTablePagination.tsx   # пагинация
│   ├── DataTableFacetedFilter.tsx# фасетный фильтр (select с badge-счётчиком)
│   ├── DataTableRowActions.tsx   # dropdown действий строки
│   └── DataTableColumnHeader.tsx # заголовок с сортировкой
├── forms/
│   ├── EntityForm.tsx            # обёртка: react-hook-form + zod + tabs
│   ├── FormSection.tsx           # секция формы с заголовком
│   ├── MoneyInput.tsx            # поле с маской ₽
│   ├── AreaInput.tsx             # поле с суффиксом м²
│   ├── PhoneInput.tsx            # маска +7 (___) ___-__-__
│   ├── SearchCombobox.tsx        # combobox с async-поиском (для FK)
│   ├── TagInput.tsx              # массив строк (адреса)
│   ├── ImageUpload.tsx           # drag-and-drop + preview + сортировка
│   ├── MapPicker.tsx             # карта с маркером для координат
│   └── RichTextEditor.tsx        # TipTap обёртка
├── kanban/
│   ├── KanbanBoard.tsx           # доска с колонками
│   ├── KanbanColumn.tsx          # колонка
│   └── KanbanCard.tsx            # карточка (drag-and-drop)
├── stats/
│   ├── StatCard.tsx              # KPI-карточка
│   ├── SparklineChart.tsx        # мини-график
│   └── StatusBadge.tsx           # цветной badge по статусу
└── common/
    ├── ConfirmDialog.tsx          # подтверждение удаления
    ├── PageHeader.tsx             # заголовок страницы + breadcrumbs + кнопка
    ├── EmptyState.tsx             # пустое состояние списка
    └── ImportProgressModal.tsx    # модалка прогресса импорта
```

### 10.7. Уведомления в реальном времени

- **Toast-уведомления** (sonner, уже в strict-template): успех/ошибка CRUD-операций.
- **Уведомления в header** (bell icon): новые заявки, завершение импорта.
- Реализация: polling каждые 30 сек или WebSocket (Server-Sent Events).
- Бейдж с количеством непрочитанных.

### 10.8. Адаптивность админки

- **Desktop-first** (основной сценарий использования), но корректно на планшете (768px+).
- На мобиле (< 768px): sidebar скрывается, sheet с меню, таблицы переключаются на card-view.
- Формы: одна колонка на мобиле, две на desktop.

### 10.9. CMS — управление контентом сайта (не-feed блоки)

> В strict-template **13+ блоков** содержат захардкоженный контент (моковые данные),
> не связанный с feed TrendAgent. Все они должны редактироваться через админку.

#### 10.9.1. Инвентаризация управляемых блоков

**A. Глобальные настройки (site_settings)**

| Группа | Ключи | Текущие значения в strict-template |
|--------|-------|-----------------------------------|
| `contacts` | `phone_main`, `phone_secondary`, `email`, `address`, `work_hours` | +7 (904) 539-34-34 / +7 (4) 333 44 11 (несогласованы!), info@livegrid.ru |
| `company` | `company_name`, `inn`, `ogrn`, `copyright_year` | ООО «ЛайвГрид», ИНН, ОГРН, © 2026 |
| `social` | `telegram_url`, `vk_url`, `youtube_url`, `ok_url` | Все `href="#"` (заглушки) |
| `seo` | `site_title`, `meta_description`, `og_image` | — |
| `map` | `office_lat`, `office_lng`, `office_title` | Белгород, ул. Примерная / пр-т Славы (несогласованы!) |

**Экран в админке:** Настройки → табы по группам → типизированные поля (PhoneInput, Input, URLInput).

**B. Блоки на страницах (content_blocks + content_block_fields + items)**

| Страница | Блок (block_type) | Редактируемые поля | Коллекции (items) |
|----------|-------------------|--------------------|--------------------|
| `home` | `hero` | title, subtitle, stat_line, location, cta_text, cta_count, search_placeholder, background_image | tabs (label, icon, url) |
| `home` | `popular_zhk` | title, subtitle | — (данные из API: blocks.is_promoted) |
| `home` | `hot_deals` | title | — (данные из API: listings с флагом) |
| `home` | `start_sales` | title | — (данные из API: blocks.sales_start_date) |
| `home` | `quiz` | title, subtitle, success_title, success_text, consent_text | steps (label, options[]), sidebar_bullets (text, icon) |
| `home` | `about` | title, subtitle, body (richtext), image_url, cta_primary_text, cta_primary_url, cta_secondary_text, cta_secondary_url | stats (value, label) |
| `home` | `map_cta` | title, subtitle, cta_text, cta_url, background_image | — |
| `home` | `help_banner` | title, subtitle, cta_text, phone | — |
| `home` | `features` | title | tools (title, description, icon, url) |
| `home` | `latest_news` | title | — (данные из API: news) |
| `home` | `contacts` | title, description | — (из site_settings) |
| `home` | `categories` | title | tiles (label, image_url, url) |
| `home` | `footer` | cta_title, cta_subtitle, cta_button_text, cta_button_url | nav_columns (title, links[]), legal_links (title, url) |
| `mortgage` | `hero` | title, description | — |
| `mortgage` | `calculator` | — (логика на фронте) | — |
| `mortgage` | `banks` | title | — (из mortgage_banks) |
| `catalog` | `filters_title` | title, results_text | — |
| `news` | `header` | title, breadcrumb_label | — |

#### 10.9.2. Экран «Контент страниц» в админке

```
/admin/content                     → Список страниц (home, mortgage, catalog, news...)
/admin/content/:slug               → Редактор блоков страницы
/admin/content/:slug/block/:type   → Редактор конкретного блока
```

**Список страниц:**

| Страница | Slug | Блоков | Последнее изменение |
|----------|------|--------|---------------------|
| Главная | `home` | 12 | 11.04.2026 14:30 |
| Ипотека | `mortgage` | 3 | — |
| Каталог | `catalog` | 1 | — |
| Новости | `news` | 1 | — |

**Редактор блоков страницы:**
- Вертикальный список блоков с drag-and-drop сортировкой (@dnd-kit)
- Каждый блок — карточка: название + toggle видимости (is_visible) + кнопка «Редактировать»
- Кнопка «Добавить блок» (выбор из доступных типов)

**Редактор блока:**
- Автоматически генерируемая форма из `content_block_fields`:
  - `TEXT` → `<Input>`
  - `TEXTAREA` → `<Textarea>`
  - `RICHTEXT` → TipTap RichTextEditor
  - `NUMBER` → `<Input type="number">`
  - `URL` → `<Input>` с валидацией URL
  - `IMAGE` → ImageUpload (drag-and-drop + preview)
  - `BOOLEAN` → `<Switch>`
- Секция «Коллекции» (items): таблица с inline-editing + add/remove/reorder

**Превью:** кнопка «Предпросмотр» — открывает публичную страницу в новом табе с `?preview=true` (контент из черновика).

#### 10.9.3. Экран «Навигация» в админке

```
/admin/navigation                  → Список меню (header_main, header_catalog, footer_col_1...)
/admin/navigation/:location        → Редактор меню: дерево пунктов (drag-and-drop, вложенность)
```

- Пункт меню: title, URL, иконка (lucide), внешняя ссылка (toggle), видимость (toggle)
- Drag-and-drop для сортировки и вложенности (parent_id)
- Inline-editing: двойной клик по пункту → редактирование на месте

#### 10.9.4. Экран «Ипотечные банки» в админке

```
/admin/banks                       → Список банков
/admin/banks/create                → Добавить банк
/admin/banks/:id                   → Редактировать банк
```

Таблица: название, ставка от–до, логотип, активен (toggle), порядок (drag).
Форма: name, rate_from, rate_to, logo (upload), url, is_active, sort_order.

#### 10.9.5. Seed данных при первом запуске

При миграции автоматически создаются записи в `content_blocks` + `content_block_fields` + `content_block_items` с дефолтными значениями из strict-template. Это обеспечивает:
- Сайт работает «из коробки» без ручной настройки
- Все блоки видны в админке сразу
- Администратор меняет конкретные значения через формы

Seed-скрипт (`prisma/seed.ts`) берёт текущие захардкоженные данные из компонентов strict-template и записывает их в БД.

#### 10.9.6. Фронтенд — подключение к CMS

Компоненты на публичном сайте переключаются с inline-данных на API:

```typescript
// До (захардкожено):
const stats = [{ value: '12+', label: 'лет на рынке' }, ...];

// После (из API):
const { data: aboutBlock } = useQuery({
  queryKey: ['content', 'home', 'about'],
  queryFn: () => contentApi.getPageBlock('home', 'about'),
  staleTime: 5 * 60 * 1000, // кэш 5 мин
});
const stats = aboutBlock?.items.filter(i => i.collection_key === 'stats') ?? [];
```

Глобальные настройки загружаются один раз в `App.tsx` через `ContentProvider`:

```typescript
const { data: settings } = useQuery({
  queryKey: ['content', 'settings'],
  queryFn: contentApi.getSettings,
  staleTime: 10 * 60 * 1000,
});
// settings.phone_main, settings.email, settings.address → Header, Footer, Contacts
```

#### 10.9.7. Несогласованности в strict-template (исправляются через CMS)

| Проблема | Где | Решение |
|----------|-----|---------|
| Разные телефоны | Header: +7 (495) 000-00-00, RedesignHeader: +7 (904) 539-34-34, Footer: +7 (4) 333 44 11 | Единый `site_settings.phone_main` |
| Разные адреса | ContactsSection: пр-т Славы, Footer: ул. Примерная | Единый `site_settings.address` |
| Разные счётчики | Hero: 100 000+ / 121 563 / 62 000+ / 58 728 | Из API (`/api/v1/stats/counters`) или `site_settings` |
| Соцсети `href="#"` | Footer, Contacts | `site_settings.telegram_url` и др. |

---

## 11. Публичный сайт (фронтенд)

### Технология

Из strict-template: **Vite + React + TypeScript + Tailwind CSS + shadcn/ui**.

### Ключевые страницы (MVP)

| Страница | Описание |
|----------|---------|
| Главная | Поиск с фильтрами, популярные ЖК |
| Каталог | Список объектов с фильтрами, сортировкой, пагинацией |
| Карточка ЖК | Описание, рендеры, корпуса, список квартир |
| Карточка объекта | Полные данные, планировка, ЖК, корпус |
| Карта | Объекты на карте (Яндекс / Leaflet) |

### Интеграция с API

- Клиент генерируется из OpenAPI (`orval` или `openapi-typescript`).
- React Query (TanStack Query) для кэширования и состояния.

---

## 12. Безопасность и роли

### 12.1. Роли — иерархия

```
admin ──► editor ──► manager ──► agent ──► client ──► guest (анонимный)
  │          │          │          │          │           │
  │          │          │          │          │           └─ просмотр каталога,
  │          │          │          │          │              сравнение (localStorage),
  │          │          │          │          │              отправка заявок (без сохранения)
  │          │          │          │          │
  │          │          │          │          └─ + авторизация, профиль, избранное (БД),
  │          │          │          │             подборки, история заявок
  │          │          │          │
  │          │          │          └─ + публикация своих объявлений (data_source=MANUAL),
  │          │          │             видимость только своих объектов в профиле
  │          │          │
  │          │          └─ + доступ к /admin, просмотр всех данных,
  │          │             обработка заявок (смена статуса, назначение),
  │          │             просмотр dashboard
  │          │
  │          └─ + CRUD: ЖК, корпуса, объекты, застройщики, новости,
  │             ручные правки (field_overrides), загрузка медиа
  │
  └─ + управление пользователями, справочниками, регионами,
     импорт фидов, журнал действий, настройки системы,
     статические страницы
```

### 12.2. Матрица разрешений (полная)

| Ресурс / Действие | guest | client | agent | manager | editor | admin |
|-------------------|-------|--------|-------|---------|--------|-------|
| **Публичный сайт** | | | | | | |
| Просмотр каталога, ЖК, квартир | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Карта, сравнение | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Ипотечный калькулятор | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Отправка заявки | ✅* | ✅ | ✅ | ✅ | ✅ | ✅ |
| Избранное (в БД) | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Подборки | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Профиль / история заявок | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Публикация объявлений | ❌ | ❌ | ✅ | ❌ | ✅ | ✅ |
| **Админ-панель** | | | | | | |
| Доступ к /admin | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ |
| Dashboard (просмотр) | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ |
| Просмотр ЖК/корпусов/объектов | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ |
| CRUD ЖК, корпуса, объекты | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ |
| CRUD застройщики | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ |
| Ручные правки (field_overrides) | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ |
| Загрузка медиа | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ |
| CRUD новости | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ |
| Просмотр заявок | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ |
| Обработка заявок (статус, назначение) | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ |
| CRUD справочники (районы, метро...) | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| CRUD регионы | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| Запуск импорта фидов | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| Просмотр истории импортов | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ |
| CRUD пользователи | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| Назначение ролей | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| Журнал действий | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| Статические страницы | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| Настройки системы | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |

> *guest может отправить заявку (имя + телефон), но она не привязана к user_id.

### 12.3. Реализация ролей в NestJS

```typescript
// packages/shared/src/enums/role.ts
export enum Role {
  GUEST   = 'guest',
  CLIENT  = 'client',
  AGENT   = 'agent',
  MANAGER = 'manager',
  EDITOR  = 'editor',
  ADMIN   = 'admin',
}

// Иерархия: каждая роль включает все права нижестоящих
export const ROLE_HIERARCHY: Record<Role, Role[]> = {
  [Role.ADMIN]:   [Role.ADMIN, Role.EDITOR, Role.MANAGER, Role.AGENT, Role.CLIENT],
  [Role.EDITOR]:  [Role.EDITOR, Role.MANAGER, Role.AGENT, Role.CLIENT],
  [Role.MANAGER]: [Role.MANAGER, Role.AGENT, Role.CLIENT],
  [Role.AGENT]:   [Role.AGENT, Role.CLIENT],
  [Role.CLIENT]:  [Role.CLIENT],
  [Role.GUEST]:   [Role.GUEST],
};
```

**Guards (NestJS):**

```typescript
// @Roles(Role.EDITOR) — декоратор на контроллере/методе
// RolesGuard проверяет: user.role входит в ROLE_HIERARCHY[requiredRole]
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.EDITOR)
@Controller('admin/blocks')
export class AdminBlocksController { ... }
```

### 12.4. Аутентификация

| Параметр | Значение |
|----------|---------|
| Access token | JWT, 15 мин, httpOnly cookie |
| Refresh token | httpOnly cookie, 30 дней, ротация при каждом refresh |
| Telegram Login | OAuth через Telegram Login Widget (web), связывание с существующим аккаунтом |
| Rate limit (login) | 5 попыток / минута (по IP) |
| Rate limit (API) | 100 req/min (guest), 300 req/min (auth) |
| Регистрация | имя, телефон, email, пароль → роль `client` по умолчанию |
| Повышение до agent | Заявка через профиль → ручное подтверждение admin |
| Повышение до manager/editor/admin | Только через админку (admin) |
| Сброс пароля | Email с одноразовой ссылкой (токен, 1 час) |
| Telegram-only аккаунт | password_hash = NULL, авторизация только через TG |

### 12.5. Общие правила безопасности

- **CORS**: `livegrid.ru`, `lg.livegrid.ru`, `admin.lg.livegrid.ru`.
- **Helmet** (NestJS): заголовки безопасности (CSP, X-Frame-Options, HSTS).
- **Валидация**: все входные данные через Zod / class-validator (whitelist: true, forbidNonWhitelisted: true).
- **SQL injection**: невозможна при Prisma (параметризованные запросы).
- **XSS**: sanitize HTML в RichTextEditor перед сохранением (DOMPurify на бэке).
- **CSRF**: не требуется при JWT в httpOnly cookie + SameSite=Strict.
- **Файлы**: проверка MIME-type на сервере, лимит размера (10 МБ по умолчанию), разрешённые форматы: jpg, png, webp, pdf.
- **Аудит**: все мутации (CREATE/UPDATE/DELETE) в админке логируются в `audit_events`.
- **Защищённые маршруты**: `/profile`, `/favorites` → client+; `/admin/*` → manager+.

---

## 13. Этапы реализации (roadmap)

### Phase 0 — Подготовка инфраструктуры (1 неделя)

- [x] Установить на сервер: Node.js 22, PostgreSQL 16, Redis 7, pnpm
- [x] Инициализировать монорепозиторий (pnpm workspaces)
- [x] Настроить `docker-compose.yml` для локальной разработки (Postgres + Redis)
- [x] Создать Prisma schema, первая миграция
- [x] Seed: справочники из фида (rooms, finishings, building_types)
- [x] Настроить CI (опционально: GitHub Actions — lint, typecheck)

### Phase 1 — Backend MVP (2–3 недели)

- [x] NestJS проект: auth module (JWT login/refresh)
- [x] Модули: regions, builders, blocks, buildings, subways, reference
- [ ] Модуль listings/apartments — CRUD + фильтрация + пагинация *(публичные `GET /listings` + фильтры/пагинация; мутаций нет)*
- [x] Модуль feed-import — BullMQ job, полный pipeline для MSK
- [x] Модуль media — загрузка файлов *(реализован `MediaModule` + UI «Медиа» в админке)*
- [x] Модуль audit — логирование действий *(API/сервис; отдельного экрана журнала в админке пока нет)*
- [x] OpenAPI / Swagger документация
- [x] Деплой API на сервер (PM2 / systemd + nginx reverse proxy)

### Phase 2 — Админка MVP (2–3 недели)

- [x] Scaffold admin app (Vite + React + shadcn) *(раздел `/admin` в том же SPA, не отдельное приложение)*
- [x] Авторизация (login, роли, guards)
- [x] Dashboard
- [x] CRUD экраны: ЖК, корпуса, квартиры, застройщики *(ЖК: список + редактор; квартиры: ручные CRUD + админ-статусы/публикация; корпуса/застройщики — CRUD для MANUAL)*
- [x] Справочники (read-only для editor, CRUD для admin) *(admin/reference + UI справочников в админке)*
- [x] Импорт фидов: кнопка запуска, история, логи
- [x] Журнал действий *(реализован UI `/admin/audit` + фильтры и пагинация)*
- [x] Управление пользователями
- [x] Деплой админки (отдельный vhost или path `/admin`)

### Phase 3 — Публичный сайт MVP (2–3 недели)

- [x] Каталог объектов с фильтрами
- [x] Карточка ЖК
- [x] Карточка квартиры
- [x] Главная страница
- [x] Карта (Яндекс Maps / Leaflet)
- [ ] SEO: SSR или pre-rendering (опционально)
- [x] Деплой на `lg.livegrid.ru`

### Phase 4 — Расширение типов объектов (по мере потребности)

- [x] listing_parking + формы
- [x] listing_land + формы
- [x] listing_commercial + формы
- [x] listing_houses + формы
- [x] Обновление фильтров на фронте под новые типы

### Phase 5 — Расширение регионов

- [ ] Согласовать доступ к фидам СПБ, КРД, НСК и др. через менеджера ТА
- [ ] Добавить регионы в `feed_regions`
- [x] Скрипт загрузки → обобщить по `TRENDAGENT_REGION`
- [ ] Проверить импорт для нового региона

### Phase 6 — Оптимизация и масштабирование

- [x] Materialized view для витрины поиска
- [ ] Meilisearch / Elasticsearch для быстрых фасетных фильтров (при необходимости)
- [ ] PostGIS для гео-запросов (радиус, полигон)
- [ ] Кэширование горячих запросов (Redis)
- [ ] Мониторинг (Sentry, Prometheus + Grafana)

---

## Приложение A — Маппинг полей фида → БД

### apartments.json → listings + listing_apartments (все 41 поле)

| # | Поле фида | Таблица.Колонка | Тип в БД | Примечание |
|---|-----------|----------------|---------|-----------|
| 1 | `_id` | `listings.external_id` | VARCHAR(24) | MongoDB ObjectId |
| 2 | `price` | `listings.price` | DECIMAL(15,2) | Цена при 100% оплате |
| 3 | `block_id` | `listings.block_id` | INT FK | Через lookup blocks.external_id |
| 4 | `building_id` | `listings.building_id` | INT FK | Через lookup buildings.external_id |
| 5 | `block_builder` | `listings.builder_id` | INT FK | Через lookup builders.external_id |
| 6 | `block_district` | `listings.district_id` | INT FK | Через lookup districts.external_id |
| 7 | `block_crm_id` | `listings.crm_id` | BIGINT | CRM ID ЖК |
| 8 | `room` | `la.room_type_id` | INT FK | Через lookup room_types.crm_id |
| 9 | `finishing` | `la.finishing_id` | INT FK | Через lookup finishings.external_id |
| 10 | `building_type` | `la.building_type_id` | INT FK | Через lookup building_types.external_id |
| 11 | `floor` | `la.floor` | INT | Этаж |
| 12 | `floors` | `la.floors_total` | INT | Этажей в секции |
| 13 | `number` | `la.number` | VARCHAR | Номер квартиры (по ПИБ/БТИ) |
| 14 | `area_total` | `la.area_total` | DECIMAL(8,2) | Общая площадь |
| 15 | `area_given` | `la.area_given` | DECIMAL(8,2) | Приведённая площадь |
| 16 | `area_rooms_total` | `la.area_rooms_total` | DECIMAL(8,2) | Жилая площадь |
| 17 | `area_kitchen` | `la.area_kitchen` | DECIMAL(8,2) | Площадь кухни |
| 18 | `area_balconies_total` | `la.area_balconies` | DECIMAL(8,2) | Площадь балконов |
| 19 | `area_rooms` | `la.area_rooms_detail` | VARCHAR | '12.39+10.05+9.31' — площадь каждой комнаты |
| 20 | `height` | `la.ceiling_height` | DECIMAL(4,2) | Высота потолков |
| 21 | `wc_count` | `la.wc_count` | INT | Кол-во санузлов |
| 22 | `plan[]` | `la.plan_url` | VARCHAR | Ссылка на планировку (первый элемент) |
| 23 | `building_mortgage` | `la.has_mortgage` | BOOLEAN | Наличие ипотеки |
| 24 | `building_installment` | `la.has_installment` | BOOLEAN | Наличие рассрочки |
| 25 | `building_subsidy` | `la.has_subsidy` | BOOLEAN | Наличие субсидии |
| 26 | `building_voen_mortgage` | `la.has_military_mortgage` | BOOLEAN | Военная ипотека |
| 27 | `building_deadline` | `la.building_deadline` | TIMESTAMPTZ | Срок сдачи корпуса |
| 28 | `building_name` | `la.building_name` | VARCHAR | Название корпуса |
| 29 | `building_queue` | `la.building_queue` | VARCHAR | Очередь корпуса |
| 30 | `block_address` | `la.block_address` | VARCHAR | Адрес ЖК (денормализация) |
| 31 | `block_name` | `la.block_name` | VARCHAR | Название ЖК (денормализация) |
| 32 | `block_builder_name` | — | — | Берётся из builders.name по FK |
| 33 | `block_district_name` | — | — | Берётся из districts.name по FK |
| 34 | `block_iscity` | `la.block_is_city` | BOOLEAN | ЖК в городе или нет |
| 35 | `block_city` | `la.block_city_id` | VARCHAR | ID города (external) |
| 36 | `block_geometry` | — | — | Берётся из blocks.latitude/longitude по FK |
| 37 | `block_renderer` | — | — | Берётся из block_images по FK |
| 38 | `block_subway` | — | — | Берётся из block_subways по FK |
| 39 | `block_subway_name` | — | — | Берётся из subways.name по FK |
| 40 | `building_bank[]` | `listing_apartment_banks` | N строк | ID банков корпуса |
| 41 | `building_contract[]` | `listing_apartment_contracts` | N строк | ID договоров корпуса |

> **la** = `listing_apartments` (сокращение для таблицы).
> Поля 32–39 — **не дублируются** в listing_apartments; вычисляются через JOIN по FK.
> Поля 40–41 — сохраняются в отдельных связных таблицах.
>
> **Примечание:** `price_base` (базовая цена) описан в документации FAQ, но **отсутствует в текущем фиде MSK** (41 поле, price_base нет).
> Колонка `listings.price_base` предусмотрена как nullable — будет заполняться, если ТА добавит это поле в будущих выгрузках или для других регионов.

### Полная сверка: ни одно поле не потеряно

Проверено скриптом `all-keys.py` по всем записям каждого JSON-файла:

| Файл | Уникальных ключей | В маппинге | Пропущено |
|------|-------------------|-----------|-----------|
| apartments.json | 41 | 41 | **0** |
| blocks.json | 10 | 10 | **0** |
| buildings.json | 11 | 11 | **0** |
| builders.json | 3 (_id, name, crm_id) | 3 | **0** |
| regions.json | 3 | 3 | **0** |
| subways.json | 3 | 3 | **0** |
| rooms.json | 3 (+name_one в доке) | 4 | **0** |
| finishings.json | 3 | 3 | **0** |
| buildingtypes.json | 3 | 3 | **0** |

### blocks.json → blocks + block_addresses + block_images + block_subways

| Поле фида | Таблица.Колонка | Примечание |
|-----------|----------------|-----------|
| `_id` | `blocks.external_id` | |
| `crm_id` | `blocks.crm_id` | |
| `name` | `blocks.name` | |
| `description` | `blocks.description` | HTML |
| `district` | `blocks.district_id` | Через lookup districts.external_id |
| `geometry.coordinates[0]` | `blocks.longitude` | |
| `geometry.coordinates[1]` | `blocks.latitude` | |
| `address[]` | `block_addresses` | Массив → N строк |
| `renderer[]` | `block_images (kind=RENDER)` | |
| `plan[]` | `block_images (kind=PLAN)` | |
| `subway[]` | `block_subways` | subway_id + distance_time + distance_type |

### buildings.json → buildings + building_addresses

| Поле фида | Таблица.Колонка | Примечание |
|-----------|----------------|-----------|
| `_id` | `buildings.external_id` | |
| `block_id` | `buildings.block_id` | FK через lookup |
| `crm_id` | `buildings.crm_id` | |
| `name` | `buildings.name` | |
| `queue` | `buildings.queue` | |
| `building_type` | `buildings.building_type_id` | FK через lookup |
| `deadline` | `buildings.deadline` | |
| `deadline_key` | `buildings.deadline_key` | |
| `subsidy` | `buildings.subsidy` | |
| `geometry` | `buildings.latitude/longitude` | Центроид полигона |
| `address.street/house/housing` | `building_addresses` | |

---

## Приложение B — Статистика фида MSK

Данные получены: 2026-04-11, `exported_at: 2026-04-06T05:02:33Z`

| Сущность | Файл | Записей | Размер файла |
|---------|------|---------|-------------|
| Квартиры | apartments.json | **61 899** | 137 МБ |
| ЖК | blocks.json | **1 308** | 4.9 МБ |
| Корпуса | buildings.json | **9 341** | 11.6 МБ |
| Застройщики | builders.json | **563** | 59 КБ |
| Районы | regions.json | **181** | 19 КБ |
| Метро | subways.json | **447** | 48 КБ |
| Комнатность | rooms.json | **28** | 2.5 КБ |
| Отделка | finishings.json | **7** | 722 Б |
| Тех. строительства | buildingtypes.json | **11** | 1.1 КБ |
| **Итого** | | **73 785** | **~154 МБ** |

---

## Приложение C — Анализ ТЗ LIVEGRID.RU (полное)

> Источник: «LIVEGRID.RU — Полное техническое задание», v1.0 от 07.04.2026
> Дедлайн финальной сдачи: **17.04.2026**

### C.1. GAP-анализ: что НЕ было в предыдущем плане

| # | Требование из ТЗ | Статус в плане | Действие |
|---|------------------|---------------|---------|
| 1 | 19 публичных страниц (каталоги по типам, карта, сравнение, презентации, ипотека, ЛК, контакты, политика) | Было 5 MVP-страниц | **Добавлено** → C.2 |
| 2 | Авторизация публичных пользователей (клиент, агент) + Telegram Login | Была только админ-авторизация | **Добавлено** → обновлён раздел 12, таблица users |
| 3 | Избранное: localStorage + синхронизация с БД при входе | Отсутствовало | **Добавлено** → C.3 (таблица `user_favorites`) |
| 4 | Сравнение объектов: до 3, localStorage | Отсутствовало | **Добавлено** → C.2 (страница `/compare`) |
| 5 | Презентации ЖК: web-страница + PDF | Отсутствовало | **Добавлено** → C.2, C.4 |
| 6 | Ипотечный калькулятор | Отсутствовало | **Добавлено** → C.2 |
| 7 | Форма заявок → БД + Telegram-уведомление | Отсутствовало | **Добавлено** → C.3 (таблица `requests`), C.4 |
| 8 | Telegram-бот (поиск, каталог, избранное, уведомления) | Отсутствовало | **Добавлено** → C.5 |
| 9 | Парсер новостей (TG-каналы, RSS) | Отсутствовало | **Добавлено** → C.3 (таблица `news`), C.4 |
| 10 | Белгород: отдельная страница, ручная загрузка, source=manual | Частично (manual data_source) | **Добавлено** → C.2 |
| 11 | Гео-селектор регионов в UI | Отсутствовало | **Добавлено** → C.2 |
| 12 | Full-text поиск (ЖК, район, метро, застройщик, улица) | Частично (параметр `search`) | **Уточнено** → C.4 |
| 13 | Redis-кэш результатов поиска (TTL 60 сек) | Упомянут Redis для очередей | **Добавлено** → C.4 |
| 14 | Slug для ЖК (`/complex/:slug`) | Отсутствовало | **Добавлено** → обновлена таблица `blocks` |
| 15 | URL-фильтры (shareable query string) | Частично | **Уточнено** → C.2 |
| 16 | Профиль пользователя (заявки, избранное, подборки) | Отсутствовало | **Добавлено** → C.2, C.3 |
| 17 | Роль «Агент» — свои объявления | Отсутствовало | **Добавлено** → обновлён раздел 12 |
| 18 | Блоки главной: «Популярные ЖК», «Горячие предложения», «Старт продаж» | Отсутствовало | **Добавлено** → обновлена таблица `blocks`, C.2 |
| 19 | Адаптив: breakpoints 360/768/1280, hamburger-меню, шторка фильтров | Упомянут, не детализирован | **Уточнено** → C.2 |

---

### C.2. Все страницы сайта (19 + доп.)

| # | Route | Название | Ключевые данные / API | Auth |
|---|-------|---------|----------------------|------|
| 1 | `/` | Главная | Счётчик из API, гео-селектор, поисковая строка, «Популярные ЖК» (`blocks.is_promoted`), «Горячие предложения» (`listings` с флагом), «Старт продаж» (`blocks.sales_start_date`), подбор-форма → `requests`, новости → `news`, инструменты | — |
| 2 | `/catalog` | Каталог ЖК | `GET /api/v1/blocks` + все фильтры, пагинация, переключатель список/карта | — |
| 3 | `/catalog/apartments` | Каталог квартир | `GET /api/v1/listings?kind=APARTMENT` + фильтр по ЖК | — |
| 4 | `/catalog/houses` | Каталог домов | `GET /api/v1/listings?kind=HOUSE` | — |
| 5 | `/catalog/land` | Каталог участков | `GET /api/v1/listings?kind=LAND` | — |
| 6 | `/catalog/commercial` | Коммерция | `GET /api/v1/listings?kind=COMMERCIAL` | — |
| 7 | `/belgorod` | Белгород | Те же API, `region=belgorod`, без фильтра «Метро», вкладки: квартиры/комнаты/дома/участки/дачи | — |
| 8 | `/complex/:slug` | Страница ЖК | `GET /api/v1/blocks/:slug` + квартиры внутри ЖК + карта + галерея + ссылка на презентацию | — |
| 9 | `/apartment/:id` | Страница квартиры | `GET /api/v1/listings/:id` + похожие объекты + форма заявки | — |
| 10 | `/presentation/:slug` | Презентация ЖК | Веб-страница + print CSS + кнопка «Скачать PDF» (puppeteer или window.print) | — |
| 11 | `/map` | Карта | Яндекс.Карты / Leaflet, точки ЖК, popup-карточки, фильтры = каталог, синхронизация списка | — |
| 12 | `/mortgage` | Ипотека | Калькулятор (JS): стоимость, взнос, срок, ставка → платёж. Форма заявки → `requests`. Блок банков. | — |
| 13 | `/compare` | Сравнение | До 3 объектов, localStorage. Параметры в строках: цена, площадь, этаж, комнат, отделка, срок, застройщик. | — |
| 14 | `/favorites` | Избранное | `GET /api/v1/favorites`. Без auth → redirect `/login`. Карточки + «Скачать подборку» → презентация. | client+ |
| 15 | `/login` | Вход | Телефон + пароль, Telegram Login Widget, ссылка на регистрацию, «Забыли пароль?» | — |
| 16 | `/register` | Регистрация | Имя, телефон, email, пароль. Роль client по умолчанию. | — |
| 17 | `/profile` | Личный кабинет | Данные профиля, мои заявки (`requests`), избранное, подборки. Агент: мои объявления, добавить объект. | client+ |
| 18 | `/contacts` | Контакты | Адрес, телефоны, email, карта с офисом, форма «Написать нам» → `requests`, соцсети | — |
| 19 | `/privacy` | Политика конфиденциальности | Статический текст (обязательно для Яндекса) | — |

**Адаптив (все страницы):**
- Breakpoints: **360px** (мобильный), **768px** (планшет), **1280px** (десктоп)
- Hamburger-меню на мобиле
- Фильтры: скрыты за кнопкой, открываются шторой снизу
- Карточки: 1 колонка → 2 → 3–4
- Кнопки: min-height 44px
- Горизонтальный скролл отсутствует

**URL-фильтры:** состояние фильтров сохраняется в query string (`?type=apartments&priceMax=10000000`), URL можно скопировать и поделиться.

---

### C.3. Новые таблицы БД (из ТЗ)

#### Заявки (лиды)

```
requests
├── id                  SERIAL PK
├── user_id             UUID FK → users              -- nullable (гость)
├── type                ENUM('CONSULTATION','MORTGAGE','CONTACT','CALLBACK','SELECTION')
├── name                VARCHAR NOT NULL
├── phone               VARCHAR NOT NULL
├── email               VARCHAR
├── comment             TEXT
├── listing_id          INT FK → listings             -- nullable (привязка к объекту)
├── block_id            INT FK → blocks               -- nullable (привязка к ЖК)
├── source_page         VARCHAR                       -- URL страницы, откуда отправлена
├── status              ENUM('NEW','IN_PROGRESS','COMPLETED','CANCELLED') DEFAULT 'NEW'
├── assigned_to         UUID FK → users               -- менеджер
├── telegram_notified   BOOLEAN DEFAULT false
├── created_at          TIMESTAMPTZ
└── updated_at          TIMESTAMPTZ
```

#### Избранное пользователя

```
user_favorites
├── id                  SERIAL PK
├── user_id             UUID FK → users NOT NULL
├── listing_id          INT FK → listings              -- nullable (избранное = квартира)
├── block_id            INT FK → blocks                -- nullable (избранное = ЖК)
├── created_at          TIMESTAMPTZ
└── UNIQUE(user_id, listing_id) WHERE listing_id IS NOT NULL
└── UNIQUE(user_id, block_id) WHERE block_id IS NOT NULL
```

#### Подборки (сохранённые наборы)

```
user_selections
├── id                  SERIAL PK
├── user_id             UUID FK → users NOT NULL
├── title               VARCHAR
├── created_at          TIMESTAMPTZ
└── updated_at          TIMESTAMPTZ

user_selection_items
├── id                  SERIAL PK
├── selection_id        INT FK → user_selections
├── listing_id          INT FK → listings
└── sort_order          INT DEFAULT 0
```

#### Новости

```
news
├── id                  SERIAL PK
├── slug                VARCHAR UNIQUE NOT NULL         -- URL-slug для /news/:slug
├── title               VARCHAR NOT NULL
├── body                TEXT                           -- текст / HTML
├── image_url           VARCHAR
├── source_name         VARCHAR                        -- название TG-канала / RSS
├── source_url          VARCHAR                        -- ссылка на оригинал
├── published_at        TIMESTAMPTZ
├── is_published        BOOLEAN DEFAULT true
├── created_at          TIMESTAMPTZ
└── updated_at          TIMESTAMPTZ
```

#### Статические страницы (контакты, политика и т.д.)

```
static_pages
├── id                  SERIAL PK
├── slug                VARCHAR UNIQUE NOT NULL        -- 'privacy', 'contacts'
├── title               VARCHAR NOT NULL
├── body                TEXT NOT NULL                   -- HTML
├── updated_by          UUID FK → users
├── created_at          TIMESTAMPTZ
└── updated_at          TIMESTAMPTZ
```

#### Индексы (новые таблицы)

```sql
CREATE INDEX idx_requests_status        ON requests(status);
CREATE INDEX idx_requests_user          ON requests(user_id);
CREATE INDEX idx_requests_created       ON requests(created_at);
CREATE INDEX idx_favorites_user         ON user_favorites(user_id);
CREATE INDEX idx_favorites_listing      ON user_favorites(listing_id);
CREATE INDEX idx_news_published         ON news(published_at DESC) WHERE is_published = true;
CREATE INDEX idx_blocks_slug            ON blocks(slug);
CREATE INDEX idx_blocks_promoted        ON blocks(is_promoted) WHERE is_promoted = true;
```

---

### C.4. Новые backend-модули (NestJS)

К существующим модулям из раздела 6 добавляются:

| Модуль | Описание | Ключевые эндпоинты |
|--------|---------|-------------------|
| `auth-public` | Регистрация / логин / Telegram OAuth для пользователей сайта | `POST /auth/register`, `POST /auth/login`, `POST /auth/telegram`, `POST /auth/forgot-password` |
| `requests` | Заявки (лиды) + Telegram-уведомления | `POST /api/v1/requests`, `GET /api/v1/admin/requests` (CRUD) |
| `favorites` | Избранное: CRUD + синхронизация localStorage → БД | `GET/POST/DELETE /api/v1/favorites` |
| `selections` | Подборки пользователя | `GET/POST/PUT/DELETE /api/v1/selections` |
| `news` | CRUD новостей + парсер (BullMQ job) | `GET /api/v1/news`, CRUD в admin |
| `news-parser` | Worker: парсинг TG-каналов / RSS → таблица `news` | Cron: раз в час |
| `presentations` | Генерация web-презентации + PDF (puppeteer) | `GET /api/v1/presentations/:slug`, `GET /api/v1/presentations/:slug/pdf` |
| `mortgage` | Калькулятор + заявка | `POST /api/v1/mortgage/calculate` (расчёт), заявка через `requests` |
| `telegram-bot` | Бот: /start, /search, /catalog, /favorites, /contacts + уведомления о заявках | Отдельный процесс (NestJS microservice или standalone) |
| `search` | Единый SearchService с Redis-кэшем (TTL 60 сек) | `GET /api/v1/search` (full-text по ЖК, район, метро, застройщик, улица) |
| `stats` | Счётчики для главной (кол-во квартир, ЖК) | `GET /api/v1/stats/counters` |
| `static-pages` | Управление статическими страницами | `GET /api/v1/pages/:slug`, CRUD в admin |
| `content` | CMS — управляемые блоки страниц (не-feed контент) | `GET /api/v1/content/page/:slug`, `GET /api/v1/content/settings`, CRUD в admin |
| `navigation` | Управление меню сайта (header, footer) | `GET /api/v1/content/navigation/:location`, CRUD в admin |
| `banks` | Ипотечные банки (для калькулятора) | `GET /api/v1/content/banks`, CRUD в admin |

**Обновлённая структура модулей (apps/api/src/modules/):**

```
modules/
├── auth/                 # JWT + admin login
├── auth-public/          # регистрация/логин сайта + Telegram Login
├── users/
├── regions/
├── builders/
├── blocks/
├── buildings/
├── subways/
├── reference/
├── listings/
│   ├── apartments/
│   ├── houses/
│   ├── land/
│   ├── commercial/
│   └── parking/
├── feed-import/
├── media/
├── audit/
├── requests/             # NEW: заявки + TG-уведомления
├── favorites/            # NEW: избранное
├── selections/           # NEW: подборки
├── news/                 # NEW: новости CRUD
├── news-parser/          # NEW: парсер TG/RSS
├── presentations/        # NEW: презентации + PDF
├── mortgage/             # NEW: калькулятор
├── telegram-bot/         # NEW: Telegram-бот
├── search/               # NEW: full-text + Redis cache
├── stats/                # NEW: счётчики
├── static-pages/         # NEW: статические страницы
├── content/              # NEW: CMS — управляемые блоки страниц
├── navigation/           # NEW: CRUD меню
└── banks/                # NEW: ипотечные банки
```

---

### C.5. Telegram-бот

**Токен**: получить от заказчика (Олег создаёт через BotFather).
**Подключён к тому же API**, что и сайт.

| Команда | Описание |
|---------|---------|
| `/start` | Приветствие + главное меню (inline keyboard) |
| `/search` | Поиск по фильтрам: город → тип → цена → результат |
| `/catalog` | Список ЖК с пагинацией (по 5, кнопки «Далее / Назад») |
| `/favorites` | Избранное (если авторизован через Telegram Login) |
| `/contacts` | Контакты агентства |

**Карточка объекта**: фото + название + цена от + адрес + ссылка на сайт.

**Уведомления о заявках**: все заявки с сайта (`requests`) → отдельный TG-канал/чат команды.
Формат: имя / телефон / тип заявки / объект / ссылка.

**Реализация**: NestJS standalone app или microservice, библиотека `nestjs-telegraf` или `grammy`.

---

### C.6. Парсер данных

#### TrendAgent (автоматический) — уже в плане

- Pipeline из раздела 9 (BullMQ job).
- Cron на сервере: **каждый вторник 06:00 MSK** (03:00 UTC). Фид обновляется по понедельникам — забираем во вторник.
- После внедрения NestJS: cron переносится в BullMQ repeatable job (тот же график).
- ТЗ упоминает `cron каждые 6 часов` — избыточно, фид обновляется раз в неделю.
- При ошибке импорта > 10% записей — **откат** (не перезаписывать данные).

#### Ручная загрузка (Белгород)

- Форма в админке: название, город, район, цена, площадь, комнаты, фото, `source=manual`.
- Источники: `site31.ru`, `rusavangard51.rf`.
- Регион `belgorod` добавляется в `feed_regions` с `is_enabled=true`, `base_url=null` (ручной).

#### Парсер новостей (отдельный модуль)

- Парсит указанные **Telegram-каналы** и/или **RSS-ленты** (URL из конфига или из таблицы `news_sources`).
- Сохраняет в таблицу `news`.
- Отображается в блоке «Последние новости» на главной.
- Cron: **раз в час** (BullMQ repeatable job).

---

### C.7. Обновлённый Roadmap (с учётом ТЗ и дедлайна 17.04.2026)

> **ВНИМАНИЕ:** Дедлайн 17.04.2026 — 6 дней от даты ТЗ. Это крайне сжатый срок для полного объёма.
> Ниже — реалистичный приоритезированный план. Отмечено, что входит в MVP к дедлайну, а что — пост-релиз.

#### Sprint 0 — Инфраструктура (день 1)

- [x] Установить: Node.js 22, PostgreSQL 16, Redis 7, pnpm на сервер
- [ ] git init монорепозиторий, pnpm workspaces *(рабочая копия без `.git` в текущем workspace; на сервере/в репозитории — по факту окружения)*
- [x] docker-compose.yml (dev: Postgres + Redis)
- [x] Prisma schema: все таблицы (включая новые из C.3)
- [x] Первая миграция + seed справочников
- [x] nginx reverse proxy для API

#### Sprint 1 — Backend Core (дни 2–4)

- [ ] NestJS: auth (admin + public + Telegram Login) *(JWT + роли; Telegram Login на бэке/виджете не завершён)*
- [x] Модули CRUD: regions, builders, blocks (со slug), buildings, subways, reference *(REST для каталога и админских сценариев; не везде полный CRUD из админки)*
- [x] Модуль listings: apartments + фильтрация + пагинация + search *(только чтение через `GET /listings`)*
- [x] Модуль feed-import: BullMQ pipeline для MSK
- [x] Модуль requests: POST + Telegram-уведомление *(POST `/requests`; токен и chat id — в админке → Настройки → Интеграции)*
- [x] Модуль favorites: CRUD + sync *(API + страница `/favorites` под JWT; гостевой буфер в localStorage до входа, слияние на логине)*
- [x] Модуль stats: счётчики
- [x] Модуль media: загрузка файлов
- [x] OpenAPI / Swagger
- [x] Деплой API

#### Sprint 2 — Публичный сайт (дни 3–7) — параллельно с Sprint 1

- [x] Scaffold web app из strict-template
- [x] Главная: hero, поиск, «Популярные ЖК», счётчик, форма заявки *(счётчик в CTA hero — из `catalog-counts`; блоки «Горячие»/«Старт» пока на моках)*
- [x] Каталог ЖК + фильтры (аккордеон на мобиле)
- [ ] Каталог квартир *(маршрут есть; паритет с ТЗ по выдаче/UX — в работе)*
- [x] Страница ЖК `/complex/:slug` (галерея, квартиры, карта, форма)
- [x] Страница квартиры `/apartment/:id`
- [x] Карта `/map` (Яндекс Maps)
- [ ] Login / Register / Profile *(страницы есть; шапка частично с мок-авторизацией; профиль — заглушка)*
- [ ] Избранное / Сравнение *(избранное: API + `/favorites` только для авторизованных, сердечки ЖК/квартиры; сравнение — без API)*
- [ ] Ипотека (калькулятор) *(калькулятор готов; боковая `LeadForm` не шлёт заявку в API)*
- [x] Контакты, Политика конфиденциальности
- [x] Адаптив: 360 / 768 / 1280 *(верстка responsive; финальный UX-проход по ТЗ — по мере итераций)*

#### Sprint 3 — Админка (дни 5–8)

- [x] Scaffold admin app *(в составе `apps/web`)*
- [x] Auth + роли
- [ ] CRUD: ЖК, корпуса, квартиры, застройщики *(ЖК + read-only листинги; остальное открыто)*
- [ ] Справочники *(частично через API на публичном каталоге; полный админ-CRUD — нет)*
- [ ] Заявки (requests): Kanban-доска + таблица, статусы, назначение *(таблица + смена статуса; Kanban/назначение — нет)*
- [x] Импорт фидов: кнопка, история, прогресс
- [x] Новости: CRUD
- [ ] CMS: контент страниц (блоки), навигация, настройки сайта, банки *(страницы/редактор и настройки — частично; не всё из ТЗ)*
- [x] Пользователи + роли
- [ ] Dashboard (KPI, графики, быстрые действия) *(дашборд есть; KPI/графики как в ТЗ CRM — упрощённо)*

#### Sprint 4 — Пост-MVP (после дедлайна)

- [x] Каталоги: дома, участки, коммерция (Phase 4 из исходного плана)
- [ ] Белгород: отдельная страница + ручной импорт *(страница `/belgorod` есть; ручной импорт/отдельный контур данных — нет)*
- [ ] Telegram-бот (полный: /search, /catalog, /favorites)
- [ ] Парсер новостей (TG-каналы, RSS)
- [ ] Презентации ЖК + PDF-генерация
- [ ] Подборки пользователя
- [ ] Роль «Агент»: публикация своих объявлений
- [ ] Full-text search (PostgreSQL tsvector или Meilisearch)
- [ ] Redis-кэш результатов поиска
- [ ] SEO: SSR / pre-rendering
- [ ] Мониторинг (Sentry, Prometheus)
- [ ] Расширение регионов (СПБ, КРД, НСК и др.)

---

### C.8. Обновления в структуре монорепозитория

К структуре из раздела 6 добавляются:

```
apps/
├── api/src/modules/
│   ├── auth-public/          # NEW
│   ├── requests/             # NEW
│   ├── favorites/            # NEW
│   ├── selections/           # NEW
│   ├── news/                 # NEW
│   ├── news-parser/          # NEW
│   ├── presentations/        # NEW
│   ├── mortgage/             # NEW
│   ├── search/               # NEW
│   ├── stats/                # NEW
│   ├── static-pages/         # NEW
│   └── telegram-bot/         # NEW (или отдельное приложение apps/bot/)
│
├── web/src/pages/            # все 19 маршрутов из C.2
│   ├── Home/
│   ├── Catalog/
│   ├── CatalogApartments/
│   ├── CatalogHouses/
│   ├── CatalogLand/
│   ├── CatalogCommercial/
│   ├── Belgorod/
│   ├── Complex/              # /complex/:slug
│   ├── Apartment/            # /apartment/:id
│   ├── Presentation/         # /presentation/:slug
│   ├── Map/
│   ├── Mortgage/
│   ├── Compare/
│   ├── Favorites/
│   ├── Login/
│   ├── Register/
│   ├── Profile/
│   ├── Contacts/
│   └── Privacy/
│
└── admin/src/                # CRM-админка — полная структура в разделе 10.6
    ├── components/            # Переиспользуемые: DataTable, EntityForm, Kanban, Stats
    └── modules/               # 13 модулей: dashboard, blocks, buildings, listings,
                               # builders, requests (Kanban), news, feed-import,
                               # reference, static-pages, users, audit-log, settings
```

---

### C.9. Обновления в админке

> Админ-панель полностью переработана как CRM-система — см. **раздел 10** (детализация экранов, компоненты, маршруты, Kanban-доска для заявок, паттерны UI).
>
> Ключевые отличия от начального плана:
> - Базируется на `strict-template` (layout, shadcn, Zustand, DnD)
> - **13 экранов** с полным CRUD
> - **Kanban-доска** для заявок (CRM-воронка)
> - **Real-time прогресс** импорта фидов
> - **Inline-editing** справочников
> - **Роле-based навигация** (sidebar скрывает недоступные пункты)
> - **Универсальные компоненты**: DataTable, EntityForm, SearchCombobox, MapPicker и др.

---

### C.10. Чеклист приёмки (из ТЗ, для трекинга)

Каждый пункт — проверяемый критерий.

**Главная (`/`):**
- [x] Header: логотип, навигация, телефон, кнопка «Войти» *(кнопка входа в шапке; часть сценариев авторизации в шапке ещё заглушка)*
- [x] Гео-селектор регионов *(UI списка городов; привязка к смене `region_id` API — частично)*
- [x] Счётчик квартир из API *(в CTA поиска — `GET /blocks/catalog-counts`; заголовок hero может дублировать маркетинговую формулировку)*
- [x] Вкладки типов: Квартиры / Дома / Участки / Коммерция / Белгород
- [x] Поисковая строка + фильтры
- [x] Кнопки «На карте» → `/map`, «N квартир в M ЖК» → `/catalog`
- [x] Блок «Популярные ЖК» — 4 карточки из API
- [x] Блок «Горячие предложения» — с бейджами *(данные из `GET /blocks` по региону; режим и лимиты — `site_settings` / админка «Главная»; бейдж текста — `home_hot_badge`)*
- [x] Блок «Старт продаж» — реальные даты *(данные из `GET /blocks` с `sales_start_from` / `sales_start_to` и `sort=sales_start_asc`; окно дней — `home_start_window_days` в настройках)*
- [x] Форма «Подобрать объект» → заявка в БД + Telegram *(квиз → `POST /requests`; Telegram при настройке в админке — как у ипотеки / `LeadForm`)*
- [x] Блок «О платформе»
- [x] Блок «Инструменты» — 4 карточки
- [x] Блок «Последние новости» — из парсера *(на главной — `GET /news`; импорт **RSS/Atom**: `POST /admin/news/sync-rss`, дедуп по `source_url`; URL по умолчанию — `home_news_rss_url` в настройках; **TG** как источник новостей — не реализован)*
- [x] Футер: контакты, соцсети, ссылки
- [x] Адаптив: hamburger, 1 колонка

**Каталог (`/catalog`):**
- [x] Поисковая строка
- [x] Левая панель фильтров (аккордеон на мобиле)
- [x] Карточки ЖК (3 в ряд desktop, 1 на мобиле)
- [x] Переключатель список / карта
- [x] Пагинация: 20 объектов, «Показать ещё» *(`per_page=20`, накопление страниц через `useInfiniteQuery`, кнопка «Показать ещё»)*
- [x] Счётчик «N объектов»
- [x] Сортировка списка ЖК *(API `sort`: название, дата создания, цена по мин. цене квартир, старт продаж; UI — селект в `/catalog` + `?sort=` в URL)*
- [x] Критерий: фильтр по району → только ЖК из этого района

**Страница ЖК (`/complex/:slug`):**
- [x] Галерея фото (слайдер)
- [x] Название, адрес, застройщик, статус, срок сдачи
- [x] Карта с меткой
- [x] Таблица квартир с фильтрами
- [x] Кнопки: презентация, избранное, сравнение *(`/presentation/:slug` по API; избранное ЖК; сравнение до 3; поделиться — Web Share / копирование ссылки)*
- [x] Форма заявки → БД + Telegram *(`LeadForm` с `blockId` из API → `POST /requests`; Telegram при настройке в админке)*

**Страница квартиры (`/apartment/:id`):**
- [x] Фото + планировка *(по данным API / fallback)*
- [x] Все параметры *(основной набор полей из API)*
- [x] Ссылка на ЖК
- [x] Кнопки: заявка, избранное, презентация *(`LeadForm` → БД; избранное листинга; презентация ЖК; сравнение ЖК; шаринг; CTA «Позвонить»/просмотр — подсказки до телефонии)*
- [x] Похожие объекты (4 карточки) *(для числового id листинга — из API)*

**Карта (`/map`):**
- [x] Точки ЖК на карте
- [x] Popup с карточкой
- [x] Фильтры = каталог *(боковая панель фильтров как в каталоге)*
- [x] Список справа / снизу на мобиле *(на `/map`: колонка со списком ЖК справа на desktop, под картой на мобиле с прокруткой; клик подсвечивает объект на карте)*

**Ипотека (`/mortgage`):**
- [x] Калькулятор: стоимость, взнос, срок, ставка → платёж
- [x] Форма заявки → БД + Telegram *(LeadForm → `POST /requests`, тип MORTGAGE; в комментарии — параметры калькулятора; Telegram при настройке в админке)*

**Сравнение (`/compare`):**
- [x] До 3 объектов *(лимит в UI)*
- [x] Карточки из API *(slug ЖК с `GET /blocks/:slug`; кнопка «Сравнить» на карточке каталога)*
- [x] Таблица параметров в строках *(под карточками на `/compare`: регион, район, статус, старт продаж, застройщик, адрес, метро, число квартир, цена, корпуса, источник данных)*
- [x] Удаление / добавление в избранное *(на `/compare`: сердечко → `useFavorites` / гость+API; удаление из сравнения как раньше)*

**Избранное (`/favorites`):**
- [x] Требует авторизации *(RequireAuth → редирект на `/login` с \`state.from\`)*
- [x] Карточки + удаление *(данные из \`GET /favorites\`, удаление \`DELETE /favorites/:id\`)*
- [x] «Скачать подборку» *(`window.print()`; шапка/футер скрыты в `@media print` через классы `print:hidden` — отдельный файл PDF не генерируется)*

**Авторизация:**
- [x] Login: телефон + пароль *(`POST /auth/login`: поле `email` или `phone`; фронт — одно поле «Email или телефон»; телефон нормализуется к +7…)*
- [x] Telegram Login Widget *(`TelegramLoginButton` + `GET /auth/telegram-widget-config`, `POST /auth/telegram`; нужны username бота и токен в админке)*
- [x] Register: имя, телефон, email, пароль *(`POST /auth/register` → JWT; роль всегда `client`; форма `/register`)*
- [x] Профиль: данные, заявки, избранное, подборки *(данные, заявки `GET /requests/me`, избранное и сравнение; **подборки:** `GET/POST/DELETE /collections`, элементы BLOCK/LISTING; UI в `/profile` и кнопка «В подборку» на `/favorites`)*

**Форма заявок (единая):**
- [x] Поля: имя, телефон, комментарий *(в квизе и публичном API; отдельные формы могут отличаться)*
- [x] → таблица `requests` *(квиз на главной и прямые интеграции с `POST /requests`)*
- [x] → Telegram-уведомление *(при заполнении токена и chat id в админке: Настройки сайта → «Интеграции (Telegram)»; не через .env)*
- [x] Ответ: «Спасибо! Менеджер свяжется в течение 2 часов» *(в квизе после успешной отправки)*

### C.11 Сводка статуса и оставшихся работ (12.04.2026)

**Недавние правки (вне исходного чеклиста C.10):**

- [x] Список новостей `/news`: превью текста без «сырого» HTML (обрезка после удаления тегов).
- [x] Обложки демо-новостей: локальные файлы в `/news/covers/*` вместо внешнего CDN.
- [x] Админка **Регионы**: ручное создание записи (`POST /admin/regions`), удаление региона без связанных сущностей (`DELETE /admin/regions/:id`), правка названия / URL фида / витрины. БД остаётся источником истины: регион может существовать без `base_url` (не привязан к импорту TrendAgent).
- [x] **Telegram (уведомления о заявках):** токен бота и ID чата хранятся в `site_settings`, редактирование в админке (группа `integrations`); публичный `GET /content/settings` эту группу не отдаёт; ключи не задаются через `.env`.
- [x] **Импорт новостей RSS/Atom:** `POST /admin/news/sync-rss`, парсинг ленты (`fast-xml-parser`), дедуп по `source_url`, slug `rss-{sha256[:16]}`; настройка `home_news_rss_url` (группа «Главная»); UI «Импорт RSS» в админке «Новости».
- [x] **Подборки пользователя:** таблицы `user_collections` / `user_collection_items`, API `/collections` (JWT), блок в `/profile`, сохранение избранного в подборку на `/favorites`; привязка Telegram в профиле через `mode="link"` у виджета.
- [x] **Восстановление пароля:** страница `/forgot-password` без имитации отправки письма — пояснение и сценарии (телефон / Telegram / поддержка).

**Что по-прежнему открыто по разделам C.7 / C.10 (кратко):**

| Область | Статус |
|--------|--------|
| Auth: Telegram Login, телефон в login/register | **Login:** email или телефон + пароль (`POST /auth/login`). **Register:** `POST /auth/register` (имя, телефон, email, пароль). **Telegram Login:** виджет на `/login` и `/register`; `GET /auth/telegram-widget-config`, `POST /auth/telegram`. **Связка:** `/profile` — `POST /auth/link-telegram`, `POST /auth/link-email` |
| Заявки → Telegram | Готово при заполнении полей в админке |
| Yandex Maps API key | **В админке** (`yandex_maps_api_key`); публично `GET /content/maps-config`; карты на ЖК / каталоге / `MapSearch` |
| Сравнение ЖК | **Карточки + таблица + избранное** на `/compare` (сердечко); `GET /blocks/:id` — цены; список ЖК на `/map` справа/снизу |
| Избранное: синхронизация с API, обязательная авторизация | **Готово:** JWT, merge гостевого буфера при входе, UI каталога/ЖК/квартиры |
| Медиа-модуль (загрузка файлов на сервер) | Не готово |
| Каталог квартир (паритет ТЗ / UX) | В работе |
| Главная: «Горячие» / «Старт продаж» из API (не моки) | **Готово:** `PropertyGridSection` → `GET /blocks` + настройки `home_*`; «Помощь с подбором» → `LeadForm` / `POST /requests` |
| Пагинация каталога ЖК «20 + показать ещё» | **Готово:** 20 на запрос, «Показать ещё» (`fetchNextPage`) |
| Сортировка списка ЖК | **Селект в каталоге** + `sort` в `GET /blocks`; по цене — **SQL**: `ORDER BY` по `MIN(price)` квартир + `LIMIT/OFFSET` на стороне Postgres (фолбэк: старый in-memory путь, если `WHERE` не удалось сопоставить SQL) |
| Каталоги дома / участки / коммерция (Sprint 4) | Не готово |
| Ручной ввод объектов (квартиры, дома, участки, коммерция) вне фида | **Квартиры (MANUAL):** \`POST/PATCH/DELETE /admin/listings/…\`, вкладка «Ручные» в админке «Квартиры», \`external_id = manual-uuid\`. Дома/участки/коммерция — позже |
| Белгород: ручной импорт контента | Страница есть; контур импорта — нет |
| Парсер новостей TG/RSS | **RSS/Atom:** импорт в БД (`POST /admin/news/sync-rss`), настройка `home_news_rss_url`, кнопка в админке «Новости». **Telegram-канал как источник** — не реализован |
| SEO SSR, мониторинг, full-text | Пост-MVP |

**Пошаговая реализация дальше (ориентир):**

1. ~~**Интеграции:** Yandex Maps key в `site_settings` + `GET /content/maps-config`~~ *(сделано)*. Дальше — другие ключи по тому же шаблону при необходимости.
2. **Telegram Login:** фронт — виджет с `data-telegram-login` из `telegram_login_bot_username`; бэк — `POST /auth/telegram` с проверкой hash по токену бота из `site_settings`. Связка email↔Telegram: `POST /auth/link-telegram`, `POST /auth/link-email`, UI в `/profile`.
3. ~~**Ручные листинги (квартиры):**~~ API + форма в админке *(сделано для APARTMENT + MANUAL)*. Дальше: дома, участки, коммерция.
4. **Избранное:** синхронизация с API и политика авторизации по плану C.10 *(реализовано: см. C.10 `/favorites`)*.

**Нужно ли менять план дальше:** при появлении CRUD листингов вне фида — дополнить раздел 10 (админка) и C.7 Sprint 3 конкретными подпунктами (сущности, маршруты API). Текущая правка C.11 фиксирует фактическое состояние на дату.

---

*Документ поддерживается в корне проекта `PROJECT_PLAN.md`.*
*При изменении архитектурных решений — обновить этот документ.*
*Версия ТЗ: 1.0 от 07.04.2026. Дедлайн: 17.04.2026.*
