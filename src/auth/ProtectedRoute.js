import React, { useEffect } from 'react'
import PropTypes from 'prop-types'
import { CAlert, CButton, CSpinner } from '@coreui/react'
import { useAuth } from './AuthProvider'

const ProtectedRoute = ({ children, roles = [] }) => {
  const { authenticated, error, login, logout, hasRole } = useAuth()

  useEffect(() => {
    if (!authenticated && !error) {
      login()
    }
  }, [authenticated, error, login])

  if (error) {
    return (
      <div className="d-flex min-vh-100 align-items-center justify-content-center p-4">
        <CAlert color="danger" className="text-center">
          <h5>Cannot reach the identity provider</h5>
          <p className="mb-3">{error.message || 'Keycloak did not respond.'}</p>
          <CButton color="danger" variant="outline" onClick={() => window.location.reload()}>
            Retry
          </CButton>
        </CAlert>
      </div>
    )
  }

  if (!authenticated) {
    return (
      <div className="d-flex min-vh-100 align-items-center justify-content-center">
        <CSpinner color="primary" variant="grow" />
      </div>
    )
  }

  const missingRole = roles.length > 0 && !roles.some((role) => hasRole(role))

  if (missingRole) {
    return (
      <div className="d-flex min-vh-100 align-items-center justify-content-center p-4">
        <CAlert color="warning" className="text-center">
          <h5>Not authorized</h5>
          <p className="mb-3">
            This area requires one of the following roles: <strong>{roles.join(', ')}</strong>.
          </p>
          <CButton color="warning" variant="outline" onClick={logout}>
            Sign in as a different user
          </CButton>
        </CAlert>
      </div>
    )
  }

  return children
}

ProtectedRoute.propTypes = {
  children: PropTypes.node,
  roles: PropTypes.arrayOf(PropTypes.string),
}

export default ProtectedRoute
