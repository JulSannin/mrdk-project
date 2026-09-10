#!/usr/bin/env bash
#
# Разовая перекомпрессия картинок в томе загрузок МРДК.
#
# Зачем: multer кладёт файл на диск КАК ЕСТЬ (config/multer.ts — только случайное
# имя и лимит 5 МБ, никакой обработки). Поэтому на карточку 400x450 приезжает
# оригинал с телефона на 3-4 МБ, а страница /events тянет 24 таких разом. Скрипт
# приводит уже накопленные файлы к вменяемому размеру: ресайз до 1920px по длинной
# стороне + перекодирование. Имена файлов не меняются, БД не трогается.
#
# ⚠️ Оригиналы ПЕРЕЗАПИСЫВАЮТСЯ. MAX_SIDE выбирается один раз и осознанно: поднять
# разрешение потом можно только из бэкапа. Почему именно 1920 — в optimize-uploads.mjs.
#
# Запуск на сервере: sudo ./optimize-uploads.sh
# (sudo — потому что шаг с бэкапом внутри пишет в /var/backups/mrdk, см. backup.sh)
#   DRY_RUN=1 ./optimize-uploads.sh     # посмотреть, что будет, ничего не меняя (можно без sudo)
#   SKIP_BACKUP=1 sudo ./optimize-uploads.sh  # если бэкап уже снят вручную
#   MAX_SIDE=2560 QUALITY=85 sudo ./optimize-uploads.sh
#
# ⚠️ Именно ./optimize-uploads.sh, а не `sh optimize-uploads.sh`: под dash нет
# `set -o pipefail`, и упавший шаг остался бы незамеченным (как в deploy.sh).
[ -n "${BASH_VERSION:-}" ] || {
  echo "Запускай ./optimize-uploads.sh (нужен bash), а не sh optimize-uploads.sh" >&2; exit 1; }

set -euo pipefail

# Каталог проекта = каталог самого скрипта: работает на любой машине без правок.
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# Имя тома docker compose строит из имени каталога проекта (как в backup.sh):
# work/ -> work_uploads, mrdk-project/ -> mrdk-project_uploads.
PROJECT_NAME="$(basename "$PROJECT_DIR" | tr '[:upper:]' '[:lower:]')"
UPLOADS_VOLUME="${UPLOADS_VOLUME:-${PROJECT_NAME}_uploads}"
SKIP_BACKUP="${SKIP_BACKUP:-0}"
DRY_RUN="${DRY_RUN:-0}"

cd "$PROJECT_DIR"

# Та же страховка, что в backup.sh: docker run с несуществующим именем тома молча
# СОЗДАЛ бы его пустым, и скрипт бодро отчитался бы «найдено 0 картинок».
docker volume inspect "$UPLOADS_VOLUME" >/dev/null 2>&1 \
  || { echo "!! том $UPLOADS_VOLUME не найден (см. docker volume ls) — прогон прерван" >&2; exit 1; }

# Операция необратимая — оригиналы перезаписываются. Бэкап обязателен, кроме
# пробного прогона (он ничего не пишет) и явного SKIP_BACKUP=1.
if [ "$DRY_RUN" != "1" ] && [ "$SKIP_BACKUP" != "1" ]; then
  [ -x ./backup.sh ] || { echo "!! backup.sh не найден или не исполняемый — прогон прерван" >&2; exit 1; }
  echo ">> бэкап перед перекомпрессией"
  ./backup.sh
fi

echo "[$(date '+%F %T')] optimize-uploads: старт (том $UPLOADS_VOLUME)"

# Одноразовый контейнер: sharp ставится в него и уезжает вместе с ним — в образ
# бэкенда зависимость не добавляется. Побочная польза: это заодно проверка, что
# musl-сборка sharp на этом сервере вообще работает, — до того, как её закладывать
# в mrdk-back/Dockerfile.
#
# ⚠️ `npm init -y` перед install — не формальность. Без package.json npm ищет
# корень проекта ВВЕРХ по дереву каталогов и ставит пакет туда, где найдёт
# (вплоть до /). Проверено: в такой ситуации sharp уезжает мимо /opt/tool,
# а node потом подхватывает его случайно, обходом вверх по node_modules.
#
# --memory=512m: на 1 ГБ ОЗУ рядом крутятся postgres, backend и nginx. Даже если
# контейнер словит OOM, файлы целы — запись идёт во временный файл, а рабочий
# заменяется только законченным (см. optimize-uploads.mjs).
docker run --rm \
  --memory=512m \
  -v "${UPLOADS_VOLUME}:/data" \
  -v "${PROJECT_DIR}/optimize-uploads.mjs:/opt/optimize-uploads.mjs:ro" \
  -e "DRY_RUN=${DRY_RUN}" \
  -e "MAX_SIDE=${MAX_SIDE:-1920}" \
  -e "QUALITY=${QUALITY:-82}" \
  -e "SKIP_BYTES=${SKIP_BYTES:-409600}" \
  -e "MIN_GAIN=${MIN_GAIN:-0.1}" \
  node:24-alpine \
  sh -c 'mkdir -p /opt/tool && cd /opt/tool && npm init -y >/dev/null && npm install --no-audit --no-fund --loglevel=error sharp && cp /opt/optimize-uploads.mjs ./run.mjs && node run.mjs'

echo "[$(date '+%F %T')] optimize-uploads: готово"
# Перезапускать nginx не нужно: он открывает файлы по пути на каждый запрос,
# open_file_cache в nginx.conf не включён.
#
# NB: заголовок Cache-Control для /uploads/ — "immutable, max-age=2592000"
# (nginx.conf), а имена файлов не изменились. У тех, кто уже заходил на сайт,
# в браузере останутся старые тяжёлые версии — максимум 30 дней. Новые
# посетители и поисковые роботы получают облегчённые сразу.
