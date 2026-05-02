# Етап 1: збірка
FROM node:20-slim AS builder

WORKDIR /app

COPY package.json ./
RUN npm install

COPY . .
RUN npm run build

# Етап 2: роздача статики через nginx
FROM nginx:alpine

# Скопіювати зібраний фронтенд
COPY --from=builder /app/dist /usr/share/nginx/html

# Скопіювати конфіг nginx
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]