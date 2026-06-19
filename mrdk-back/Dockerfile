FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json tsconfig.json ./
RUN npm ci

COPY . .
RUN npm run build


FROM node:20-alpine

RUN apk add --no-cache curl

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY --from=builder /app/dist ./dist
COPY migrations ./migrations

# Не работаем от root: каталог загрузок отдаём пользователю node (uid 1000),
# остальное (dist/migrations/node_modules) — root-овое, но world-readable (чтение ок).
# Свежий том work_uploads на первом старте унаследует владельца node от этой точки.
RUN mkdir -p uploads/events uploads/workplan uploads/documents uploads/reminders \
 && chown -R node:node uploads
USER node

EXPOSE 3001
CMD ["node", "dist/server.js"]