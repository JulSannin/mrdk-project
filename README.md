# МРДК — сайт районного Дома культуры

Монорепозиторий: публичный сайт + админ-панель + REST API + деплой-обвязка (Docker, nginx, CI, бэкапы). Клонируешь на сервер → создаёшь `.env` и секреты → выпускаешь TLS-сертификат → `./deploy.sh` → работает.

## Что это

- **Публичный сайт ДК:** события с фотогалереями/видео и фильтром по годам, клубы и секции, планы работы, документы, памятки, противодействие коррупции, контакты с картой 2ГИС и формой обратной связи. Режим для слабовидящих (БВИ), Яндекс.Метрика (только после согласия на обработку ПД), SEO-пререндер разделов + sitemap.
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
├── docker-compose.yml   # postgres + backend + nginx + certbot (авто-renew TLS)
└── deploy.sh / backup.sh / restore.sh
```

## Стек

| Слой | Технологии |
|------|------------|
| Backend | Express 5, TypeScript (ESM), PostgreSQL (`pg`), JWT (httpOnly cookie, скользящая сессия ≤24 ч), multer + file-type, nodemailer, helmet, express-rate-limit, express-validator, winston. Node 24. |
| Frontend | React 18, Vite, react-router 6, TanStack Query, react-admin 5 + MUI, axios. Карта 2ГИС, Яндекс.Метрика, БВИ. FSD. |
| Инфра | docker-compose (postgres:16-alpine + backend + nginx + certbot), docker secrets, тома `postgres_data` / `uploads`, GitHub Actions. |

## Быстрый старт (локально)

Нужны Node 24+ и Docker.

```bash
# 1. Корневой .env — из него compose берёт POSTGRES_PASSWORD
echo 'POSTGRES_PASSWORD=локальный-пароль' > .env

# 2. Пароль админа: .env.example по умолчанию ждёт его файлом, а secrets/ вне git
mkdir -p secrets && printf '%s' 'локальный-пароль-админа' > secrets/admin_password

# 3. БД
docker compose up -d postgres

# 4. Бэкенд (:3001) — заполни .env по образцу (DATABASE_URL, JWT_SECRET, ADMIN_LOGIN)
cd mrdk-back && npm install && cp .env.example .env && npm run dev

# 5. Фронтенд (:5173)
cd mrdk-front && npm install && npm run dev
```

Открыть: сайт `http://localhost:5173`, админка `http://localhost:5173/admin`. Миграции и админ создаются автоматически при старте бэкенда: пароль из `secrets/admin_password` нужен только на первом старте (пустая БД), дальше сервер поднимается и без него.

## Деплой (Docker)

На сервере — только скриптом:

```bash
./deploy.sh          # git pull --ff-only + сборка + up -d + ожидание healthcheck
BACKUP_BEFORE=1 ./deploy.sh   # то же, но со снимком БД и загрузок перед миграциями
```

⚠️ Руками на сервере `docker compose build` не гоняй: без аргументов он собирает сервисы **параллельно**, а это два Node-тулчейна разом — на VPS с 1 ГБ ОЗУ (где уже крутятся postgres, backend и nginx) сумма не влезает, машина уходит в своп и подвисает посреди деплоя. `deploy.sh` собирает по очереди. На машине разработчика ограничение неактуально: `docker compose build && docker compose up -d`.

Прод бежит на **скомпилированном** коде — после правок пересобирай нужный образ (`build backend` или `build nginx`, затем `up -d`); для `nginx.conf` достаточно `restart nginx`, а после правки корневого `.env` бэкенд надо **пересоздать** (`up -d backend`), а не `restart`.

Первый выпуск TLS-сертификата делается вручную (дальше certbot продлевает сам) — порядок в комментарии у `ssl_certificate` в [nginx/nginx.conf](nginx/nginx.conf). Остальные детали — там же в комментариях: [deploy.sh](deploy.sh) (порядок сборки, своп, healthcheck), [nginx/nginx.conf](nginx/nginx.conf) (HTTPS, прокси `/api`, CSP, кэш-заголовки), [docker-compose.yml](docker-compose.yml) (сервисы, тома, certbot).

## Бэкапы

```bash
sudo ./backup.sh              # дамп БД + архив тома загрузок, ротация 14 дней
sudo ./restore.sh list        # доступные копии
sudo ./restore.sh <STAMP>     # восстановить БД + загрузки (перезапишет текущие!)
```

Регулярность — через cron (строка-образец в шапке [backup.sh](backup.sh)); по умолчанию копии ложатся в `/var/backups/mrdk`, переопределяется `BACKUP_DIR`. Подробности и подкоманды — в шапках [backup.sh](backup.sh) и [restore.sh](restore.sh).

## Переменные окружения и секреты (кратко)

На сервере вручную создаются **четыре файла** (все вне git):

- корневой **`.env`** — переменные compose: БД, CORS, SMTP (без пароля), админ-логин, `SITE_ORIGIN`;
- **`secrets/admin_password`**, **`secrets/jwt_secret`**, **`secrets/smtp_pass`** — docker secrets.

`mrdk-front/.env.production` (build-переменные `VITE_*`) коммитится и приезжает с git — секретов там нет, а значения вшиваются в бандл на `vite build`, поэтому их правка требует пересборки образа, а не рестарта. `mrdk-back/.env` и `mrdk-front/.env` — только для локального `npm run dev`.

Полный список переменных с пояснениями — в самих файлах: [mrdk-back/.env.example](mrdk-back/.env.example) (бэкенд, dev), блок `environment` бэкенда в [docker-compose.yml](docker-compose.yml) (прод) и [mrdk-front/.env.production](mrdk-front/.env.production) (фронт).

## Тесты

```bash
cd mrdk-back  && npm test && npm run lint && npm run typecheck
cd mrdk-front && npm test && npm run lint && npm run typecheck
```
