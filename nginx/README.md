# React Frontend Nginx Config

This folder contains Nginx configs for exposing the Apple Super Manager React frontend through the existing Docker Nginx container.

## Files

- `frontend.https.conf` — recommended HTTPS config for `https://manager.goldappleid.ir/`, proxying to `asm-frontend:80`.
- `frontend.conf` — temporary no-domain HTTP/IP config on port `8088`.

## Recommended Docker Nginx Mount

Because Nginx runs inside Docker, keep this config in the project directory and mount it into the existing Nginx container.

In the Docker Compose file that runs `appl_nginx`, add this under the `nginx.volumes` list:

```yaml
- /srv/apple-super-manager/super-manager/nginx/frontend.https.conf:/etc/nginx/conf.d/apple-super-manager-frontend.conf:ro
```

This avoids copying the config into another project directory and keeps the source of truth here:

```text
/srv/apple-super-manager/super-manager/nginx/frontend.https.conf
```

## DNS

Create this DNS `A` record:

```text
manager.goldappleid.ir -> 156.255.1.156
```

If you use another subdomain, update `server_name` and certificate paths in `frontend.https.conf`.

## SSL Certificate

From the Docker Nginx project, issue the certificate using the existing Certbot container/volumes:

```bash
cd /srv/apple-updater
docker compose run --rm certbot certonly --webroot --webroot-path /var/www/certbot -d manager.goldappleid.ir
```

## Frontend Environment

In `/srv/apple-super-manager/.env`, use browser-reachable HTTPS URLs:

```env
VITE_KEYCLOAK_URL=https://keycloak.goldappleid.ir
VITE_KEYCLOAK_REALM=central
VITE_KEYCLOAK_CLIENT_ID=super-manager-app
VITE_APPLE_PROXY_API_URL=https://goldappleid.ir/api/proxy-manager
```

Then rebuild because Vite embeds these values during build:

```bash
cd /srv/apple-super-manager
docker compose build --no-cache frontend
docker compose up -d frontend
```

## Reload Docker Nginx

After mounting the config and issuing the certificate:

```bash
cd /srv/apple-updater
docker compose up -d nginx
docker exec appl_nginx nginx -t
docker exec appl_nginx nginx -s reload
```

## Keycloak Client Settings

In Keycloak admin, update the `super-manager-app` client:

```text
Valid redirect URIs: https://manager.goldappleid.ir/*
Web origins: https://manager.goldappleid.ir
```
