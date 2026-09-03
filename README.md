# Super Manager — Admin Dashboard

CoreUI (React) admin shell for Apple Super Manager, secured with Keycloak.

## Stack

- **CoreUI Free React Admin Template 5.4** — layout, sidebar, header, components
- **Bootstrap 5 / SCSS** — via `@coreui/coreui`
- **Tailwind CSS v4** — utility layer (`src/styles/tailwind.css`), preflight disabled so it
  coexists with the Bootstrap reboot
- **Font Awesome Pro 6.7.2** — vendored under `src/assets/fontawesome`, imported from
  `src/styles/fontawesome.css`
- **keycloak-js 26** — OIDC auth code flow with PKCE

## Getting started

### Local dev (Vite on the host)

```bash
# 1. start Keycloak (from the repo root)
docker compose up -d keycloak

# 2. install + run the dashboard
cd super-manager
npm install
npm run dev        # http://localhost:5173
```

### Full Docker stack (Keycloak + containerized frontend)

From the repo root, create a local `.env` from `.env.example`, change the placeholder
passwords, then build and run everything:

```bash
cp .env.example .env
docker compose up -d --build
```

- Keycloak: http://localhost:8080
- Dashboard (nginx-served production build): http://localhost:5173

The frontend is a multi-stage build (`super-manager/Dockerfile`): Node builds the Vite
bundle, then nginx (`super-manager/nginx.conf`) serves the static output with SPA
fallback. Because Vite inlines `VITE_*` values at **build time**, they are passed as
build args in `docker-compose.yml` and must reference URLs the **browser** can reach
(hence `http://localhost:8080` for local Keycloak, not an internal Docker hostname).
Override them via a root `.env` file or the shell, then rebuild:

```bash
VITE_KEYCLOAK_URL=https://auth.example.com docker compose up -d --build frontend
```

The imported realm uses the `ASM_REALM_ADMIN_*` values from the root `.env` file for
its initial administrator (realm `central`, client `super-manager-app`). Change these
values before the first import; Keycloak will not update an existing imported realm on
later container starts.

## Configuration

Copy `.env.example` to `.env` and adjust if needed:

| Variable | Default | Description |
| --- | --- | --- |
| `VITE_KEYCLOAK_URL` | `http://localhost:8080` | Keycloak base URL |
| `VITE_KEYCLOAK_REALM` | `central` | Realm name |
| `VITE_KEYCLOAK_CLIENT_ID` | `super-manager-app` | Public client id |
| `VITE_APPLE_PROXY_API_URL` | `/api/proxy-manager` | Apple Proxy API path; keep relative to avoid browser CORS |
| `VITE_DEV_APPLE_PROXY_API_TARGET` | `http://127.0.0.1:8000` | Dev-server proxy target for `/api/proxy-manager` |

Root Docker settings live in `../.env.example`:

| Variable | Description |
| --- | --- |
| `KC_BOOTSTRAP_ADMIN_USERNAME` | Keycloak bootstrap admin username |
| `KC_BOOTSTRAP_ADMIN_PASSWORD` | Keycloak bootstrap admin password; required by Compose |
| `ASM_REALM_ADMIN_USERNAME` | Username for the seeded realm administrator |
| `ASM_REALM_ADMIN_PASSWORD` | Password for the seeded realm administrator; required by Compose |
| `ASM_REALM_ADMIN_EMAIL` | Email for the seeded realm administrator |

The dev server is pinned to port **5173** because the realm's redirect URIs and web
origins are registered for that origin.

## Auth

Everything lives in `src/auth`:

- `keycloak.js` — the `Keycloak` instance built from env vars
- `AuthProvider.js` — runs `init({ onLoad: 'check-sso' })` once, refreshes tokens on
  expiry, and exposes `useAuth()`
- `ProtectedRoute.js` — redirects anonymous users to Keycloak, and can require roles

`useAuth()` returns `{ keycloak, authenticated, token, username, name, email, roles, hasRole, login, logout, accountUrl, updateToken }`.

Guard a route by role:

```jsx
<ProtectedRoute roles={['admin']}>
  <AdminOnlyPage />
</ProtectedRoute>
```

Attach the token to an API call:

```js
const { updateToken, keycloak } = useAuth()
await updateToken(30)
fetch('/api/things', { headers: { Authorization: `Bearer ${keycloak.token}` } })
```

## Testing the login flow

```bash
npm run test:login
```

Drives the real OIDC authorization-code + PKCE flow against Keycloak — the same
sequence `keycloak-js` performs in the browser — and asserts each step: discovery,
login page, credential submission, authorization code, token exchange, token
claims/roles, `/userinfo` acceptance, and refresh-token renewal. Requires Keycloak
to be running; the last check is skipped if the dev server is not.

Override the defaults with env vars when needed:

```bash
TEST_USERNAME=someone TEST_PASSWORD=secret npm run test:login
```

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Vite dev server on port 5173 |
| `npm run build` | Production build into `build/` |
| `npm run serve` | Preview the production build |
| `npm run lint` | ESLint + Prettier (`-- --fix` to autofix) |
| `npm run test:login` | End-to-end Keycloak login smoke test |
