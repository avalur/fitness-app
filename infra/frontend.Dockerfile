# syntax=docker/dockerfile:1
FROM node:20-alpine AS deps
WORKDIR /app/frontend
COPY frontend/package.json ./
RUN npm i -g pnpm@9 && pnpm install --frozen-lockfile || true

FROM node:20-alpine AS build
WORKDIR /app/frontend
COPY --from=deps /app/frontend/node_modules ./node_modules
COPY frontend ./
RUN npm i -g pnpm@9 && pnpm build || true

FROM nginx:alpine AS serve
COPY --from=build /app/frontend/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
