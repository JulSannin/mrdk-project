FROM node:24-alpine AS builder

WORKDIR /app

# Прод-сервер — 1 ядро / 1 ГБ. Потолок кучи: при нехватке памяти получаем
# ошибку сборки вместо свопа и зависшего сервера. Замерено: tsc укладывается
# (пик RSS ~420 МБ). Сборки сервисов deploy.sh запускает по очереди — вместе
# два тулчейна в 1 ГБ не помещаются.
ENV NODE_OPTIONS=--max-old-space-size=384

COPY package*.json tsconfig.json ./
RUN npm ci

COPY . .
RUN npm run build


FROM node:24-alpine

RUN apk add --no-cache curl

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY --from=builder /app/dist ./dist
COPY migrations ./migrations

# Не работаем от root: каталог загрузок отдаём пользователю node (uid 1000),
# остальное (dist/migrations/node_modules) — root-овое, но world-readable (чтение ок).
# Свежий том <каталог-клона>_uploads на первом старте унаследует владельца node
# от этой точки (compose строит имя тома из каталога проекта: work/ -> work_uploads).
# ⚠️ Если том создан РАНЬШЕ, чем появился USER node, он остался root-овым, и бэкенд
# (uid 1000) ловит EACCES на каждую запись — админка не грузит ни одного файла.
# Разово чинится снаружи:
#   docker compose down
#   docker run --rm -v <том>:/data alpine chown -R 1000:1000 /data
#   docker compose up -d
RUN mkdir -p uploads/events uploads/workplan uploads/documents uploads/reminders \
 && chown -R node:node uploads
USER node

EXPOSE 3001
CMD ["node", "dist/server.js"]