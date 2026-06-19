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

PROJECT_DIR="/mnt/HDD/projects/work"
BACKUP_DIR="/mnt/HDD/backups/mrdk"
UPLOADS_VOLUME="work_uploads"

cd "$PROJECT_DIR"

usage() { grep -E '^#( |$)' "$0" | sed 's/^# \{0,1\}//'; exit 1; }

confirm() {
  read -r -p "Это ПЕРЕЗАПИШЕТ текущие данные. Продолжить? [y/N] " a
  [[ "$a" =~ ^[Yy]$ ]] || { echo "Отмена."; exit 1; }
}

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
    confirm; restore_db "$2"
    docker compose restart backend
    ;;
  uploads)
    [ $# -eq 2 ] || usage
    confirm; restore_uploads "$2"
    docker compose restart backend nginx
    ;;
  *)
    confirm
    restore_db "$1"
    restore_uploads "$1"
    echo ">> Перезапускаю сервисы"
    docker compose restart backend nginx
    ;;
esac

echo ">> Готово."
