# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Язык репозитория — русский: комментарии, коммиты и документация пишутся по-русски.

## Что это

Монорепозиторий сайта районного Дома культуры: `mrdk-back/` (Express 5 + TypeScript ESM + PostgreSQL), `mrdk-front/` (React 18 + Vite + react-admin, FSD), `nginx/`, `docker-compose.yml`, скрипты деплоя/бэкапа.

Отдельного рунбука нет: эксплуатационные решения (порядок сборки и лимиты памяти, своп, выпуск сертификата и HTTPS, CSP, кэш-заголовки, бэкап/восстановление, владелец тома загрузок) объяснены комментариями в самих файлах — [deploy.sh](deploy.sh), [backup.sh](backup.sh), [restore.sh](restore.sh), [nginx/nginx.conf](nginx/nginx.conf), [docker-compose.yml](docker-compose.yml), [mrdk-back/Dockerfile](mrdk-back/Dockerfile), [mrdk-front/Dockerfile](mrdk-front/Dockerfile), [mrdk-back/.env.example](mrdk-back/.env.example). Меняешь такое поведение — правь комментарий рядом, а не заводи новый документ.

## Команды

```bash
# БД для локальной разработки; нужен корневой .env с POSTGRES_PASSWORD —
# compose подставляет его в postgres и в DATABASE_URL бэкенда
docker compose up -d postgres

# бэкенд (:3001) — нужен mrdk-back/.env (образец в .env.example)
cd mrdk-back && npm install && npm run dev

# фронт (:5173) — vite проксирует /api и /uploads на :3001
cd mrdk-front && npm install && npm run dev
```

Первый старт на пустой БД заводит админа и требует пароль: `.env.example` указывает `ADMIN_PASSWORD_FILE=../secrets/admin_password`, то есть локально файл `secrets/admin_password` тоже нужно создать (или задать `ADMIN_PASSWORD`). Дальше сервер стартует и без него.

Проверки (обе папки): `npm run lint`, `npm run typecheck`, `npm test`.

```bash
# один файл тестов / один тест по имени
cd mrdk-back && npx vitest run src/utils/buildOrderBy.test.ts
cd mrdk-front && npx vitest run src/pages/admin/dataProvider.test.ts
cd mrdk-back && npx vitest run -t 'фрагмент имени теста'
npm run test:watch          # watch-режим
```

Прод-стек целиком: `docker compose build && docker compose up -d` (на сервере — **только** `./deploy.sh`, см. инвариант про 1 ГБ ниже).

## Ключевые инварианты

**Прод бежит на скомпилированном коде.** Правка в `mrdk-back/src` → `docker compose build backend && up -d`; в `mrdk-front/src` или `VITE_*` → `build nginx && up -d`. `nginx/nginx.conf` — bind-mount, хватает `restart nginx`. После правки корневого `.env` бэкенд надо **пересоздать** (`up -d backend`), а не `restart`.

**Сборка обязана влезать в 1 ядро / 1 ГБ.** Прод-сервер маленький, поэтому: в обоих Dockerfile стоит `NODE_OPTIONS=--max-old-space-size=384` (нехватка памяти = внятная ошибка сборки вместо свопа и зависшего сервера), а `deploy.sh` собирает сервисы **по очереди** (`build backend`, потом `build nginx`) — голый `docker compose build` запускает их параллельно, два Node-тулчейна в 1 ГБ не помещаются. Тяжелеет сборка — перемеряй пики и правь цифры разом во всех местах, где они записаны (комментарии в обоих Dockerfile и в `deploy.sh`; сейчас: tsc фронта ~570 МБ, tsc бэка ~410–420 МБ, vite ~450 МБ).

**Образ фронта не проверяет типы.** [Dockerfile](mrdk-front/Dockerfile) запускает `build:image` (только `vite build`), а не `build` (`tsc -b && vite build`) — tsc самый прожорливый шаг. Значит, ошибку типов ловит **только** CI (`frontend.yml`: typecheck + build) до попадания в `main`, откуда `deploy.sh` тянет код. Гонять `npm run typecheck` перед пушем во фронте обязательно — сломанные типы дойдут до прода молча.

**ESM + NodeNext на бэкенде:** относительные импорты пишутся с расширением `.js` (`./config/db.js`), хотя файл — `.ts`. Без него сборка/рантайм падают.

**Миграции.** Новый `mrdk-back/migrations/NNN_name.sql` (порядок — по имени файла); `runMigrations` накатывает их при старте сервера в транзакции и пишет в `schema_migrations`. Уже применённые файлы не редактируются — только новая миграция.

**Порядок инициализации в [server.ts](mrdk-back/server.ts):** разворачивание docker-секретов (`JWT_SECRET_FILE`/`SMTP_PASS_FILE`) → проверка обязательных env (`DATABASE_URL`, `JWT_SECRET`, `ADMIN_LOGIN`) → **динамические** импорты `app`/`db`/`logger` → миграции → создание админа. `ADMIN_PASSWORD_FILE` в этот цикл намеренно **не** входит: он читается позже и только при пустой БД, поэтому пароль админа нужен лишь на первом старте — не добавляй его ни в цикл разворачивания, ни в `requiredEnv`, иначе сервер перестанет подниматься везде, где админ уже заведён, а файла секрета нет. Импорты именно динамические, потому что модули читают `process.env` на этапе импорта; не превращай их в статические сверху файла.

**Даты.** `DATE` из Postgres отдаётся строкой `'YYYY-MM-DD'` (парсер типа в [config/db.ts](mrdk-back/src/config/db.ts)). Ни бэк, ни фронт, ни `dataProvider` не гоняют её через `new Date()` — иначе дата уезжает на день из-за таймзоны.

**Новый публичный раздел сайта = три правки:** `STATIC_ROUTES` в [siteMeta.ts](mrdk-front/src/shared/config/siteMeta.ts) (мета + пререндер), `handle` у маршрута в [routes.tsx](mrdk-front/src/app/routes.tsx), `STATIC_PATHS` в [sitemap.ts](mrdk-back/src/controllers/sitemap.ts). `robots.txt` генерируется там же, в `closeBundle`, но `STATIC_ROUTES` не читает: список `Disallow` в нём захардкожен, из siteMeta берётся только `SITE_ORIGIN` для строки `Sitemap:` — закрыть раздел от индексации, «не добавив его в `STATIC_ROUTES`», не получится. Рассинхрон фронта и бэка ловит `sitemap.test.ts` (поэтому backend-CI триггерится и на `siteMeta.ts`).

**CSP живёт в двух местах** и должен быть синхронным: `nginx/nginx.conf` (главный — действует на страницу) и helmet в [app.ts](mrdk-back/src/app.ts) (только ответы API). Внешние домены — 2ГИС (нужен `'unsafe-eval'`), Яндекс.Метрика (script/connect с `wss://`/img/frame).

**Пререндер падает намеренно.** Плагин `prerenderStaticRoutes` в [vite.config.ts](mrdk-front/vite.config.ts) подменяет мету в `dist/<раздел>/index.html` через `replaceOrThrow`: если разметка меты в `index.html` изменилась и regex не совпал — сборка ломается, вместо тихой генерации страниц с метой главной.

## Архитектура бэкенда

Слои: `routes` (путь + middleware-цепочка) → `validators` (express-validator) → `controllers` (логика + SQL) → `config/db` (пул `pg`). Поперечно: `middleware/` (auth, requireAdmin, validateId, verifyFileType, rateLimiter), `config/` (multer, mailer, logger, migrate).

- **Формат ответа:** успех — `{ data }`, списки — `{ data, total }`, ошибка — `{ error: { message, statusCode, details? } }`. 5xx наружу отдаются обобщённым текстом, стек уходит в лог ([errorHandler.ts](mrdk-back/src/middleware/errorHandler.ts)).
- **Контроллеры** сами вызывают `validationResult(req)` и возвращают 400 с `details`; ошибки прокидываются через `next(err)`.
- **Порядок middleware в [app.ts](mrdk-back/src/app.ts)** значим: `/health` и dev-статика `/uploads` идут **до** `generalLimiter` (иначе картинки съедают лимит 100/мин и дев упирается в 429).
- **Загрузка файлов — две ступени:** `config/multer` (случайное имя, лимит размера, фильтр по заявленному MIME) → `verifyFileType(MIMES)` (magic bytes, удаление файла и 400 при несовпадении, нормализация расширения). Обе обязательны в цепочке роута.
- **Порядок роутов:** статические пути объявляются до `/:id` (`router.get('/years', …)` перед `router.get('/:id', …)`).
- **SQL:** только параметризованный; `ORDER BY` — исключительно через [buildOrderBy](mrdk-back/src/utils/buildOrderBy.ts) с whitelist колонок; пагинация — через [parsePagination](mrdk-back/src/utils/parsePagination.ts) (`limit` ≤ 100, `page` ≤ 1 000 000 — потолок обязателен, иначе offset в экспоненциальной записи роняет запрос).
- **Админские роуты:** `authenticateToken` + `requireAdmin`. JWT в httpOnly-куке на 2 ч со скользящим продлением (сверка с БД, потолок сессии 24 ч) — [middleware/auth.ts](mrdk-back/src/middleware/auth.ts). `secure`-флаг включается при `NODE_ENV=production`, поэтому по голому `http://` вход в админку не работает.

## Архитектура фронтенда

Feature-Sliced Design: `app/` (layout + роутер) → `pages/` → `widgets/` → `entities/` → `shared/`. Импорты идут сверху вниз по слоям; стили — CSS-модули рядом с компонентом (`*.module.css`), общие примитивы (`srOnly`, скелетоны, fade-in) — в `shared/ui/ui.module.css`.

- **Данные:** TanStack Query + `shared/lib/apiClient` (axios, `withCredentials`, baseURL `/api`). Списки используют `placeholderData: keepPreviousData`, скелетоны — только на первой загрузке.
- **Админка** (`pages/admin/`) — react-admin 5 + MUI, ленивый чанк вместе с `/login`. `dataProvider.ts` маппит react-admin ⇄ API: FormData для файлов, отдельные запросы на медиа события (`/:id/images`, `/:id/videos`), а `getOne` для `workplan`/`documents` ищет запись постранично в списке — у этих ресурсов `GET /:id` отдаёт файл на скачивание, а не JSON.
- **Мета:** у каждого маршрута, кроме `/events/:id`, обязателен `handle` из `STATIC_ROUTES`; `/events/:id` ставит мету сам из данных события.
- **Аналитика:** скрипт Яндекс.Метрики подключается только после согласия на обработку ПД ([consent.ts](mrdk-front/src/shared/analytics/consent.ts)).

## Тесты и CI

Раннер — vitest в обоих пакетах (`environment: 'node'`, `include: src/**/*.test.ts`); покрытие точечное, по рискованным местам. Тесты исключены из прод-сборки бэкенда (`exclude` в [tsconfig.json](mrdk-back/tsconfig.json)) — не переноси в `src` код, который они мокают через рантайм-импорты.

GitHub Actions живут **только** в корневом `.github/workflows` (`backend.yml`, `frontend.yml`): `npm ci → lint → typecheck → test`, у фронта плюс `build` (гард пререндера), Node 24, `paths`-фильтр по своей папке.

## Секреты

`JWT_SECRET`, `SMTP_PASS`, пароль админа в docker-режиме передаются **файлами** (`secrets/*`, переменные `*_FILE`), а не через `.env` — `docker inspect` показывает env. Корневой `.env` и `secrets/` вне git; `mrdk-front/.env.production` коммитится (build-переменные `VITE_*`). Список переменных с пояснениями — [mrdk-back/.env.example](mrdk-back/.env.example) (dev) и блок `environment` бэкенда в [docker-compose.yml](docker-compose.yml) (прод); новая переменная заводится сразу в обоих местах.
