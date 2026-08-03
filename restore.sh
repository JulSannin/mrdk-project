#!/usr/bin/env bash
#
# Восстановление МРДК из бэкапа (см. backup.sh).
# Использование:
#   sudo ./restore.sh list                 — показать доступные копии
#   sudo ./restore.sh <STAMP>              — восстановить БД + загрузки (напр. 2026-06-17_0330)
#   sudo ./restore.sh db <STAMP>          — только БД
#   sudo ./restore.sh uploads <STAMP>     — только загрузки
#
# ⚠️ Восстановление ПЕРЕЗАПИСЫВАЕТ текущие данные.
#
set -euo pipefail

# Каталог проекта = каталог самого скрипта; BACKUP_DIR и имя тома — как в backup.sh.
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKUP_DIR="${BACKUP_DIR:-/var/backups/mrdk}"
PROJECT_NAME="$(basename "$PROJECT_DIR" | tr '[:upper:]' '[:lower:]')"
UPLOADS_VOLUME="${UPLOADS_VOLUME:-${PROJECT_NAME}_uploads}"

cd "$PROJECT_DIR"

usage() { grep -E '^#( |$)' "$0" | sed 's/^# \{0,1\}//'; exit 1; }

confirm() {
  read -r -p "Это ПЕРЕЗАПИШЕТ текущие данные. Продолжить? [y/N] " a
  [[ "$a" =~ ^[Yy]$ ]] || { echo "Отмена."; exit 1; }
}

BACKEND_STOPPED=0

# Бэкенд ОБЯЗАН быть остановлен на время заливки дампа: дамп снят с
# --clean --if-exists, то есть начинается с DROP TABLE, а живой пул соединений
# держит блокировки. Конфликт блокировок вместе с ON_ERROR_STOP=1 оборвал бы
# восстановление на середине — полубитая БД ровно в аварийном сценарии.
stop_backend() {
  echo ">> Останавливаю бэкенд на время восстановления БД"
  docker compose stop backend
  BACKEND_STOPPED=1
}

start_backend() {
  echo ">> Поднимаю бэкенд"
  docker compose start backend
  BACKEND_STOPPED=0
}

# Если восстановление упало на середине (set -e), бэкенд не должен остаться
# лежать — сайт был бы недоступен до ручного вмешательства.
on_exit() {
  [ "$BACKEND_STOPPED" = "1" ] || return 0
  echo "!! Восстановление прервано — поднимаю бэкенд обратно" >&2
  docker compose start backend || true
}
trap on_exit EXIT

restore_db() {
  local f="$BACKUP_DIR/db-$1.sql.gz"
  [ -f "$f" ] || { echo "Нет файла: $f"; exit 1; }
  echo ">> Восстанавливаю БД из $f"
  gunzip -c "$f" | docker compose exec -T postgres psql -v ON_ERROR_STOP=1 -U mrdk -d mrdk
}

restore_uploads() {
  local f="$BACKUP_DIR/uploads-$1.tar.gz"
  [ -f "$f" ] || { echo "Нет файла: $f"; exit 1; }
  echo ">> Восстанавливаю загрузки из $f (перезапишет том $UPLOADS_VOLUME)"
  docker run --rm \
    -v "${UPLOADS_VOLUME}:/dst" \
    -v "${BACKUP_DIR}:/src:ro" \
    alpine sh -c "rm -rf /dst/* && tar xzf /src/uploads-$1.tar.gz -C /dst"
}

[ $# -ge 1 ] || usage

case "$1" in
  list)
    ls -lh "$BACKUP_DIR" 2>/dev/null || echo "Каталог $BACKUP_DIR пуст или не существует"
    ;;
  db)
    [ $# -eq 2 ] || usage
    confirm
    stop_backend
    restore_db "$2"
    start_backend
    ;;
  uploads)
    # Загрузки в проде раздаёт nginx, БД не трогаем — останавливать бэкенд незачем.
    [ $# -eq 2 ] || usage
    confirm; restore_uploads "$2"
    docker compose restart backend nginx
    ;;
  *)
    confirm
    stop_backend
    restore_db "$1"
    restore_uploads "$1"
    start_backend
    echo ">> Перезапускаю nginx"
    docker compose restart nginx
    ;;
esac

echo ">> Готово."
