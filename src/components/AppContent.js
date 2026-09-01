import React, { Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { CContainer, CSpinner } from '@coreui/react'

import routes from '../routes'
import { getApps } from '../apps/registry'
import { ProtectedRoute } from '../auth'

const appsByBasePath = getApps()

/** Roles required for a route, derived from the registered app that owns it. */
const requiredRolesFor = (path) => {
  const owner = appsByBasePath.find(
    (app) => path === app.basePath || path.startsWith(`${app.basePath}/`),
  )
  return owner?.requiredRoles || []
}

const AppContent = () => {
  return (
    <CContainer className="px-4" lg>
      <Suspense fallback={<CSpinner color="primary" />}>
        <Routes>
          {routes.map((route, idx) => {
            if (!route.element) return null
            const roles = requiredRolesFor(route.path)
            const element = roles.length ? (
              <ProtectedRoute roles={roles}>
                <route.element />
              </ProtectedRoute>
            ) : (
              <route.element />
            )
            return <Route key={idx} path={route.path} name={route.name} element={element} />
          })}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<Navigate to="/404" replace />} />
        </Routes>
      </Suspense>
    </CContainer>
  )
}

export default React.memo(AppContent)
