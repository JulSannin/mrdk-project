FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build          # tsc -b && vite build  ->  /app/dist

FROM nginx:alpine
COPY --from=builder /app/dist /var/www/dist
