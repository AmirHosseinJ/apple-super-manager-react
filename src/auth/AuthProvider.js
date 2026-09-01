import React, { createContext, useContext, useEffect, useMemo, useState } from 'react'
import PropTypes from 'prop-types'
import { CSpinner } from '@coreui/react'
import keycloak from './keycloak'

const AuthContext = createContext(null)

// Guards against a second init() call (React StrictMode / fast refresh).
let initPromise = null

const initKeycloak = () => {
  if (!initPromise) {
    initPromise = keycloak.init({
      onLoad: 'check-sso',
      pkceMethod: 'S256',
      checkLoginIframe: false,
      silentCheckSsoRedirectUri: `${window.location.origin}/silent-check-sso.html`,
    })
  }
  return initPromise
}

export const AuthProvider = ({ children }) => {
  const [initialized, setInitialized] = useState(false)
  const [authenticated, setAuthenticated] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    let active = true

    initKeycloak()
      .then((isAuthenticated) => {
        if (!active) return
        setAuthenticated(isAuthenticated)
        setInitialized(true)
      })
      .catch((err) => {
        if (!active) return
        setError(err)
        setInitialized(true)
      })

    keycloak.onAuthSuccess = () => setAuthenticated(true)
    keycloak.onAuthRefreshError = () => keycloak.login()
    keycloak.onAuthLogout = () => setAuthenticated(false)
    keycloak.onTokenExpired = () => {
      keycloak.updateToken(30).catch(() => keycloak.login())
    }

    return () => {
      active = false
    }
  }, [])

  const value = useMemo(() => {
    const tokenParsed = keycloak.tokenParsed || {}
    const realmRoles = keycloak.realmAccess?.roles || []
    const clientRoles = keycloak.resourceAccess?.[keycloak.clientId]?.roles || []

    return {
      keycloak,
      initialized,
      authenticated,
      error,
      token: keycloak.token,
      username: tokenParsed.preferred_username,
      name: tokenParsed.name || tokenParsed.preferred_username,
      email: tokenParsed.email,
      roles: [...realmRoles, ...clientRoles],
      hasRole: (role) => realmRoles.includes(role) || clientRoles.includes(role),
      login: (options) => keycloak.login(options),
      logout: () => keycloak.logout({ redirectUri: window.location.origin }),
      accountUrl: () => keycloak.createAccountUrl(),
      updateToken: (minValidity = 30) => keycloak.updateToken(minValidity),
    }
  }, [initialized, authenticated, error])

  if (!initialized) {
    return (
      <div className="d-flex min-vh-100 align-items-center justify-content-center">
        <CSpinner color="primary" variant="grow" />
      </div>
    )
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

AuthProvider.propTypes = {
  children: PropTypes.node,
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an <AuthProvider>')
  }
  return context
}

export default AuthProvider
