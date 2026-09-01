import React from 'react'
import { Link } from 'react-router-dom'
import {
  CBadge,
  CButton,
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
  CListGroup,
  CListGroupItem,
  CRow,
} from '@coreui/react'

import { useAuth } from '../../auth'
import { getApps, getVisibleApps } from '../../apps/registry'

const Dashboard = () => {
  const { name, username, email, roles, hasRole } = useAuth()

  const allApps = getApps()
  const visibleApps = getVisibleApps(hasRole)

  return (
    <>
      <div className="mb-4">
        <h4 className="mb-1">Welcome{name ? `, ${name}` : ''}</h4>
        <p className="text-body-secondary mb-0">
          Apple Super Manager is the single console for every managed app and API.
        </p>
      </div>

      <CRow className="mb-4">
        {visibleApps.map((app) => (
          <CCol key={app.id} md={6} xl={4} className="mb-3">
            <CCard className="h-100">
              <CCardBody className="d-flex flex-column">
                <div className="d-flex align-items-center gap-3 mb-3">
                  <span
                    className="bg-primary bg-opacity-10 text-primary rounded-circle d-inline-flex align-items-center justify-content-center flex-shrink-0"
                    style={{ width: 48, height: 48 }}
                  >
                    <i className={app.icon} />
                  </span>
                  <div>
                    <div className="fs-5 fw-semibold">{app.title}</div>
                    <div className="text-body-secondary small">
                      {app.navItems?.length || 0} sections
                    </div>
                  </div>
                </div>
                <p className="text-body-secondary flex-grow-1">{app.description}</p>
                <CButton color="primary" variant="outline" as={Link} to={app.basePath}>
                  Open console
                  <i className="fa-solid fa-arrow-right ms-2" />
                </CButton>
              </CCardBody>
            </CCard>
          </CCol>
        ))}

        {visibleApps.length === 0 && (
          <CCol>
            <CCard>
              <CCardBody className="text-center text-body-secondary py-5">
                {allApps.length > 0
                  ? 'No managed apps are available to your account. Operator access requires the admin role.'
                  : 'No apps are registered yet.'}
              </CCardBody>
            </CCard>
          </CCol>
        )}
      </CRow>

      <CRow>
        <CCol lg={5} className="mb-4">
          <CCard className="h-100">
            <CCardHeader>
              <i className="fa-solid fa-id-badge me-2" />
              Session
            </CCardHeader>
            <CCardBody className="p-0">
              <CListGroup flush>
                <CListGroupItem className="d-flex justify-content-between">
                  <span className="text-body-secondary">Username</span>
                  <strong>{username || '-'}</strong>
                </CListGroupItem>
                <CListGroupItem className="d-flex justify-content-between">
                  <span className="text-body-secondary">Email</span>
                  <strong>{email || '-'}</strong>
                </CListGroupItem>
                <CListGroupItem className="d-flex justify-content-between align-items-center">
                  <span className="text-body-secondary">Roles</span>
                  <span className="d-flex flex-wrap gap-1 justify-content-end">
                    {roles.length ? (
                      roles.map((role) => (
                        <CBadge key={role} color="secondary">
                          {role}
                        </CBadge>
                      ))
                    ) : (
                      <span className="text-body-secondary">none</span>
                    )}
                  </span>
                </CListGroupItem>
              </CListGroup>
            </CCardBody>
          </CCard>
        </CCol>
      </CRow>
    </>
  )
}

export default Dashboard
