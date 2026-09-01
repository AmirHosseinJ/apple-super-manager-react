import React, { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { CButton, CCard, CCardBody, CCardGroup, CCol, CContainer, CRow } from '@coreui/react'
import { useAuth } from '../../../auth'

const Login = () => {
  const { authenticated, login } = useAuth()
  const location = useLocation()

  const redirectUri = `${window.location.origin}${location.state?.from || '/dashboard'}`

  useEffect(() => {
    if (authenticated) {
      window.location.replace(redirectUri)
    }
  }, [authenticated, redirectUri])

  return (
    <div className="bg-body-tertiary min-vh-100 d-flex flex-row align-items-center">
      <CContainer>
        <CRow className="justify-content-center">
          <CCol md={8}>
            <CCardGroup>
              <CCard className="p-4">
                <CCardBody>
                  <h1>Sign in</h1>
                  <p className="text-body-secondary">
                    Authentication is handled by Keycloak. You will be redirected to the identity
                    provider.
                  </p>
                  <CButton color="primary" className="px-4" onClick={() => login({ redirectUri })}>
                    <i className="fa-solid fa-right-to-bracket me-2" />
                    Continue with Keycloak
                  </CButton>
                </CCardBody>
              </CCard>
              <CCard className="text-white bg-primary py-5" style={{ width: '44%' }}>
                <CCardBody className="text-center">
                  <div>
                    <h2>Apple Super Manager</h2>
                    <p className="mt-3">
                      Single sign-on for the whole management console. Accounts, roles and passwords
                      are managed centrally in Keycloak.
                    </p>
                  </div>
                </CCardBody>
              </CCard>
            </CCardGroup>
          </CCol>
        </CRow>
      </CContainer>
    </div>
  )
}

export default Login
