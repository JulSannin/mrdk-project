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
set -euo pipefail

PROJECT_DIR="/mnt/HDD/projects/work"   # на сервере поправить под свой путь к клону
BACKUP_BEFORE=0                        # 1 = снять бэкап перед up (миграции накатятся на старте)

cd "$PROJECT_DIR"

echo "[$(date '+%F %T')] deploy: старт"

# 1) Свежий код (ff-only — без неожиданных merge-коммитов; упадёт при расхождении)
echo ">> было: $(git rev-parse --short HEAD)"
git pull --ff-only
echo ">> стало: $(git rev-parse --short HEAD)"

# 2) (опц.) бэкап БД+загрузок ПЕРЕД миграциями — откатиться, если миграция сломает данные
if [ "$BACKUP_BEFORE" = "1" ] && [ -x ./backup.sh ]; then
  echo ">> бэкап перед деплоем"
  ./backup.sh
fi

# 3) Пересборка образов (backend печёт dist; front — vite build в nginx-образ)
docker compose build

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
