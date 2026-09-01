import React from 'react'
import { CFooter } from '@coreui/react'

const AppFooter = () => {
  return (
    <CFooter className="px-4">
      <div>
        <span className="fw-semibold">Apple Super Manager</span>
        <span className="ms-1 text-body-secondary">&copy; {new Date().getFullYear()}</span>
      </div>
      <div className="ms-auto text-body-secondary">
        Secured by <i className="fa-solid fa-shield-halved mx-1" /> Keycloak
      </div>
    </CFooter>
  )
}

export default React.memo(AppFooter)
