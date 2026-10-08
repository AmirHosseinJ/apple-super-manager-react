import React from 'react'
import PropTypes from 'prop-types'
import { CBadge } from '@coreui/react'

const HEALTH_COLORS = {
  healthy: 'success',
  degraded: 'warning',
  quarantined: 'danger',
  probing: 'info',
  unknown: 'secondary',
}

const OUTCOME_COLORS = {
  success: 'success',
  degraded: 'warning',
  proxy_failure: 'danger',
  neutral: 'secondary',
}

const CLIENT_STATUS_COLORS = {
  acquired: 'info',
  running: 'primary',
  finished: 'success',
  failed: 'danger',
  // Lease lifecycle (ProxyLease.status), shown with the same badge.
  active: 'success',
  expired: 'warning',
  released: 'secondary',
}

const DATABASE_STATUS_COLORS = {
  queued: 'info',
  running: 'primary',
  completed: 'success',
  failed: 'danger',
}

export const clientStatusColor = (status) => CLIENT_STATUS_COLORS[status] || 'secondary'
export const healthColor = (status) => HEALTH_COLORS[status] || 'secondary'
export const outcomeColor = (outcome) => OUTCOME_COLORS[outcome] || 'secondary'
export const databaseStatusColor = (status) => DATABASE_STATUS_COLORS[status] || 'secondary'

const humanise = (value) => String(value ?? '').replace(/_/g, ' ')

const StatusBadge = ({ value, kind = 'health', className = '' }) => {
  if (value === undefined || value === null || value === '') {
    return <span className="text-body-secondary">&mdash;</span>
  }

  if (kind === 'boolean') {
    return (
      <CBadge color={value ? 'success' : 'secondary'} className={className}>
        {value ? 'Yes' : 'No'}
      </CBadge>
    )
  }

  if (kind === 'enabled') {
    return (
      <CBadge color={value ? 'success' : 'danger'} className={className}>
        {value ? 'Enabled' : 'Disabled'}
      </CBadge>
    )
  }

  let color = healthColor(value)
  if (kind === 'outcome') color = outcomeColor(value)
  else if (kind === 'clientStatus') color = clientStatusColor(value)
  else if (kind === 'database') color = databaseStatusColor(value)

  return (
    <CBadge color={color} className={`text-capitalize ${className}`}>
      {humanise(value)}
    </CBadge>
  )
}

StatusBadge.propTypes = {
  value: PropTypes.any,
  kind: PropTypes.oneOf(['health', 'outcome', 'clientStatus', 'database', 'boolean', 'enabled']),
  className: PropTypes.string,
}

export default StatusBadge
