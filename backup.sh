#!/usr/bin/env bash
#
# Бэкап МРДК: дамп БД (postgres) + архив тома загрузок.
# Запуск: sudo ./backup.sh   (docker требует root/группы docker)
# Cron:   30 3 * * * /путь/к/клону/backup.sh >> /var/log/mrdk-backup.log 2>&1
#
set -euo pipefail

# Каталог проекта = каталог самого скрипта: работает на любой машине без правок.
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# Куда складывать (лучше — отдельный диск). Переопределяется окружением:
#   BACKUP_DIR=/mnt/backup ./backup.sh
BACKUP_DIR="${BACKUP_DIR:-/var/backups/mrdk}"
KEEP_DAYS=14                             # сколько дней хранить

# Имя тома docker compose строит из имени каталога проекта:
# work/ -> work_uploads, mrdk-project/ -> mrdk-project_uploads.
PROJECT_NAME="$(basename "$PROJECT_DIR" | tr '[:upper:]' '[:lower:]')"
UPLOADS_VOLUME="${UPLOADS_VOLUME:-${PROJECT_NAME}_uploads}"

cd "$PROJECT_DIR"

# Страховка: docker run с несуществующим именем тома молча СОЗДАЛ бы его пустым,
# и в архив уехала бы пустота. Бэкапим только существующий том.
docker volume inspect "$UPLOADS_VOLUME" >/dev/null 2>&1 \
  || { echo "!! том $UPLOADS_VOLUME не найден (см. docker volume ls) — бэкап прерван" >&2; exit 1; }
mkdir -p "$BACKUP_DIR"
chmod 700 "$BACKUP_DIR"                   # внутри — хеши паролей, прячем от чужих
STAMP="$(date +%F_%H%M)"

echo "[$(date '+%F %T')] backup start -> $BACKUP_DIR (stamp $STAMP)"

# Пишем во временные файлы и переименовываем ТОЛЬКО по успеху. Иначе упавший
# pg_dump (pipefail корректно валит скрипт) оставлял бы на диске обрезанный
# архив под обычным именем — по нему не отличить битый бэкап от годного, и
# именно его можно было бы выбрать при восстановлении. Имена скрытые, поэтому
# ротация ниже (db-*/uploads-*) их не подхватывает.
DB_PART=".db-$STAMP.sql.gz.part"
UP_PART=".uploads-$STAMP.tar.gz.part"
cleanup_partial() { rm -f "$BACKUP_DIR/$DB_PART" "$BACKUP_DIR/$UP_PART"; }
trap cleanup_partial EXIT

# 1) Дамп БД (pg_dump из самого контейнера — версия совпадёт с сервером)
docker compose exec -T postgres pg_dump -U mrdk --clean --if-exists mrdk \
  | gzip > "$BACKUP_DIR/$DB_PART"
mv "$BACKUP_DIR/$DB_PART" "$BACKUP_DIR/db-$STAMP.sql.gz"

# 2) Архив тома загрузок
docker run --rm \
  -v "${UPLOADS_VOLUME}:/src:ro" \
  -v "${BACKUP_DIR}:/dst" \
  alpine tar czf "/dst/$UP_PART" -C /src .
mv "$BACKUP_DIR/$UP_PART" "$BACKUP_DIR/uploads-$STAMP.tar.gz"

# 3) Ротация — удалить копии старше KEEP_DAYS
find "$BACKUP_DIR" -name 'db-*.sql.gz'      -mtime +"$KEEP_DAYS" -delete
find "$BACKUP_DIR" -name 'uploads-*.tar.gz' -mtime +"$KEEP_DAYS" -delete

DB_SIZE=$(du -h "$BACKUP_DIR/db-$STAMP.sql.gz" | cut -f1)
UP_SIZE=$(du -h "$BACKUP_DIR/uploads-$STAMP.tar.gz" | cut -f1)
echo "[$(date '+%F %T')] backup OK: db-$STAMP.sql.gz ($DB_SIZE) + uploads-$STAMP.tar.gz ($UP_SIZE)"

# 4) (опционально) offsite-копия — раскомментируй и впиши назначение:
# rsync -az --delete "$BACKUP_DIR/" user@backup-host:/srv/backups/mrdk/
