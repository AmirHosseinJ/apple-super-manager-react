import React from 'react'
import PropTypes from 'prop-types'
import { CAlert, CButton } from '@coreui/react'

/** Retryable inline error used by every list and detail panel. */
const ErrorState = ({ error, onRetry, className = '' }) => {
  if (!error) return null

  const color = error.isForbidden ? 'warning' : 'danger'

  return (
    <CAlert color={color} className={className}>
      <div className="d-flex align-items-start justify-content-between gap-3">
        <div>
          <strong className="d-block">
            {error.isNetworkError ? 'Cannot reach the API' : 'Request failed'}
          </strong>
          <span>{error.message}</span>
        </div>
        {onRetry && (
          <CButton
            color={color}
            variant="outline"
            size="sm"
            onClick={onRetry}
            className="text-nowrap"
          >
            <i className="fa-solid fa-rotate-right me-2" />
            Retry
          </CButton>
        )}
      </div>
    </CAlert>
  )
}

ErrorState.propTypes = {
  error: PropTypes.object,
  onRetry: PropTypes.func,
  className: PropTypes.string,
}

export default ErrorState
