# syntax=docker/dockerfile:1

# ---------- Stage 1: build the Vite bundle ----------
FROM node:20-alpine AS build

WORKDIR /app

# Vite inlines VITE_* variables at build time, so they must be present
# during `npm run build`. They are passed as build args (see docker-compose.yml).
ARG VITE_KEYCLOAK_URL=http://localhost:8080
ARG VITE_KEYCLOAK_REALM=central
ARG VITE_KEYCLOAK_CLIENT_ID=super-manager-app
ARG VITE_APPLE_PROXY_API_URL=/api/proxy-manager

ENV VITE_KEYCLOAK_URL=$VITE_KEYCLOAK_URL \
    VITE_KEYCLOAK_REALM=$VITE_KEYCLOAK_REALM \
    VITE_KEYCLOAK_CLIENT_ID=$VITE_KEYCLOAK_CLIENT_ID \
    VITE_APPLE_PROXY_API_URL=$VITE_APPLE_PROXY_API_URL

# Install dependencies first to leverage Docker layer caching.
COPY package.json package-lock.json ./
RUN npm ci

# Copy the rest of the source and produce the production build (outputs to build/).
COPY . .
RUN npm run build

# ---------- Stage 2: serve the static files with nginx ----------
FROM nginx:1.27-alpine AS runtime

# SPA-aware config so client-side routes fall back to index.html.
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Vite's build output directory is "build" (see vite.config.mjs).
COPY --from=build /app/build /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
