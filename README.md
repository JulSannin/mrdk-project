# МРДК — сайт районного Дома культуры

Монорепозиторий: публичный сайт + админ-панель + REST API + деплой-обвязка (Docker, nginx, CI, бэкапы). Клонируешь на сервер → создаёшь `.env` и секреты → `docker compose up` → работает.

📖 Документация:
- **[docs/OPERATIONS.md](docs/OPERATIONS.md)** — эксплуатация: архитектура, API, переменные и секреты, деплой, HTTPS, CSP, кэширование, SEO-обвязка, бэкапы, грабли.
- **[docs/TECHNICAL-SPECIFICATION.md](docs/TECHNICAL-SPECIFICATION.md)** — техническое задание (требования, роли, структура данных, API-контракт).

## Что это

- **Публичный сайт ДК:** события с фотогалереями/видео и фильтром по годам, клубы и секции, планы работы, документы, памятки, противодействие коррупции, контакты с картой 2ГИС и формой обратной связи. Режим для слабовидящих (БВИ), Яндекс.Метрика, SEO-пререндер разделов + sitemap.
- **Админ-панель** (`/admin`, react-admin): CRUD по событиям, планам работы, документам, памяткам, клубам; управление медиа событий.

## Структура

```
work/
├── .github/workflows/   # CI (backend.yml, frontend.yml) — только в корне репо
├── mrdk-back/           # API: Express 5 + TypeScript (ESM) + PostgreSQL
├── mrdk-front/          # Сайт + админка: React 18 + Vite + react-admin (FSD)
├── nginx/nginx.conf     # Прод: статика dist + пререндер, прокси /api и /sitemap.xml,
│                        #       CSP, кэш-заголовки, 301 со слэш-дублей
├── secrets/             # Docker secrets: admin_password, jwt_secret, smtp_pass (вне git)
├── docs/                # OPERATIONS.md, TECHNICAL-SPECIFICATION.md
├── docker-compose.yml   # postgres + backend + nginx + certbot (авто-renew TLS)
└── deploy.sh / backup.sh / restore.sh
```

## Стек

| Слой | Технологии |
|------|------------|
| Backend | Express 5, TypeScript (ESM), PostgreSQL (`pg`), JWT (httpOnly cookie, скользящая сессия ≤24 ч), multer + file-type, nodemailer, helmet, express-rate-limit, express-validator, winston. Node 20. |
| Frontend | React 18, Vite, react-router 6, TanStack Query, react-admin 5 + MUI, axios. Карта 2ГИС, Яндекс.Метрика, БВИ. FSD. |
| Инфра | docker-compose (postgres:16-alpine + backend + nginx + certbot), docker secrets, тома `postgres_data` / `uploads`, GitHub Actions. |

## Быстрый старт (локально)

Нужны Node 20+ и Docker.

```bash
# 1. БД
docker compose up -d postgres

# 2. Бэкенд (:3001) — заполни .env по образцу
cd mrdk-back && npm install && cp .env.example .env && npm run dev

# 3. Фронтенд (:5173)
cd mrdk-front && npm install && npm run dev
```

Открыть: сайт `http://localhost:5173`, админка `http://localhost:5173/admin`. Миграции и админ создаются автоматически при старте бэкенда.

## Деплой (Docker)

```bash
docker compose build && docker compose up -d
```

Прод бежит на **скомпилированном** коде — после правок пересобирай нужный образ (`build` + `up -d`); для `nginx.conf` достаточно `restart nginx`. На сервере — `./deploy.sh` (`git pull` + `build` + `up -d` + ожидание healthcheck).

Полный рунбук (VPS, HTTPS/сертификат, миграция секретов, грабли nginx, CSP) — в [docs/OPERATIONS.md](docs/OPERATIONS.md).

## Переменные окружения и секреты (кратко)

На сервере вручную создаются **четыре файла** (все вне git):

- корневой **`.env`** — переменные compose: БД, CORS, SMTP (без пароля), админ-логин, `SITE_ORIGIN`;
- **`secrets/admin_password`**, **`secrets/jwt_secret`**, **`secrets/smtp_pass`** — docker secrets.

`mrdk-front/.env.production` (build-переменные `VITE_*`) коммитится и приезжает с git. `mrdk-back/.env` и `mrdk-front/.env` — только для локального `npm run dev`.

Таблица и детали — в [docs/OPERATIONS.md](docs/OPERATIONS.md#переменные-окружения-и-секреты).

## Тесты

```bash
cd mrdk-back  && npm test && npm run lint && npm run typecheck
cd mrdk-front && npm test && npm run lint && npm run typecheck
```
