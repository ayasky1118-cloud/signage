# -----------------------------------------------------------------------------
# signage フロントエンド Dockerfile
# Vue 3 + Vite をビルドし、nginx で静的配信する
# -----------------------------------------------------------------------------

# Stage 1: ビルド
FROM node:20-alpine AS builder

WORKDIR /app

# パッケージファイルをコピー
COPY package.json package-lock.json* ./

# 依存関係インストール（本番用は npm ci でロックファイル準拠）
RUN npm ci

# ソースをコピーしてビルド
COPY . .

# ビルド時の環境変数（未指定時は空。--build-arg で上書き可能）
ARG VITE_API_BASE=""
ARG VITE_MAPTILER_API_KEY=""
ARG VITE_COGNITO_USER_POOL_ID=""
ARG VITE_COGNITO_USER_POOL_CLIENT_ID=""

ENV VITE_API_BASE=$VITE_API_BASE
ENV VITE_MAPTILER_API_KEY=$VITE_MAPTILER_API_KEY
ENV VITE_COGNITO_USER_POOL_ID=$VITE_COGNITO_USER_POOL_ID
ENV VITE_COGNITO_USER_POOL_CLIENT_ID=$VITE_COGNITO_USER_POOL_CLIENT_ID

RUN npm run build

# -----------------------------------------------------------------------------
# Stage 2: 本番用 nginx
# -----------------------------------------------------------------------------
FROM nginx:alpine

# デフォルトの nginx 設定を削除し、カスタム設定をコピー
RUN rm -rf /usr/share/nginx/html/*

COPY --from=builder /app/dist /usr/share/nginx/html

# SPA 用: すべてのパスを index.html にフォールバック
RUN echo 'server { \
    listen 80; \
    root /usr/share/nginx/html; \
    index index.html; \
    location / { \
        try_files $uri $uri/ /index.html; \
    } \
    location /health { \
        return 200 "ok"; \
        add_header Content-Type text/plain; \
    } \
}' > /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
