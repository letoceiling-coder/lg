# Отчёт: медиатека, ручные квартиры, деплой (2026-04-12)

## 1. Реализовано (код)

### Бэкенд (NestJS)

- Модуль **`admin/media`**: папки (иерархия), загрузка изображений, список файлов, перемещение (`PATCH .../move`, `folderId: -1` = корень), в корзину / восстановление / удаление навсегда / очистка корзины.
- Статическая раздача **`/uploads/`** из каталога `MEDIA_ROOT` (по умолчанию `apps/api/uploads` при локальном запуске из `apps/api`).
- При старте API: создание каталога `media` на диске и **`ensureSystemFolders()`** — если в БД нет «Корзины» / «Загрузок», строки создаются (идемпотентно, после миграции обычно не нужно).
- Ручная квартира: поля **`finishingPhotoUrl`**, **`extraPhotoUrls`** (JSON); валидация URL только с префикса **`/uploads/media/`**.

### База данных

- Миграция **`20260412220000_media_folders_and_apartment_photos`**: таблица `media_folders`, поля у `media_files` (`folder_id`, `previous_folder_id`), поля у `listing_apartments`, начальные папки «Корзина» и «Загрузки».

### Фронтенд (apps/web)

- **`/admin/media`**: дерево папок, загрузка, поиск по текущей папке, сетка/список, корзина, **перемещение файла** через выпадающий список.
- **`MediaPickerDialog`** + форма **`/admin/listings/manual/new`** и **`/admin/listings/manual/:id/edit`**.
- Прокси Vite **`/uploads`** → API (dev).

### Nginx (прод)

- В **`deploy/lg.livegrid.ru.ssl.conf`** добавлен **`location ^~ /uploads/`** → прокси на Node (порт 3000), иначе SPA `try_files` перехватывал бы URL и картинки не открывались.

### PM2

- В **`deploy/ecosystem.config.js`** задан **`MEDIA_ROOT=${DEPLOY_ROOT}/uploads`**, чтобы файлы жили вне `apps/api` и не терялись при пересборке.

### Тесты

- Корневой скрипт **`pnpm test`** → Vitest в `@lg/web`.
- Добавлен тест **`buildFolderMoveOptions`** (`apps/web/src/admin/lib/media-folder-options.test.ts`).

---

## 2. Миграции на сервере

На сервере миграции **уже входят** в `deploy/deploy-full.sh` (шаг Prisma `migrate deploy` при заданном `DATABASE_URL`).

Ручной запуск (из корня репозитория на сервере):

```bash
cd /var/www/lg   # или ваш DEPLOY_ROOT
source deploy/load-api-env.sh   # подтянуть DATABASE_URL при необходимости
cd packages/database && pnpm exec prisma migrate deploy && cd ../..
```

Убедиться, что применена миграция **`20260412220000_media_folders_and_apartment_photos`**.

После первого деплоя с медиа:

```bash
sudo mkdir -p /var/www/lg/uploads/media
sudo chown -R <пользователь_pm2>:<группа> /var/www/lg/uploads
```

(Права — под пользователя, от которого крутится `lg-api`.)

---

## 3. Тесты (локально, этот прогон)

| Команда        | Результат                          |
|----------------|------------------------------------|
| `pnpm typecheck` | OK (web, api, database, shared)  |
| `pnpm test`    | OK (2 файла, 2 теста Vitest)      |
| `pnpm db:migrate` | **Не выполнялось** — нет `DATABASE_URL` в окружении агента |

На сервере после деплоя имеет смысл повторить `pnpm test` / smoke по `/admin/media` и загрузке тестового PNG.

---

## 4. Деплой (рекомендуемая последовательность)

1. Закоммитить и запушить в **`main`** (или рабочую ветку).
2. На сервере: **`bash /var/www/lg/deploy/deploy-from-git.sh`**  
   (или `deploy-from-git.sh` с нужными `DEPLOY_ROOT` / `DEPLOY_BRANCH`).
3. Скрипт выполнит: `pnpm install` → `prisma generate` → **`prisma migrate deploy`** → сборка API/web → PM2 → копирование nginx-конфига → `nginx -t && reload`.
4. Проверить **`https://lg.livegrid.ru/uploads/`** (404 от Nest без файла — нормально) и загрузку в админке.

---

## 5. Риски и заметки

- Старые ручные квартиры с **внешними** URL планов при сохранении через новую форму потребуют замены на URL из `/uploads/media/...`.
- Размер загрузки: лимит **15 MB** на файл (API) и **20M** `client_max_body_size` в nginx.
- `CORS_ORIGINS` в ecosystem может потребовать добавления **`https://lg.livegrid.ru`**, если запросы с фронта идут с другого origin.

---

## 6. Коммит

Сводка для сообщения коммита (пример):

> feat(media): папки, корзина, загрузки, перемещение; nginx /uploads; MEDIA_ROOT; ручная квартира на странице + фото из медиа
