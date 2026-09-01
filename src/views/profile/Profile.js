import React from 'react'
import {
  CButton,
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
  CRow,
  CTable,
  CTableBody,
  CTableDataCell,
  CTableRow,
} from '@coreui/react'
import { useAuth } from '../../auth'

const Profile = () => {
  const { keycloak, name, username, email, roles, accountUrl, logout } = useAuth()
  const tokenParsed = keycloak.tokenParsed || {}

  const rows = [
    ['Name', name],
    ['Username', username],
    ['Email', email],
    ['Subject', tokenParsed.sub],
    ['Issuer', tokenParsed.iss],
    ['Roles', roles.join(', ')],
    [
      'Token expires',
      tokenParsed.exp ? new Date(tokenParsed.exp * 1000).toLocaleString() : undefined,
    ],
  ]

  return (
    <CRow>
      <CCol lg={8}>
        <CCard>
          <CCardHeader>
            <i className="fa-solid fa-user me-2" />
            Profile
          </CCardHeader>
          <CCardBody>
            <CTable borderless responsive className="mb-4">
              <CTableBody>
                {rows.map(([label, value]) => (
                  <CTableRow key={label}>
                    <CTableDataCell className="text-body-secondary" style={{ width: '35%' }}>
                      {label}
                    </CTableDataCell>
                    <CTableDataCell className="fw-semibold text-break">
                      {value || '-'}
                    </CTableDataCell>
                  </CTableRow>
                ))}
              </CTableBody>
            </CTable>

            <div className="d-flex gap-2">
              <CButton color="primary" href={accountUrl()} target="_blank" rel="noreferrer">
                <i className="fa-solid fa-arrow-up-right-from-square me-2" />
                Manage in Keycloak
              </CButton>
              <CButton color="secondary" variant="outline" onClick={logout}>
                <i className="fa-solid fa-right-from-bracket me-2" />
                Sign out
              </CButton>
            </div>
          </CCardBody>
        </CCard>
      </CCol>
    </CRow>
  )
}

export default Profile
