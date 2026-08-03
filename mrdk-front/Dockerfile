FROM node:24-alpine AS builder
WORKDIR /app

# Прод-сервер — 1 ядро / 1 ГБ. Потолок кучи не даёт V8 расти бесконтрольно:
# при нехватке памяти получаем внятную ошибку сборки, а не своп-трэшинг и
# зависший сервер. Замерено: vite build укладывается (пик RSS ~450 МБ).
ENV NODE_OPTIONS=--max-old-space-size=384

COPY package*.json ./
RUN npm ci
COPY . .
# build:image = только `vite build`, без `tsc -b`. Типы образу не нужны, а tsc —
# самый тяжёлый шаг (пик ~570 МБ против ~450 у vite). Типы проверяет CI
# (.github/workflows/frontend.yml: typecheck + build) до того, как код попадёт
# в main, откуда deploy.sh его и тянет.
RUN npm run build:image    # -> /app/dist

FROM nginx:alpine
COPY --from=builder /app/dist /var/www/dist
