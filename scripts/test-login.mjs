#!/usr/bin/env node
/**
 * End-to-end Keycloak login smoke test.
 *
 * Drives the real OpenID Connect authorization-code + PKCE flow against a running
 * Keycloak, exactly the way keycloak-js does in the browser:
 *
 *   1. GET  /auth                    -> login page
 *   2. POST the login form           -> redirect carrying ?code=
 *   3. POST /token with code+verifier -> access / refresh / id tokens
 *   4. GET  /userinfo                -> verify the token is actually accepted
 *   5. POST /token (refresh_token)   -> verify silent refresh works
 *
 * Usage:  npm run test:login
 */

import { createHash, randomBytes } from 'node:crypto'

const KC_URL = process.env.VITE_KEYCLOAK_URL || 'http://localhost:8080'
const REALM = process.env.VITE_KEYCLOAK_REALM || 'central'
const CLIENT_ID = process.env.VITE_KEYCLOAK_CLIENT_ID || 'super-manager-app'
const APP_URL = process.env.APP_URL || 'http://localhost:5173'
const USERNAME = process.env.TEST_USERNAME || 'admin'
const PASSWORD = process.env.TEST_PASSWORD || 'admin123'
const REDIRECT_URI = `${APP_URL}/dashboard`

const green = (s) => `\x1b[32m${s}\x1b[0m`
const red = (s) => `\x1b[31m${s}\x1b[0m`
const dim = (s) => `\x1b[2m${s}\x1b[0m`

let step = 0
const pass = (msg, detail) => {
  step += 1
  console.log(`${green('PASS')} ${step}. ${msg}${detail ? dim(`  (${detail})`) : ''}`)
}
const fail = (msg, detail) => {
  console.error(`${red('FAIL')} ${step + 1}. ${msg}`)
  if (detail) console.error(dim(`      ${detail}`))
  process.exit(1)
}

// --- tiny cookie jar -------------------------------------------------------
// Keycloak's login flow depends on AUTH_SESSION_ID / KC_RESTART being replayed.
const jar = new Map()
const storeCookies = (res) => {
  for (const raw of res.headers.getSetCookie?.() ?? []) {
    const [pair] = raw.split(';')
    const idx = pair.indexOf('=')
    if (idx > 0) jar.set(pair.slice(0, idx).trim(), pair.slice(idx + 1).trim())
  }
}
const cookieHeader = () => [...jar].map(([k, v]) => `${k}=${v}`).join('; ')

const base64url = (buf) =>
  buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')

const main = async () => {
  console.log(dim(`realm    ${KC_URL}/realms/${REALM}`))
  console.log(dim(`client   ${CLIENT_ID}`))
  console.log(dim(`user     ${USERNAME}\n`))

  // PKCE pair
  const verifier = base64url(randomBytes(32))
  const challenge = base64url(createHash('sha256').update(verifier).digest())

  // --- 0. discovery --------------------------------------------------------
  const discoveryUrl = `${KC_URL}/realms/${REALM}/.well-known/openid-configuration`
  let cfg
  try {
    const res = await fetch(discoveryUrl)
    if (!res.ok) fail(`Discovery returned HTTP ${res.status}`, discoveryUrl)
    cfg = await res.json()
  } catch (err) {
    fail('Cannot reach Keycloak', `${err.message}\n      Is it running?  docker compose up -d`)
  }
  pass('Keycloak discovery document reachable')

  // --- 1. authorization endpoint serves the login page ---------------------
  const authUrl =
    `${cfg.authorization_endpoint}?client_id=${encodeURIComponent(CLIENT_ID)}` +
    `&redirect_uri=${encodeURIComponent(REDIRECT_URI)}` +
    `&response_type=code&scope=openid` +
    `&code_challenge=${challenge}&code_challenge_method=S256`

  const authRes = await fetch(authUrl, { redirect: 'manual' })
  storeCookies(authRes)
  const html = await authRes.text()

  if (html.includes('Invalid parameter: redirect_uri')) {
    fail(
      'Keycloak rejected the redirect URI',
      `${REDIRECT_URI} is not registered for client "${CLIENT_ID}".\n` +
        `      Check redirectUris in keycloak/realm.json, then: docker compose down && docker compose up -d`,
    )
  }
  const formAction = html.match(/action="([^"]+)"/)?.[1]?.replace(/&amp;/g, '&')
  if (!formAction) fail('No login form on the authorization page', `HTTP ${authRes.status}`)
  pass('Authorization endpoint served the login form')

  // --- 2. submit credentials ----------------------------------------------
  const loginRes = await fetch(formAction, {
    method: 'POST',
    redirect: 'manual',
    headers: {
      'content-type': 'application/x-www-form-urlencoded',
      cookie: cookieHeader(),
    },
    body: new URLSearchParams({ username: USERNAME, password: PASSWORD, credentialId: '' }),
  })
  storeCookies(loginRes)

  const location = loginRes.headers.get('location')
  if (!location) {
    const body = (await loginRes.text()).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ')
    const hint = /Invalid username or password/i.test(body)
      ? `Credentials rejected. Expected ${USERNAME}/${PASSWORD} to exist in realm "${REALM}".`
      : body.slice(0, 200)
    fail('Login did not redirect', hint)
  }
  pass('Credentials accepted')

  // --- 3. authorization code ----------------------------------------------
  const code = new URL(location).searchParams.get('code')
  if (!code) fail('No authorization code in the redirect', location)
  if (!location.startsWith(REDIRECT_URI)) {
    fail('Redirected to an unexpected URI', `expected ${REDIRECT_URI}, got ${location}`)
  }
  pass('Authorization code returned', `redirect matches ${REDIRECT_URI}`)

  // --- 4. token exchange (PKCE) -------------------------------------------
  const tokenRes = await fetch(cfg.token_endpoint, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: CLIENT_ID,
      code,
      redirect_uri: REDIRECT_URI,
      code_verifier: verifier,
    }),
  })
  const tokens = await tokenRes.json()
  if (!tokenRes.ok) fail('Token exchange failed', JSON.stringify(tokens))
  if (!tokens.access_token) fail('No access_token in the token response')
  pass('PKCE token exchange succeeded', `expires_in=${tokens.expires_in}s`)

  // --- 5. inspect claims ---------------------------------------------------
  const claims = JSON.parse(Buffer.from(tokens.access_token.split('.')[1], 'base64url').toString())
  const roles = claims.realm_access?.roles ?? []
  if (claims.preferred_username !== USERNAME) {
    fail('Token belongs to the wrong user', `got ${claims.preferred_username}`)
  }
  if (!roles.includes('admin')) {
    fail('Expected realm role "admin" is missing', `roles: ${roles.join(', ') || 'none'}`)
  }
  pass('Access token claims are correct', `roles: ${roles.join(', ')}`)

  // --- 6. userinfo accepts the token --------------------------------------
  const userinfoRes = await fetch(cfg.userinfo_endpoint, {
    headers: { authorization: `Bearer ${tokens.access_token}` },
  })
  if (!userinfoRes.ok) fail('Access token rejected by /userinfo', `HTTP ${userinfoRes.status}`)
  const userinfo = await userinfoRes.json()
  pass('Access token accepted by /userinfo', userinfo.email || userinfo.preferred_username)

  // --- 7. refresh flow -----------------------------------------------------
  const refreshRes = await fetch(cfg.token_endpoint, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: CLIENT_ID,
      refresh_token: tokens.refresh_token,
    }),
  })
  if (!refreshRes.ok) fail('Refresh token exchange failed', JSON.stringify(await refreshRes.json()))
  pass('Refresh token flow works', 'silent renewal will succeed')

  // --- 8. app is serving ---------------------------------------------------
  try {
    const appRes = await fetch(`${APP_URL}/silent-check-sso.html`)
    if (!appRes.ok) throw new Error(`HTTP ${appRes.status}`)
    pass('Dev server is serving silent-check-sso.html')
  } catch (err) {
    console.log(
      `${dim('SKIP')} ${step + 1}. Dev server not running at ${APP_URL} ${dim(`(${err.message})`)}`,
    )
  }

  console.log(`\n${green('Login flow OK')} — ${step} checks passed.`)
}

main().catch((err) => fail('Unexpected error', err.stack))
