#!/usr/bin/env bash
#
# Бэкап МРДК: дамп БД (postgres) + архив тома загрузок (work_uploads).
# Запуск: sudo ./backup.sh   (docker требует root/группы docker)
# Cron:   30 3 * * * /mnt/HDD/projects/work/backup.sh >> /var/log/mrdk-backup.log 2>&1
#
set -euo pipefail

PROJECT_DIR="/mnt/HDD/projects/work"     # где лежит docker-compose.yml
BACKUP_DIR="/mnt/HDD/backups/mrdk"       # куда складывать (лучше — отдельный диск)
UPLOADS_VOLUME="work_uploads"            # имя тома загрузок (docker volume ls)
KEEP_DAYS=14                             # сколько дней хранить

cd "$PROJECT_DIR"
mkdir -p "$BACKUP_DIR"
chmod 700 "$BACKUP_DIR"                   # внутри — хеши паролей, прячем от чужих
STAMP="$(date +%F_%H%M)"

echo "[$(date '+%F %T')] backup start -> $BACKUP_DIR (stamp $STAMP)"

# 1) Дамп БД (pg_dump из самого контейнера — версия совпадёт с сервером)
docker compose exec -T postgres pg_dump -U mrdk --clean --if-exists mrdk \
  | gzip > "$BACKUP_DIR/db-$STAMP.sql.gz"

# 2) Архив тома загрузок
docker run --rm \
  -v "${UPLOADS_VOLUME}:/src:ro" \
  -v "${BACKUP_DIR}:/dst" \
  alpine tar czf "/dst/uploads-$STAMP.tar.gz" -C /src .

# 3) Ротация — удалить копии старше KEEP_DAYS
find "$BACKUP_DIR" -name 'db-*.sql.gz'      -mtime +"$KEEP_DAYS" -delete
find "$BACKUP_DIR" -name 'uploads-*.tar.gz' -mtime +"$KEEP_DAYS" -delete

DB_SIZE=$(du -h "$BACKUP_DIR/db-$STAMP.sql.gz" | cut -f1)
UP_SIZE=$(du -h "$BACKUP_DIR/uploads-$STAMP.tar.gz" | cut -f1)
echo "[$(date '+%F %T')] backup OK: db-$STAMP.sql.gz ($DB_SIZE) + uploads-$STAMP.tar.gz ($UP_SIZE)"

# 4) (опционально) offsite-копия — раскомментируй и впиши назначение:
# rsync -az --delete "$BACKUP_DIR/" user@backup-host:/srv/backups/mrdk/
