#!/usr/bin/env bash
#
# Деплой МРДК на сервере: подтянуть код из git и ПЕРЕСОБРАТЬ образы.
#
# Зачем: прод бежит на СКОМПИЛИРОВАННОМ коде (backend — node dist/server.js,
# dist печётся внутри образа; front — vite build, запечён в nginx-образ).
# Правка в src попадает в прод только после `docker compose build`. Этот скрипт
# делает деплой = git pull + build + up ВСЕГДА, убирая «забыл пересобрать».
#
# Запуск на сервере: ./deploy.sh   (под пользователем с доступом к docker)
#
# ⚠️ Именно ./deploy.sh, а не `sh deploy.sh`: под dash нет `set -o pipefail`,
# и падение pg_dump/сборки осталось бы незамеченным.
[ -n "${BASH_VERSION:-}" ] || {
  echo "Запускай ./deploy.sh (нужен bash), а не sh deploy.sh" >&2; exit 1; }

set -euo pipefail

# Каталог проекта = каталог самого скрипта: работает на любой машине без правок.
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKUP_BEFORE=0                        # 1 = снять бэкап перед up (миграции накатятся на старте)

cd "$PROJECT_DIR"

echo "[$(date '+%F %T')] deploy: старт"

# Сборка на слабой машине — самое рискованное место деплоя. Своп не ускоряет,
# но превращает «нехватило памяти» из зависания/OOM-kill в просто медленный шаг.
if [ "$(awk '/^SwapTotal:/{print $2}' /proc/meminfo 2>/dev/null || echo 0)" -eq 0 ]; then
  echo "!! swap не подключён. На 1 ГБ ОЗУ сборка может выжрать память и подвесить сервер." >&2
  echo "   Разово: fallocate -l 2G /swapfile && chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile" >&2
  echo "   Постоянно: дописать '/swapfile none swap sw 0 0' в /etc/fstab" >&2
fi

# 1) Свежий код (ff-only — без неожиданных merge-коммитов; упадёт при расхождении)
echo ">> было: $(git rev-parse --short HEAD)"
git pull --ff-only
echo ">> стало: $(git rev-parse --short HEAD)"

# 2) (опц.) бэкап БД+загрузок ПЕРЕД миграциями — откатиться, если миграция сломает данные
if [ "$BACKUP_BEFORE" = "1" ] && [ -x ./backup.sh ]; then
  echo ">> бэкап перед деплоем"
  ./backup.sh
fi

# 3) Пересборка образов — СТРОГО ПО ОДНОМУ.
# `docker compose build` без аргументов собирает сервисы ПАРАЛЛЕЛЬНО, а это два
# Node-тулчейна разом: замеры на этом коде дают пик ~570 МБ (tsc фронта) и
# ~410 МБ (tsc бэка). На машине с 1 ГБ, где ещё крутятся postgres, backend и
# nginx, сумма не влезает — ядро уходит в своп и сервер «виснет».
# Последовательно максимум держится в пределах одной сборки.
echo ">> собираю backend"
docker compose build backend
echo ">> собираю frontend (nginx-образ)"
docker compose build nginx

# 4) Перезапуск с новыми образами; бэкенд на старте сам накатывает миграции
docker compose up -d

# 5) Дождаться, пока бэкенд пройдёт healthcheck (в compose — curl :3001/health)
cid=$(docker compose ps -q backend)
echo ">> ждём healthcheck бэкенда..."
ok=0
for _ in $(seq 1 30); do
  h=$(docker inspect -f '{{.State.Health.Status}}' "$cid" 2>/dev/null || echo unknown)
  if [ "$h" = "healthy" ]; then ok=1; echo ">> backend: healthy"; break; fi
  sleep 2
done
docker compose ps
if [ "$ok" != "1" ]; then
  echo "!! backend не стал healthy за ~60с — смотри логи: docker compose logs --tail=50 backend" >&2
  exit 1
fi

# 6) Подчистить старые висячие образы (освобождает место, не трогает рабочие)
docker image prune -f >/dev/null 2>&1 || true

echo "[$(date '+%F %T')] deploy: готово"
