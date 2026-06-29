# МРДК — техническая документация и эксплуатация

Подробности по архитектуре, API, переменным окружения, деплою, CSP и сопровождению.
Краткий обзор и быстрый старт — в [README](../README.md).

## Содержание
- [Архитектура](#архитектура)
- [Backend](#backend)
- [API](#api)
- [Модель данных](#модель-данных)
- [Frontend](#frontend)
- [Безопасность](#безопасность)
- [Переменные окружения](#переменные-окружения)
- [Сборка и деплой](#сборка-и-деплой)
- [HTTPS на проде](#https-на-проде)
- [CSP](#csp)
- [Известные проблемы](#известные-проблемы)
- [Бэкап и восстановление](#бэкап-и-восстановление)
- [Тесты и CI](#тесты-и-ci)
- [Эксплуатация — на заметку](#эксплуатация--на-заметку)
- [Полезные команды](#полезные-команды)

---

## Архитектура

```
                          ┌────────────────────── nginx (:80/:443) ──────────────────────┐
Браузер ──HTTP(S)──▶  /              → отдаёт собранный SPA (dist/index.html) + CSP
                      /api/*         → rewrite → прокси на backend:3001 (срезает /api)
                      /uploads/*     → отдаёт файлы из тома uploads
                      /health        → прокси на backend:3001
                          └────────────────────────────────────────────────────────────────┘
                                                   │
                                                   ▼
                                      backend (Express, :3001)
                                                   │
                                                   ▼
                                      PostgreSQL (:5432, том postgres_data)
                                      файлы загрузок → том uploads
```

- В **проде** HTML/JS/CSS отдаёт nginx (запечённый `dist`), Express обслуживает только `/api/*` (JSON) и `/health`. Загруженные файлы отдаёт nginx из тома `uploads`.
- В **деве** фронт поднимает Vite (`:5173`) и сам проксирует `/api` и `/uploads` на `:3001`; Express в деве дополнительно раздаёт `/uploads` статикой (в проде — нет).

---

## Backend

**Точка входа** [server.ts](../mrdk-back/server.ts): грузит `.env` (вне прода), проверяет обязательные переменные, **накатывает миграции**, при пустой БД **создаёт администратора** из `ADMIN_LOGIN` + пароля (из `ADMIN_PASSWORD_FILE`/`ADMIN_PASSWORD`), затем `listen`.

**Сборка приложения** [src/app.ts](../mrdk-back/src/app.ts) — порядок middleware:
1. `helmet` (вкл. CSP — действует на ответы API, см. [CSP](#csp));
2. `cors` с whitelist origin из `CLIENT_ORIGIN` (`credentials: true`);
3. morgan → winston (логирование запросов);
4. `express.json()`, `cookie-parser`, `trust proxy = 1` (за nginx — корректный `req.ip` для rate-limit);
5. `/health` (**до** общего лимитера — не троттлится);
6. `generalLimiter` (100 req/мин);
7. роутеры ресурсов;
8. 404-обработчик и централизованный `errorHandler`.

**Слои:** `routes` (пути + middleware) → `validators` (express-validator) → `controllers` (логика + SQL) → `config/db` (пул `pg`). Поперечно: `middleware` (auth/requireAdmin/validateId/verifyFileType/rateLimiter), `config/multer`, `config/mailer`, `config/migrate`.

**Формат ответов:**
- успех: `{ "data": ... }`, у списков `{ "data": [...], "total": N }` + заголовок `X-Total-Count`; у части действий — `{ "success": true }`;
- ошибка: `{ "error": { "message", "statusCode", "details"? } }`. Для 5xx наружу — обобщённое «Внутренняя ошибка сервера», стек в лог.

**Загрузка файлов** (две ступени): `multer` сохраняет на диск со случайным именем, фильтрует по заявленному MIME и лимиту (изображения 5 МБ, документы 20 МБ, видео 200 МБ) → `verifyFileType` дочитывает **сигнатуру** (magic bytes), сверяет реальный тип, при несовпадении удаляет файл и отдаёт 400, нормализует расширение. Типы: изображения `jpeg/png/webp`, документы `doc/docx/pdf`, видео `mp4/webm/quicktime`.

---

## API

Базовый префикс в браузере — `/api` (nginx срезает перед бэкендом).

### Публичные (без авторизации)

| Метод | Путь | Назначение |
|------|------|-----------|
| GET | `/health` | Пинг БД: `{status:"ok"}` или 503 |
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

При удалении записей с файлами связанные файлы на диске тоже удаляются; галерея событий чистится каскадом в БД.

---

## Модель данных

Схема — SQL в [mrdk-back/migrations/](../mrdk-back/migrations/), накатывается на старте; применённые миграции фиксируются в `schema_migrations`.

| Таблица | Назначение | Ключевые поля |
|---------|-----------|----------------|
| `users` | админы | `login` (unique), `password_hash` (bcrypt), `role` |
| `events` | события | `title`, `description`, `image_path`, `event_date` |
| `event_images` / `event_videos` | галерея | `event_id → events(id) ON DELETE CASCADE`, `*_path` |
| `workplan` | планы работы | `title`, `document_path`, `original_name`, `year`, `month` |
| `documents` | документы | `title`, `document_path`, `original_name` |
| `reminders` | памятки | `title`, `image_path` |
| `clubs` | клубы/секции | `name`, `leader` |
| `schema_migrations` | учёт миграций | `filename` (PK) |

Дата события (`DATE`) отдаётся строкой `YYYY-MM-DD` (без сдвига таймзоны — см. парсер в [config/db.ts](../mrdk-back/src/config/db.ts)).

---

## Frontend

**Архитектура — Feature-Sliced Design**, слои в `src/`:
- `app/` — корневой layout ([root.tsx](../mrdk-front/src/app/root.tsx)) и роутер ([routes.tsx](../mrdk-front/src/app/routes.tsx)); Header/Footer прячутся на `/login` и `/admin`; смена маршрута → скролл наверх; Метрика трекает SPA-переходы;
- `pages/` — страницы сайта и админка; `widgets/` — header/footer/блоки; `entities/` — карточки и типы; `shared/` — `apiClient` (axios, `withCredentials`), `queryClient`, помощники, загрузчик 2ГИС, аналитика, ui (Skeleton/ErrorMessage/контексты).

**Маршруты:** `/`, `/events`, `/events/:id`, `/clubs`, `/workplan`, `/documents`, `/reminders`, `/anticorruption`, `/contacts`, `/login`, `/admin/*`, `*`. Админка и логин — ленивые чанки.

**Админка** — react-admin 5 + MUI: `dataProvider.ts` (маппинг react-admin ⇄ API, FormData для файлов, нормализация дат), `authProvider.ts` (`/auth*`), `resources/` (формы и списки).

---

## Безопасность

- **Аутентификация:** JWT в httpOnly cookie (`SameSite=Strict`, `Secure` в проде, TTL 2 ч со скользящим продлением при <15 мин). Пароли — bcrypt. Админ-маршруты — `authenticateToken` + `requireAdmin`.
- **Rate limiting:** логин 10/мин, форма 5/мин, общий 100/мин.
- **Валидация:** express-validator; `validateId` отбивает нечисловой `:id` до запроса в БД.
- **SQL:** только параметризованный; `ORDER BY` — через whitelist ([buildOrderBy.ts](../mrdk-back/src/utils/buildOrderBy.ts)).
- **Файлы:** проверка по сигнатуре, случайные имена, нормализация расширения.

---

## Переменные окружения

**Два режима запуска** — от них зависит, какие файлы нужны:
- **Docker** (локальный `:80` и VPS): бэкенд берёт переменные в рантайме из `docker-compose` → из **корневого `.env`**; фронт — при сборке из **`.env.production`**. Файлы `mrdk-back/.env` и `mrdk-front/.env` в docker-режиме **не участвуют** (исключены `.dockerignore`).
- **Локальная разработка** (`npm run dev`): бэк читает `mrdk-back/.env`, фронт — `mrdk-front/.env`.

| Файл | В git? | Зачем | Где нужен |
|------|:--:|------|-----------|
| `.env` (корень) | нет | переменные для `docker compose`: БД, JWT, CORS, SMTP, админ | везде, где поднимаешь стек (docker + VPS) |
| `secrets/admin_password` | нет | docker-secret с паролём админа | везде, где docker compose |
| `mrdk-front/.env.production` | **да** | `VITE_API_BASE_URL`, `VITE_YM_COUNTER_ID` — вшиваются при `vite build` | приезжает с git |
| `mrdk-back/.env.example` | **да** | шаблон-документация | образец |
| `mrdk-back/.env` | нет | env для `npm run dev` бэка и `smtp-test.mjs` | только локальная разработка |
| `mrdk-front/.env` | нет | env для `vite dev` (можно пустой) | только локальная разработка |

**Ключи корневого `.env` / `mrdk-back/.env`:** `POSTGRES_PASSWORD`, `JWT_SECRET` (`openssl rand -base64 64`), `CLIENT_ORIGIN` (через запятую; прод — `https://<домен>`), `GOSUSLUGI_ORIGIN`, `ADMIN_LOGIN`, `ADMIN_PASSWORD_FILE`, `SMTP_HOST/PORT/SECURE/USER/PASS`, `ADMIN_EMAIL` (шаблон — [.env.example](../mrdk-back/.env.example)).

**На VPS создаются вручную только два файла:** корневой `.env` и `secrets/admin_password`. `.env.production` приезжает с `git clone`. `mrdk-back/.env` и `mrdk-front/.env` на VPS не нужны.

> CORS: `CLIENT_ORIGIN` должен включать тот origin, с которого открыт сайт. Локально по docker это `http://localhost`, в проде — `https://<домен>`. Иначе POST-запросы (форма, логин) ловят 403 «Not allowed by CORS». После правки `.env` бэкенд надо **пересоздать** (`docker compose up -d backend`), а не `restart` — env читается при создании контейнера.

---

## Сборка и деплой

**Весь стек одной командой** (собирает бэкенд и фронт внутри nginx-образа):
```bash
docker compose build
docker compose up -d
```
- **Backend** компилирует `dist` внутри образа (`tsc`), бежит как `node dist/server.js`, на старте сам накатывает миграции.
- **Frontend** — сервис `nginx` с `build: ./mrdk-front` (multi-stage: `vite build` → запекание `dist` в nginx-образ). Прод-значения `VITE_*` берутся из `mrdk-front/.env.production`.

**Деплой на сервере — [deploy.sh](../deploy.sh):** `git pull --ff-only` → `docker compose build` → `up -d`, ждёт healthcheck бэкенда, чистит висячие образы. Опция `BACKUP_BEFORE=1` снимает бэкап перед миграциями.
```bash
./deploy.sh   # поправь PROJECT_DIR внутри под путь клона на сервере
```

### ⚠️ Прод работает на скомпилированном коде — пересобирай образы
- **Backend:** правка в `mrdk-back/src` → прод **только** после `docker compose build backend && up -d`.
- **Frontend:** правка в `mrdk-front/src` или `VITE_*` → `docker compose build nginx && up -d`.
- **nginx.conf** (роутинг/CSP) — bind-mount, достаточно `docker compose restart nginx`.
- На сервере не собирай руками — гоняй `deploy.sh` (он всегда делает `build` после `git pull`).

> ⚠️ **Прокси `/api` в nginx** использует переменную с `rewrite`:
> `set $backend_upstream http://backend:3001; rewrite ^/api/(.*)$ /$1 break; proxy_pass $backend_upstream;`
> Хвостовой `/` после переменной (`proxy_pass $var/;`) НЕ срезает префикс → все API в 404. Не «упрощать» обратно.

---

## HTTPS на проде

Прод-сайт обязан работать по HTTPS: иначе `Secure`-кука не сохраняется и **вход в админку не работает** (см. [Известные проблемы](#известные-проблемы)).

Подход: терминировать TLS на nginx бесплатным сертификатом Let's Encrypt (certbot, проверка `--webroot` через `/.well-known/acme-challenge/`), редирект 80→443, автопродление. Условия: домен указывает A-записью на публичный IP сервера и порт 80/443 открыт из интернета. После включения HTTPS — выставить `CLIENT_ORIGIN=https://<домен>` в корневом `.env` и пересоздать backend.

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

Помимо CSP, в [nginx/nginx.conf](../nginx/nginx.conf) на отдаваемый контент навешены (в `location /` и `location /uploads/`):

| Заголовок | Значение | Зачем |
|-----------|----------|-------|
| `Strict-Transport-Security` | `max-age=31536000; includeSubDomains` | браузер принудительно ходит по HTTPS (анти-SSL-strip). `preload` намеренно не включён |
| `X-Content-Type-Options` | `nosniff` | запрет MIME-sniffing (особенно важно на `/uploads/`) |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | не утекает полный URL во внешние переходы |
| `Permissions-Policy` | `geolocation=(), camera=(), microphone=()` | отключены неиспользуемые браузерные API |

Плюс `server_tokens off` в обоих server-блоках — скрывает версию nginx в заголовке `Server`.

> Грабля: `add_header` **не наследуется** в блок, где есть собственный `add_header`. Поэтому заголовки продублированы в `location /` (рядом с CSP) и в `location /uploads/`. На `/api/` их не ставим — там заголовки выставляет helmet (иначе дубль/конфликт). HSTS, увиденный браузером на HTML-документе, применяется ко всему origin, включая `/api`.

> Проверка снаружи: `curl -sI https://<домен>/ | grep -iE 'strict-transport|x-content-type|referrer|permissions|^server'`.

---

## Известные проблемы

### Вход в админку по `http://` (Secure-кука) — РЕШЕНО на проде
**Симптом (был):** логин проходит (200), но админка «не пускает» — `/api/auth/me` → 401, редирект на `/login`.
**Причина:** auth-кука с флагом `Secure` (`cookieOptions.secure = NODE_ENV === 'production'` в [middleware/auth.ts](../mrdk-back/src/middleware/auth.ts)); браузер не сохраняет Secure-куку по обычному HTTP (кроме `http://localhost` в Chrome).
**Статус:** на проде поднят HTTPS (см. [HTTPS на проде](#https-на-проде)) → Secure-кука работает, вход исправен. Проявится снова только если открыть прод по голому `http://`. Публичная часть сайта по HTTP работала полностью — упирался только вход в админку.

---

## Бэкап и восстановление

Скрипты в корне (под root — нужен доступ к docker):
- **[backup.sh](../backup.sh)** — `pg_dump` + архив тома `work_uploads`, ротация 14 дней; для регулярности — cron. Offsite (`rsync`) закомментирован.
- **[restore.sh](../restore.sh)** — `list` / `<STAMP>` / `db <STAMP>` / `uploads <STAMP>`. ⚠️ перезаписывает текущие данные (с подтверждением).

---

## Тесты и CI

Раннер — **vitest** в обоих пакетах; покрытие точечное (самые рискованные места).
- **Backend** (`cd mrdk-back && npm test`): `decodeOriginalName`, `buildOrderBy` (whitelist-сортировка), `verifyFileType` (magic-bytes), контроллер `events`.
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
- **Почта (mail.ru):** SMTP через `smtp.mail.ru:465`, `SMTP_SECURE=true`, `SMTP_PASS` = пароль для внешних приложений (не основной пароль ящика). Проверка: `cd mrdk-back && node smtp-test.mjs`. ⚠️ некоторые VPN режут порты 25/465/587 — тогда тест проходит только с прямого/российского IP.

---

## Полезные команды

```bash
# логи
docker compose logs -f backend
docker compose logs -f nginx

# CSP на странице
curl -sI http://localhost/ | grep -i content-security-policy

# здоровье бэкенда
curl -s http://localhost/health

# применить новый .env (env читается при пересоздании, не при restart)
docker compose up -d backend

# тесты / линт / тайпчек
cd mrdk-back  && npm test && npm run lint && npm run typecheck
cd mrdk-front && npm test && npm run lint && npm run typecheck
```
