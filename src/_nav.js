import React from 'react'
import CIcon from '@coreui/icons-react'
import { cilSpeedometer, cilUser } from '@coreui/icons'
import { CNavGroup, CNavItem, CNavTitle } from '@coreui/react'

import { getApps } from './apps/registry'

const faIcon = (className) => <i className={`${className} nav-icon`} />

const appNavGroups = getApps().map((app) => ({
  component: CNavGroup,
  name: app.title,
  to: app.basePath,
  icon: faIcon(app.icon),
  items: (app.navItems || []).map((item) => ({
    component: CNavItem,
    name: item.name,
    to: item.to,
    icon: item.icon ? faIcon(item.icon) : undefined,
  })),
}))

const _nav = [
  {
    component: CNavItem,
    name: 'Dashboard',
    to: '/dashboard',
    icon: <CIcon icon={cilSpeedometer} customClassName="nav-icon" />,
  },
  {
    component: CNavTitle,
    name: 'Managed Apps',
  },
  ...appNavGroups,
  {
    component: CNavTitle,
    name: 'Account',
  },
  {
    component: CNavItem,
    name: 'Profile',
    to: '/profile',
    icon: <CIcon icon={cilUser} customClassName="nav-icon" />,
  },
]

export default _nav
