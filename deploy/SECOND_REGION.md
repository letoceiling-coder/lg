# Второй и следующие регионы (отдельный домен или поддомен)

## 1. Данные в БД

- В **Админка → Регионы** задайте для региона:
  - **Код** (латиница), **Название**, при необходимости **URL фида** (`base_url`) для TrendAgent.
  - **Публичный URL** (`public_site_url`) — канонический адрес витрины этого региона (например `https://belgorod.example.ru`). Публичный API `GET /regions` отдаёт поле `publicSiteUrl` для клиентов.
- Включите регион в витрину (флажок «Витрина»), чтобы он появился в гео-селекторе.

## 2. Окружение на сервере второго региона

Скопируйте `.env` с основного инстанса и измените как минимум:

- `DATABASE_URL` — отдельная БД или та же, в зависимости от схемы.
- `PUBLIC_SITE_URL` и при сборке фронта `VITE_PUBLIC_SITE_URL` — домен этого региона.
- `CORS_ORIGINS` — добавьте origin нового фронта.
- `JWT_*` — те же секреты, если пользователи общие; иначе свои ключи и отдельная модель входа.
- `MEILI_HOST` — общий или отдельный Meilisearch; после деплоя вызовите `POST /api/v1/admin/search/reindex-catalog` с авторизацией админа.

## 3. Nginx

Шаблон для **отдельного server_name** (один PM2-процесс `lg-api` на порту 3000 можно проксировать с разных `server`):

```nginx
server {
    listen 443 ssl http2;
    server_name belgorod.example.ru;
    # ssl_certificate …
    location /api/ {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
    location / {
        root /var/www/lg-belgorod/dist;
        try_files $uri $uri/ /index.html;
    }
}
```

Для **поддомена на том же корне** достаточно одного `server_name` с несколькими именами и общим `root`, а различие регионов задаётся через `PUBLIC_SITE_URL` / данные в БД.

## 4. Деплой

На каждом инстансе: `bash deploy/deploy-full.sh` (или `deploy-from-git.sh`) из каталога проекта с нужным `.env`.

## 5. Гео и Белгород

- Каталог и карта поддерживают `geo_preset=belgorod` (контур в API), либо `geo_lat`, `geo_lng`, `geo_radius_m`, либо `geo_polygon` (JSON Polygon).
- Требуется миграция PostGIS: `CREATE EXTENSION postgis` (см. `packages/database/prisma/migrations/…postgis…`).
