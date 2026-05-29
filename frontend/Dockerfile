# Збірка фронтенду
FROM node:20-slim AS builder
WORKDIR /app

# Копіюємо package.json та встановлюємо залежності окремим шаром (кешується)
COPY package.json ./
RUN npm install

# Копіюємо весь код проєкту
COPY . .

# Передаємо змінну середовища для API на етапі білду
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL

# Запускаємо продакшн-збірку Vite → папка dist/
RUN npm run build

# Легковаговий nginx для роздачі статичних файлів
FROM nginx:alpine

# Копіюємо збірку з попереднього етапу в папку nginx
COPY --from=builder /app/dist /usr/share/nginx/html

# Конфігурація nginx (проксі, кешування, SPA fallback)
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Порт контейнера
EXPOSE 80

# Запуск nginx у foreground-режимі (обов'язково для Docker)
CMD ["nginx", "-g", "daemon off;"]