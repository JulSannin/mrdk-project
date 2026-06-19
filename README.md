# МРДК — сайт районного Дома культуры

Монорепозиторий: публичный сайт + админ-панель + REST API + деплой-обвязка (Docker, nginx, CI, бэкапы). Клонируешь на сервер → `docker compose up` → работает.

📖 **Подробная документация** (архитектура, API, переменные окружения, деплой, HTTPS, CSP, эксплуатация) — в **[docs/OPERATIONS.md](docs/OPERATIONS.md)**.

## Что это

- **Публичный сайт ДК:** события (с галереей фото/видео и фильтром по годам), клубы и секции, планы работы, документы, памятки, противодействие коррупции, контакты с картой 2ГИС и формой обратной связи. Режим для слабовидящих, Яндекс.Метрика.
- **Админ-панель** (`/admin`, react-admin): CRUD по событиям, планам работы, документам, памяткам, клубам.

## Структура

```
work/
├── .github/workflows/   # CI (backend.yml, frontend.yml) — только в корне репо
├── mrdk-back/           # API: Express 5 + TypeScript (ESM) + PostgreSQL
├── mrdk-front/          # Сайт + админка: React 18 + Vite + react-admin (FSD)
├── nginx/nginx.conf     # Прод-роутинг: статика dist, прокси /api, /uploads, CSP
├── secrets/             # Docker secret: admin_password (вне git)
├── docs/OPERATIONS.md   # Подробная техдокументация
├── docker-compose.yml   # postgres + backend + nginx
└── deploy.sh / backup.sh / restore.sh
```

## Стек

| Слой | Технологии |
|------|------------|
| Backend | Express 5, TypeScript (ESM), PostgreSQL (`pg`), JWT (httpOnly cookie), multer + file-type, nodemailer, helmet, express-rate-limit, express-validator, winston. Node 20. |
| Frontend | React 18, Vite, react-router 6, TanStack Query, react-admin 5 + MUI, axios. Карта 2ГИС, Яндекс.Метрика. FSD. |
| Инфра | docker-compose (postgres:16-alpine + backend + nginx), docker secret, тома `postgres_data` / `uploads`, GitHub Actions. |

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

Прод бежит на **скомпилированном** коде — после правок пересобирай нужный образ (`build` + `up -d`); для `nginx.conf` достаточно `restart nginx`. На сервере — `./deploy.sh` (`git pull` + `build` + `up -d`).

Полный рунбук (VPS, HTTPS/сертификат, грабли nginx-прокси, CSP) — в [docs/OPERATIONS.md](docs/OPERATIONS.md).

## Переменные окружения (кратко)

- **Корневой `.env`** + **`secrets/admin_password`** — нужны везде, где поднимаешь стек (создаются вручную, вне git).
- **`mrdk-front/.env.production`** — build-переменные фронта (`VITE_API_BASE_URL`, `VITE_YM_COUNTER_ID`); коммитится.
- **`mrdk-back/.env`, `mrdk-front/.env`** — только для локального `npm run dev`.

Детали и таблица — в [docs/OPERATIONS.md](docs/OPERATIONS.md#переменные-окружения).

## Тесты

```bash
cd mrdk-back  && npm test && npm run lint && npm run typecheck
cd mrdk-front && npm test && npm run lint && npm run typecheck
```
