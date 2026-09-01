import React from 'react'
import PropTypes from 'prop-types'
import {
  CButton,
  CModal,
  CModalBody,
  CModalFooter,
  CModalHeader,
  CModalTitle,
  CSpinner,
} from '@coreui/react'

import ErrorState from './ErrorState'

const ConfirmDialog = ({
  visible,
  title,
  children,
  confirmLabel = 'Confirm',
  confirmColor = 'danger',
  pending = false,
  error = null,
  onConfirm,
  onClose,
}) => (
  <CModal visible={visible} onClose={onClose} alignment="center">
    <CModalHeader>
      <CModalTitle>{title}</CModalTitle>
    </CModalHeader>
    <CModalBody>
      <ErrorState error={error} />
      {children}
    </CModalBody>
    <CModalFooter>
      <CButton color="secondary" variant="outline" onClick={onClose} disabled={pending}>
        Cancel
      </CButton>
      <CButton color={confirmColor} onClick={onConfirm} disabled={pending}>
        {pending && <CSpinner size="sm" className="me-2" />}
        {confirmLabel}
      </CButton>
    </CModalFooter>
  </CModal>
)

ConfirmDialog.propTypes = {
  visible: PropTypes.bool,
  title: PropTypes.node,
  children: PropTypes.node,
  confirmLabel: PropTypes.string,
  confirmColor: PropTypes.string,
  pending: PropTypes.bool,
  error: PropTypes.object,
  onConfirm: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired,
}

export default ConfirmDialog
