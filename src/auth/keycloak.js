import Keycloak from 'keycloak-js'

export const keycloakConfig = {
  url: import.meta.env.VITE_KEYCLOAK_URL || 'https://keycloak.goldappleid.ir',
  realm: import.meta.env.VITE_KEYCLOAK_REALM || 'central',
  clientId: import.meta.env.VITE_KEYCLOAK_CLIENT_ID || 'super-manager-app',
}

const keycloak = new Keycloak(keycloakConfig)

export default keycloak
