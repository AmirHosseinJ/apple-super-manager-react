import React from 'react'
import {
  CAvatar,
  CBadge,
  CDropdown,
  CDropdownDivider,
  CDropdownHeader,
  CDropdownItem,
  CDropdownMenu,
  CDropdownToggle,
} from '@coreui/react'
import { cilAccountLogout, cilSettings, cilUser } from '@coreui/icons'
import CIcon from '@coreui/icons-react'

import { useAuth } from '../../auth'

const initialsOf = (value = '') =>
  value
    .split(/[\s._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join('') || '?'

const AppHeaderDropdown = () => {
  const { name, username, email, roles, logout, accountUrl } = useAuth()

  return (
    <CDropdown variant="nav-item">
      <CDropdownToggle placement="bottom-end" className="py-0 pe-0" caret={false}>
        <CAvatar color="primary" textColor="white" size="md">
          {initialsOf(name || username)}
        </CAvatar>
      </CDropdownToggle>
      <CDropdownMenu className="pt-0" placement="bottom-end">
        <CDropdownHeader className="bg-body-secondary fw-semibold mb-2">
          {name || username}
          {email && <div className="fw-normal small text-body-secondary">{email}</div>}
        </CDropdownHeader>

        {roles.length > 0 && (
          <div className="px-3 pb-2 d-flex flex-wrap gap-1">
            {roles.map((role) => (
              <CBadge key={role} color="secondary">
                {role}
              </CBadge>
            ))}
          </div>
        )}

        <CDropdownItem href={accountUrl()} target="_blank" rel="noreferrer">
          <CIcon icon={cilUser} className="me-2" />
          Account
        </CDropdownItem>
        <CDropdownItem href="/settings">
          <CIcon icon={cilSettings} className="me-2" />
          Settings
        </CDropdownItem>
        <CDropdownDivider />
        <CDropdownItem role="button" onClick={logout} style={{ cursor: 'pointer' }}>
          <CIcon icon={cilAccountLogout} className="me-2" />
          Sign out
        </CDropdownItem>
      </CDropdownMenu>
    </CDropdown>
  )
}

export default AppHeaderDropdown
