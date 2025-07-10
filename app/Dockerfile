FROM node:24-alpine AS builder
# Собираем frontend
WORKDIR /build

# Копируем все файлы проекта
COPY . .
RUN npm install
RUN VITE_RPC_URL=https://devnet.helius-rpc.com/?api-key=8ae7768b-c9d7-44de-9bbb-22eaa221ba50 VITE_WS_URL=wss://devnet.helius-rpc.com/?api-key=8ae7768b-c9d7-44de-9bbb-22eaa221ba50 npm run build

# Этап production
FROM nginx:1.23.1-alpine
RUN rm -rf /usr/share/nginx/html/* && rm -rf /etc/nginx/conf.d/*

COPY --from=builder /build/dist /usr/share/nginx/html
COPY --from=builder /build/nginx/default.conf /etc/nginx/conf.d/

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
