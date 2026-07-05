# МРДК — техническая документация и эксплуатация

Подробности по архитектуре, API, переменным окружения, деплою, CSP, кэшированию и сопровождению.
Краткий обзор и быстрый старт — в [README](../README.md), требования и контракты — в [ТЗ](TECHNICAL-SPECIFICATION.md).

## Содержание
- [Архитектура](#архитектура)
- [Backend](#backend)
- [API](#api)
- [Модель данных](#модель-данных)
- [Frontend](#frontend)
- [SEO и индексация](#seo-и-индексация)
- [Безопасность](#безопасность)
- [Переменные окружения и секреты](#переменные-окружения-и-секреты)
- [Сборка и деплой](#сборка-и-деплой)
- [HTTPS на проде](#https-на-проде)
- [CSP](#csp)
- [Заголовки безопасности (nginx)](#заголовки-безопасности-nginx)
- [Кэширование (nginx)](#кэширование-nginx)
- [Известные проблемы](#известные-проблемы)
- [Бэкап и восстановление](#бэкап-и-восстановление)
- [Тесты и CI](#тесты-и-ci)
- [Эксплуатация — на заметку](#эксплуатация--на-заметку)
- [Полезные команды](#полезные-команды)

---

## Архитектура

```
                     ┌───────────────────────── nginx (:80/:443) ─────────────────────────┐
Браузер ──HTTPS──▶  /               → SPA-статика (dist) + пререндер разделов; index.html: no-cache
                    /assets/*       → бандлы Vite (кэш 1 год, immutable)
                    /uploads/*      → файлы из тома uploads (кэш 30 дней, immutable)
                    /api/*          → rewrite → прокси на backend:3001 (срезает /api)
                    /health, /sitemap.xml → прокси на backend:3001
                    /<путь>/        → 301 на /<путь> (слэш-дубли, см. SEO)
                     └───────────────────────────────────────────────────────────────────┘
                                                  │
                                                  ▼
                                     backend (Express, :3001)
                                                  │
                                                  ▼
                                     PostgreSQL (:5432, том postgres_data)
                                     файлы загрузок → том uploads
```

- В **проде** HTML/JS/CSS отдаёт nginx (запечённый `dist`), Express обслуживает только `/api/*` (JSON), `/health` и `/sitemap.xml`. Загруженные файлы отдаёт nginx из тома `uploads`.
- В **деве** фронт поднимает Vite (`:5173`) и сам проксирует `/api` и `/uploads` на `:3001`; Express в деве дополнительно раздаёт `/uploads` статикой (в проде — нет).

---

## Backend

**Точка входа** [server.ts](../mrdk-back/server.ts): грузит `.env` (вне прода), разворачивает docker-секреты (`JWT_SECRET_FILE`/`SMTP_PASS_FILE` → `process.env`), проверяет обязательные переменные, **накатывает миграции**, при пустой БД **создаёт администратора** из `ADMIN_LOGIN` + пароля (из `ADMIN_PASSWORD_FILE`/`ADMIN_PASSWORD`), затем `listen`.

**Сборка приложения** [src/app.ts](../mrdk-back/src/app.ts) — порядок middleware:
1. `helmet` (вкл. CSP — действует на ответы API, см. [CSP](#csp));
2. `cors` с whitelist origin из `CLIENT_ORIGIN` (`credentials: true`);
3. morgan → winston (логирование запросов);
4. `express.json()`, `cookie-parser`, `trust proxy = 1` (за nginx — корректный `req.ip` для rate-limit);
5. `/health` (**до** общего лимитера — не троттлится);
6. dev-статика `/uploads` (**до** лимитера, см. [Эксплуатация](#эксплуатация--на-заметку));
7. `generalLimiter` (100 req/мин);
8. `/sitemap.xml` (за лимитером — отдаёт константу, см. [SEO](#seo-и-индексация));
9. роутеры ресурсов;
10. 404-обработчик и централизованный `errorHandler`.

**Слои:** `routes` (пути + middleware) → `validators` (express-validator) → `controllers` (логика + SQL) → `config/db` (пул `pg`). Поперечно: `middleware` (auth/requireAdmin/validateId/verifyFileType/rateLimiter), `config/multer`, `config/mailer`, `config/migrate`.

**Формат ответов:**
- успех: `{ "data": ... }`, у списков `{ "data": [...], "total": N }` + заголовок `X-Total-Count`; у части действий — `{ "success": true }`;
- ошибка: `{ "error": { "message", "statusCode", "details"? } }`. Для 5xx наружу — обобщённое «Внутренняя ошибка сервера», стек в лог.

**Загрузка файлов** (две ступени): `multer` сохраняет на диск со случайным именем, фильтрует по заявленному MIME и лимиту (изображения 5 МБ, документы 20 МБ, видео 200 МБ) → `verifyFileType` дочитывает **сигнатуру** (magic bytes), сверяет реальный тип, при несовпадении удаляет файл и отдаёт 400, нормализует расширение. Типы: изображения `jpeg/png/webp`, документы `doc/docx/pdf`, видео `mp4/webm/quicktime`.

**Сессия администратора:** JWT в httpOnly-куке на 2 ч. Скользящее продление: при остатке ≤15 мин любой авторизованный запрос перевыпускает токен ещё на 2 ч, **но**: (а) перед перевыпуском пользователь сверяется с БД (удалён → 401; роль берётся свежая), (б) вся сессия ограничена **24 ч** с момента логина (клейм `sess` в токене), дальше — новый вход. При недоступной БД продление тихо пропускается (запрос не падает). Реализация — [middleware/auth.ts](../mrdk-back/src/middleware/auth.ts).

---

## API

Базовый префикс в браузере — `/api` (nginx срезает перед бэкендом).

### Публичные (без авторизации)

| Метод | Путь | Назначение |
|------|------|-----------|
| GET | `/health` | Пинг БД: `{status:"ok"}` или 503 |
| GET | `/sitemap.xml` | Статический sitemap (8 разделов; `Cache-Control: 1 ч`) — путь без `/api`, см. [SEO](#seo-и-индексация) |
| GET | `/events?page=&limit=&year=&sort=&order=` | Список событий (пагинация, фильтр по году, сортировка по whitelist) |
| GET | `/events/years` | Годы со счётчиком (для фильтра) |
| GET | `/events/:id` | Событие + `images` и `videos` |
| GET | `/documents` · `/documents/:id` | Список · **скачивание** файла |
| GET | `/workplan` · `/workplan/:id` | Список (с `year`,`month`) · **скачивание** |
| GET | `/reminders?page=&limit=` · `/reminders/:id` | Памятки |
| GET | `/clubs` · `/clubs/:id` | Клубы (без пагинации) |
| POST | `/feedback` | Форма обратной связи → письмо на `ADMIN_EMAIL` (лимит 5/мин) |

### Авторизация
| Метод | Путь | Назначение |
|------|------|-----------|
| POST | `/auth` | Вход `{login,password}` → httpOnly-cookie `token` (лимит 10/мин) |
| POST | `/auth/logout` | Сброс cookie |
| GET | `/auth/me` | Текущий пользователь |

### Админские (cookie + роль `admin`)
| Ресурс | Операции |
|--------|----------|
| **events** | `POST /events` (фото необязательно — без него `image_path=NULL`, на сайте заглушка); `POST /:id/images` (≤10), `DELETE /:id/images/:imageId`; `POST /:id/videos` (≤10), `DELETE /:id/videos/:videoId`; `DELETE /:id/image` (сброс основного фото в `NULL`); `PATCH /:id`; `DELETE /:id` |
| **documents / workplan** | `POST` · `PATCH /:id` · `DELETE /:id` (с файлом; у workplan поля `year`/`month`) |
| **reminders** | `POST` · `PATCH /:id` · `DELETE /:id` (с изображением) |
| **clubs** | `POST` · `PATCH /:id` · `DELETE /:id` |

При удалении записей с файлами связанные файлы на диске тоже удаляются; галерея событий чистится каскадом в БД. Любая мутация медиа события (добавление/удаление фото и видео, сброс главного фото, PATCH) обновляет `events.updated_at`.

---

## Модель данных

Схема — SQL в [mrdk-back/migrations/](../mrdk-back/migrations/), накатывается на старте; применённые миграции фиксируются в `schema_migrations`.

| Таблица | Назначение | Ключевые поля |
|---------|-----------|----------------|
| `users` | админы | `login` (unique), `password_hash` (bcrypt), `role` |
| `events` | события | `title`, `description`, `image_path`, `event_date`, `updated_at` |
| `event_images` / `event_videos` | галерея | `event_id → events(id) ON DELETE CASCADE`, `*_path` |
| `workplan` | планы работы | `title`, `document_path`, `original_name`, `year`, `month` |
| `documents` | документы | `title`, `document_path`, `original_name` |
| `reminders` | памятки | `title`, `image_path` |
| `clubs` | клубы/секции | `name`, `leader` |
| `schema_migrations` | учёт миграций | `filename` (PK) |

Дата события (`DATE`) отдаётся строкой `YYYY-MM-DD` (без сдвига таймзоны — см. парсер в [config/db.ts](../mrdk-back/src/config/db.ts)); фронт и админка работают с этой строкой напрямую, без раундтрипа через `Date`.

---

## Frontend

**Архитектура — Feature-Sliced Design**, слои в `src/`:
- `app/` — корневой layout ([root.tsx](../mrdk-front/src/app/root.tsx)) и роутер ([routes.tsx](../mrdk-front/src/app/routes.tsx)); Header/Footer прячутся на `/login` и `/admin`; смена маршрута → скролл наверх + фокус в `<main>`; Метрика трекает SPA-переходы;
- `pages/` — страницы сайта и админка; `widgets/` — header/footer/блоки; `entities/` — карточки и типы; `shared/` — `apiClient` (axios, `withCredentials`), `queryClient`, `config/siteMeta.ts` (**единый источник SEO-меты и домена**), помощники, загрузчик 2ГИС, аналитика, ui (Skeleton/ErrorMessage/BVI-контексты, общие `srOnly`/скелетоны/fade-in в `ui.module.css`).

**Маршруты:** `/`, `/events`, `/events/:id`, `/clubs`, `/workplan`, `/documents`, `/reminders`, `/anticorruption`, `/contacts`, `/login`, `/admin/*`, `*`. Админка и логин — ленивые чанки. У всех маршрутов, кроме `/events/:id`, есть `handle` с метой (title/description); событие ставит мету само из данных.

**Списки и пагинация:** TanStack Query с `placeholderData: keepPreviousData` — при смене страницы/года прежние карточки остаются (слегка притушены, класс `.updating`), пагинатор не размонтируется; скелетоны — только на первой загрузке; fade-in проигрывается по ключу от фактически показанных данных.

**Админка** — react-admin 5 + MUI: `dataProvider.ts` (маппинг react-admin ⇄ API, FormData для файлов, даты без TZ-сдвига), `authProvider.ts` (`/auth*`), `resources/` (формы и списки).

---

## SEO и индексация

Сайт — CSR-SPA, но Яндекс не исполняет JS, поэтому мета для него готовится на сборке. Все составляющие завязаны на **[siteMeta.ts](../mrdk-front/src/shared/config/siteMeta.ts)** (`SITE_NAME`, `SITE_ORIGIN`, `SITE_DESCRIPTION`, `formatTitle`, `STATIC_ROUTES`) — домен и тексты меняются в одном месте.

| Механизм | Где | Что делает |
|----------|-----|-----------|
| **Пререндер разделов** | [vite.config.ts](../mrdk-front/vite.config.ts), плагин `prerenderStaticRoutes` | после сборки кладёт `dist/<раздел>/index.html` с подменёнными `<title>`/description/og для 7 разделов; nginx отдаёт их через `try_files $uri $uri/index.html /index.html`. Подмены идут через `replaceOrThrow`: если разметка меты в index.html изменилась и regex не совпал — **сборка падает**, а не молча генерит страницы с метой главной |
| **`%SITE_ORIGIN%`** | плагин `injectSiteOrigin` | подставляет домен из siteMeta в og:url/og:image `index.html` (dev и build) |
| **robots.txt** | генерируется в `closeBundle` | `Disallow: /admin,/login,/api/` + `Sitemap:` из `SITE_ORIGIN`; файла в `public/` нет — не дублировать |
| **sitemap.xml** | [mrdk-back/src/controllers/sitemap.ts](../mrdk-back/src/controllers/sitemap.ts) | статический XML из 8 разделов, собирается один раз при старте, `Cache-Control: public, max-age=3600`. **События (`/events/:id`) не включены сознательно**: без серверного рендера меты Яндекс видел бы на них мету главной (дубли). Появится мини-SSR меты — вернуть с `lastmod` (данные для него уже копятся в `events.updated_at`). Список синхронизирован с фронтом тестом `sitemap.test.ts` |
| **Клиентская мета** | [useDocumentTitle.ts](../mrdk-front/src/shared/lib/useDocumentTitle.ts) | `useRouteMeta` ставит title/description из `handle` маршрута; `/events/:id` — из данных события |
| **Слэш-дубли** | nginx | `/<путь>/` → 301 `/<путь>` (+query); исключены `/api/` и `/uploads/` |
| **og-превью** | [index.html](../mrdk-front/index.html), [public/og-image.png](../mrdk-front/public/og-image.png) | растровая карточка 1200×630 (SVG соцсети не принимают) + `og:image:width/height` |

> При смене домена: `SITE_ORIGIN` в siteMeta.ts (фронт) + `SITE_ORIGIN` в корневом `.env` (бэк, sitemap) + `server_name`/сертификат в nginx.conf. Проверка после выката: `curl -s https://<домен>/sitemap.xml | head`, `curl -s https://<домен>/robots.txt`, Ctrl+U на `/events` → `<title>События — …>`.

---

## Безопасность

- **Аутентификация:** JWT в httpOnly cookie (`SameSite=Strict`, `Secure` в проде, TTL 2 ч). Скользящее продление со сверкой в БД и потолком сессии 24 ч (см. [Backend](#backend)). Пароли — bcrypt. Админ-маршруты — `authenticateToken` + `requireAdmin`.
- **Секреты** — docker secrets (`admin_password`, `jwt_secret`, `smtp_pass`), не в env (env виден через `docker inspect`).
- **Rate limiting:** логин 10/мин, форма 5/мин, общий 100/мин (включая sitemap).
- **Валидация:** express-validator; `validateId` отбивает нечисловой `:id` до запроса в БД.
- **SQL:** только параметризованный; `ORDER BY` — через whitelist ([buildOrderBy.ts](../mrdk-back/src/utils/buildOrderBy.ts)).
- **Файлы:** проверка по сигнатуре, случайные имена, нормализация расширения, `nosniff` на `/uploads/`.
- **CSRF:** закрыт `SameSite=Strict` + CORS-whitelist.

---

## Переменные окружения и секреты

**Два режима запуска** — от них зависит, какие файлы нужны:
- **Docker** (локальный и VPS): бэкенд берёт переменные в рантайме из `docker-compose` → из **корневого `.env`** и **docker-секретов**; фронт — при сборке из **`.env.production`**. Файлы `mrdk-back/.env` и `mrdk-front/.env` в docker-режиме **не участвуют** (исключены `.dockerignore`).
- **Локальная разработка** (`npm run dev`): бэк читает `mrdk-back/.env` (с обычными `JWT_SECRET`/`SMTP_PASS`), фронт — `mrdk-front/.env`.

| Файл | В git? | Зачем | Где нужен |
|------|:--:|------|-----------|
| `.env` (корень) | нет | переменные для `docker compose`: БД, CORS, SMTP (без пароля), админ-логин, `SITE_ORIGIN` | везде, где поднимаешь стек |
| `secrets/admin_password` | нет | docker-secret с паролём админа (для первичного создания) | везде, где docker compose |
| `secrets/jwt_secret` | нет | docker-secret с JWT-ключом (`openssl rand -base64 64 > secrets/jwt_secret`) | везде, где docker compose |
| `secrets/smtp_pass` | нет | docker-secret с паролём SMTP (пароль для внешних приложений mail.ru) | везде, где docker compose |
| `mrdk-front/.env.production` | **да** | `VITE_API_BASE_URL`, `VITE_YM_COUNTER_ID` — вшиваются при `vite build` | приезжает с git |
| `mrdk-back/.env.example` | **да** | шаблон-документация | образец |
| `mrdk-back/.env` | нет | env для `npm run dev` бэка и `smtp-test.mjs` | только локальная разработка |
| `mrdk-front/.env` | нет | env для `vite dev` (можно пустой) | только локальная разработка |

**Ключи корневого `.env`:** `POSTGRES_PASSWORD`, `CLIENT_ORIGIN` (через запятую; прод — `https://<домен>`), `GOSUSLUGI_ORIGIN`, `SITE_ORIGIN` (необязателен, по умолчанию `https://nn-lance.ru` — база для ссылок в sitemap), `ADMIN_LOGIN`, `SMTP_HOST/PORT/SECURE/USER`, `ADMIN_EMAIL` (шаблон — [.env.example](../mrdk-back/.env.example)). ⚠️ `JWT_SECRET` и `SMTP_PASS` в docker-режиме задаются **не** в `.env`, а файлами секретов; compose передаёт пути `JWT_SECRET_FILE`/`SMTP_PASS_FILE`, которые server.ts разворачивает на старте.

**На VPS создаются вручную четыре файла:** корневой `.env` + три файла в `secrets/`. Без файлов секретов compose не поднимет backend.

> ⚠️ **Миграция на secrets (однократно при деплое этого изменения):** перед `docker compose up` перенести значения из старого `.env` в файлы — `printf '%s' "<JWT_SECRET>" > secrets/jwt_secret`, `printf '%s' "<SMTP_PASS>" > secrets/smtp_pass` (значения те же, чтобы не разлогинить админа), из `.env` строки удалить.

> CORS: `CLIENT_ORIGIN` должен включать тот origin, с которого открыт сайт. Локально по docker это `http://localhost`, в проде — `https://<домен>`. Иначе POST-запросы (форма, логин) ловят 403 «Not allowed by CORS». После правки `.env` бэкенд надо **пересоздать** (`docker compose up -d backend`), а не `restart` — env читается при создании контейнера.

---

## Сборка и деплой

**Весь стек одной командой** (собирает бэкенд и фронт внутри nginx-образа):
```bash
docker compose build
docker compose up -d
```
- **Backend** компилирует `dist` внутри образа (`tsc`), бежит как `node dist/server.js`, на старте сам накатывает миграции.
- **Frontend** — сервис `nginx` с `build: ./mrdk-front` (multi-stage: `vite build` → пререндер разделов + robots.txt → запекание `dist` в nginx-образ). Прод-значения `VITE_*` берутся из `mrdk-front/.env.production`.

**Деплой на сервере — [deploy.sh](../deploy.sh):** `git pull --ff-only` → `docker compose build` → `up -d`, ждёт healthcheck бэкенда, чистит висячие образы. Опция `BACKUP_BEFORE=1` снимает бэкап перед миграциями.
```bash
./deploy.sh   # поправь PROJECT_DIR внутри под путь клона на сервере
```

### ⚠️ Прод работает на скомпилированном коде — пересобирай образы
- **Backend:** правка в `mrdk-back/src` → прод **только** после `docker compose build backend && up -d`.
- **Frontend:** правка в `mrdk-front/src` или `VITE_*` → `docker compose build nginx && up -d`.
- **nginx.conf** (роутинг/CSP/кэш) — bind-mount, достаточно `docker compose restart nginx`.
- На сервере не собирай руками — гоняй `deploy.sh` (он всегда делает `build` после `git pull`).

> ⚠️ **Прокси `/api` в nginx** использует переменную с `rewrite`:
> `set $backend_upstream http://backend:3001; rewrite ^/api/(.*)$ /$1 break; proxy_pass $backend_upstream;`
> Хвостовой `/` после переменной (`proxy_pass $var/;`) НЕ срезает префикс → все API в 404. Не «упрощать» обратно.

---

## HTTPS на проде

Прод-сайт обязан работать по HTTPS: иначе `Secure`-кука не сохраняется и **вход в админку не работает** (см. [Известные проблемы](#известные-проблемы)).

Подход: терминировать TLS на nginx бесплатным сертификатом Let's Encrypt (certbot, проверка `--webroot` через `/.well-known/acme-challenge/`), редирект 80→443, автопродление (контейнер certbot, `renew` каждые 12 ч; nginx перечитывает конфиг каждые 6 ч). Условия: домен указывает A-записью на публичный IP сервера и порты 80/443 открыты. После включения HTTPS — `CLIENT_ORIGIN=https://<домен>` в корневом `.env` и пересоздать backend.

---

## CSP

Content-Security-Policy задаётся в **двух** местах; при добавлении внешнего сервиса править нужно **оба**:
1. **[nginx/nginx.conf](../nginx/nginx.conf)** (`add_header` в `location /`) — **главный CSP**: применяется к странице (`index.html`), реально защищает фронт. После правки: `docker compose restart nginx`.
2. **[mrdk-back/src/app.ts](../mrdk-back/src/app.ts)** (helmet) — применяется только к ответам API (JSON), на странице не действует. Держим в синхроне.

**Разрешённые внешние домены:**
- **2ГИС (карта, Raster JS API):** `maps.api.2gis.ru` (script/style/img/connect), `*.maps.2gis.com` (тайлы), `catalog.api.2gis.ru` + `keys.api.2gis.com` (connect), `map.2gis.com` (frame). **`'unsafe-eval'` в `script-src` обязателен** — загрузчик 2ГИС (`script.full.js`) исполняет код через `eval`/`new Function`, без него падает с `Uncaught EvalError`.
- **Яндекс.Метрика** — использует несколько каналов, каждый под своей директивой:

  | Директива | Значения | Зачем |
  |-----------|----------|-------|
  | `script-src` | `mc.yandex.ru`, `mc.yandex.com` | `tag.js` + JSONP-фолбэк хитов |
  | `connect-src` | `https://` **и** `wss://` обоих доменов + `yandex.ru` | fetch/XHR хиты + WebSocket `solid.ws` |
  | `img-src` | `mc.yandex.ru`, `mc.yandex.com` | пиксельный фолбэк |
  | `frame-src` | `mc.yandex.ru`, `mc.yandex.com` | скрытый iframe синхронизации |

- `'unsafe-inline'` в `style-src` — нужен MUI/react-admin и инлайновым стилям.
- `frame-src` также включает `GOSUSLUGI_ORIGIN` (helmet), если вернётся iframe Госуслуг.

> Памятка: `https://host` покрывает только `https://`. Для WebSocket нужен **отдельный** `wss://host` в `connect-src`. Метрика последовательно задействует скрипт → запрос → веб-сокет → iframe, поэтому CSP-ошибки всплывают по очереди — закрыты все четыре директивы.
>
> После правки nginx: `docker compose restart nginx`, затем DevTools → Console проверить на `Refused to … violates CSP` и что карта/Метрика живые.

---

## Заголовки безопасности (nginx)

Помимо CSP, в [nginx/nginx.conf](../nginx/nginx.conf) на отдаваемый контент навешены (в `location /`, `/uploads/`, `/assets/`, `/video|/fonts`):

| Заголовок | Значение | Зачем |
|-----------|----------|-------|
| `Strict-Transport-Security` | `max-age=31536000; includeSubDomains` | браузер принудительно ходит по HTTPS (анти-SSL-strip). `preload` намеренно не включён |
| `X-Content-Type-Options` | `nosniff` | запрет MIME-sniffing (особенно важно на `/uploads/`) |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | не утекает полный URL во внешние переходы |
| `Permissions-Policy` | `geolocation=(), camera=(), microphone=()` | отключены неиспользуемые браузерные API |

Плюс `server_tokens off` в обоих server-блоках — скрывает версию nginx в заголовке `Server`.

> Грабля: `add_header` **не наследуется** в блок, где есть собственный `add_header`. Поэтому заголовки безопасности продублированы во **всех** location-блоках со своими `add_header` (в т.ч. кэш-заголовками). На `/api/` их не ставим — там заголовки выставляет helmet (иначе дубль/конфликт). HSTS, увиденный браузером на HTML-документе, применяется ко всему origin, включая `/api`.

> Проверка снаружи: `curl -sI https://<домен>/ | grep -iE 'strict-transport|x-content-type|referrer|permissions|^server'`.

---

## Кэширование (nginx)

Четыре уровня по типу контента ([nginx.conf](../nginx/nginx.conf)):

| Что | Cache-Control | Почему |
|-----|---------------|--------|
| `/assets/` (бандлы Vite) | `max-age=31536000, immutable` | в имени файла хэш содержимого — деплой инвалидирует сам себя сменой URL |
| `/uploads/` | `max-age=2592000, immutable` | имена `timestamp_random`, файл по URL не меняется никогда |
| `/video/`, `/fonts/` | `max-age=604800` | крупная нехэшированная статика, меняется редко |
| `location /` (index.html, пререндер, favicon, og-image, robots) | `no-cache` | «кэшируй, но перепроверяй» (304 пока не изменился) |

**Ключевое — `no-cache` на index.html**: жёстко закэшированный index.html после деплоя ссылается на уже удалённые хэши `/assets/` → белый экран до Ctrl+F5. `no-cache` не запрещает кэш — заставляет ревалидировать (дёшево, 304).

Проверка: `curl -sI https://<домен>/ | grep -i cache-control` → `no-cache`; любой файл из `/assets/` → `immutable`.

---

## Известные проблемы

### Вход в админку по `http://` (Secure-кука) — РЕШЕНО на проде
**Симптом (был):** логин проходит (200), но админка «не пускает» — `/api/auth/me` → 401, редирект на `/login`.
**Причина:** auth-кука с флагом `Secure` (`cookieOptions.secure = NODE_ENV === 'production'` в [middleware/auth.ts](../mrdk-back/src/middleware/auth.ts)); браузер не сохраняет Secure-куку по обычному HTTP (кроме `http://localhost` в Chrome).
**Статус:** на проде поднят HTTPS → Secure-кука работает, вход исправен. Проявится снова только если открыть прод по голому `http://`.

### Telegram кэширует превью ссылок
После смены `og:image`/меты старое превью в Telegram может висеть до недели. Обновить принудительно: кинуть URL боту [@WebpageBot](https://t.me/WebpageBot).

---

## Бэкап и восстановление

Скрипты в корне (под root — нужен доступ к docker):
- **[backup.sh](../backup.sh)** — `pg_dump` + архив тома `work_uploads`, ротация 14 дней; для регулярности — cron. Offsite (`rsync`) закомментирован.
- **[restore.sh](../restore.sh)** — `list` / `<STAMP>` / `db <STAMP>` / `uploads <STAMP>`. ⚠️ перезаписывает текущие данные (с подтверждением).

---

## Тесты и CI

Раннер — **vitest** в обоих пакетах; покрытие точечное (самые рискованные места).
- **Backend** (`cd mrdk-back && npm test`): `decodeOriginalName`, `buildOrderBy` (whitelist-сортировка), `verifyFileType` (magic-bytes), `validateId`, контроллер `events`, **синхронизация `STATIC_PATHS` sitemap с фронтом** (`sitemap.test.ts` — падает, если списки разделов разъехались).
- **Frontend** (`cd mrdk-front && npm test`): `dataProvider`.
- Тест-файлы (`*.test.ts`) исключены из прод-сборки (`exclude` в [tsconfig](../mrdk-back/tsconfig.json)).

**CI — GitHub Actions** в корне: [backend.yml](../.github/workflows/backend.yml) и [frontend.yml](../.github/workflows/frontend.yml). На push в `main` и на PR: `npm ci → lint → typecheck → test` (Node 20), `paths`-фильтр по своей папке.
> GitHub Actions читает workflow **только из корневого** `.github/workflows`.

---

## Эксплуатация — на заметку

- **Загрузки** пишутся в именованный том `work_uploads`. Бэкенд работает **не от root** (`USER node`, uid 1000 — [Dockerfile](../mrdk-back/Dockerfile)); свежий том наследует владельца `node`. ⚠️ Если том уже существует и был root-овым — один раз: `docker compose down && docker run --rm -v work_uploads:/data alpine chown -R 1000:1000 /data && docker compose up -d`.
- **Порт Postgres** привязан к `127.0.0.1:5432:5432` (только локалхост) — наружу не торчит; бэкенд ходит в БД по внутренней docker-сети (`postgres:5432`). ⚠️ Смена биндинга требует **пересоздания** контейнера (`docker compose up -d postgres`), а не `restart`. Проверка снаружи: `nc -zv <домен> 5432` → должно быть `refused`. (Docker публикует порты в обход UFW, поэтому защищает именно биндинг на `127.0.0.1`, а не фаервол.)
- **Имена файлов:** multer отдаёт `originalname` в latin1 — чинится через `decodeOriginalName` (кириллица сохраняется).
- **Graceful shutdown** — по `SIGTERM`/`SIGINT` (`docker compose stop`) бэкенд закрывает HTTP-сервер и пул БД, с таймаутом-страховкой 10с (`server.ts`).
- **Устойчивость БД** — `pool.on('error')` в `config/db.ts`: обрыв простаивающего соединения (перезапуск БД, сетевой таймаут) логируется, а не роняет процесс.
- **Rate-limit и `/uploads`** — статика загрузок раздаётся Express'ом **до** `generalLimiter` (только dev), иначе каждая картинка считается в лимит 100/60с и при активных обновлениях дев упирается в 429 («зависание»). В проде `/uploads` отдаёт nginx, мимо лимитера.
- **Sitemap** — статический, пересобирается только при старте бэкенда. Новый публичный раздел = правка `STATIC_ROUTES` (фронт) **и** `STATIC_PATHS` (бэк) — рассинхрон ловит тест.
- **Почта (mail.ru):** SMTP через `smtp.mail.ru:465`, `SMTP_SECURE=true`, `SMTP_PASS` = пароль для внешних приложений (не основной пароль ящика). Проверка: `cd mrdk-back && node smtp-test.mjs`. ⚠️ некоторые VPN режут порты 25/465/587 — тогда тест проходит только с прямого/российского IP.

---

## Полезные команды

```bash
# логи
docker compose logs -f backend
docker compose logs -f nginx

# CSP и кэш-заголовки на странице
curl -sI https://<домен>/ | grep -iE 'content-security-policy|cache-control'

# здоровье бэкенда, sitemap, robots
curl -s https://<домен>/health
curl -s https://<домен>/sitemap.xml | head
curl -s https://<домен>/robots.txt

# слэш-редирект работает
curl -sI https://<домен>/events/ | grep -iE '^HTTP|location'

# применить новый .env (env читается при пересоздании, не при restart)
docker compose up -d backend

# тесты / линт / тайпчек
cd mrdk-back  && npm test && npm run lint && npm run typecheck
cd mrdk-front && npm test && npm run lint && npm run typecheck
```
