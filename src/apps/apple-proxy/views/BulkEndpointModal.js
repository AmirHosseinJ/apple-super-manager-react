import React, { useMemo, useState } from 'react'
import PropTypes from 'prop-types'
import {
  CAlert,
  CBadge,
  CButton,
  CForm,
  CFormCheck,
  CFormInput,
  CFormLabel,
  CFormSelect,
  CFormTextarea,
  CModal,
  CModalBody,
  CModalFooter,
  CModalHeader,
  CModalTitle,
  CSpinner,
  CTable,
  CTableBody,
  CTableHead,
  CTableHeaderCell,
  CTableRow,
} from '@coreui/react'

import { ErrorState } from '../../../components/common'
import { parseBulkEndpoints } from '../bulkEndpointParser'

const DEFAULT_FORMAT = 'protocol://login:password@hostname:port'

const getEndpointErrors = (error) => {
  const endpointErrors = error?.body?.endpoints
  return endpointErrors && typeof endpointErrors === 'object' && !Array.isArray(endpointErrors)
    ? endpointErrors
    : {}
}

const stringifyEndpointError = (value) => {
  if (Array.isArray(value)) return value.join(' ')
  if (value && typeof value === 'object') {
    return Object.values(value).map(stringifyEndpointError).join(' ')
  }
  return String(value || '')
}

const BulkEndpointModal = ({ visible, groups, pending, error, onClose, onSubmit }) => {
  const [group, setGroup] = useState('')
  const [format, setFormat] = useState(DEFAULT_FORMAT)
  const [bulkData, setBulkData] = useState('')
  const [priority, setPriority] = useState('100')
  const [checkEnabled, setCheckEnabled] = useState(true)
  const [submitted, setSubmitted] = useState(false)

  const parsed = useMemo(() => parseBulkEndpoints(format, bulkData), [format, bulkData])
  const endpointErrors = getEndpointErrors(error)
  const hasRowErrors = parsed.rows.some((row) => row.error)
  const canSubmit =
    Boolean(group) && parsed.endpoints.length > 0 && !parsed.formatError && !hasRowErrors

  const handleSubmit = (event) => {
    event.preventDefault()
    setSubmitted(true)
    if (!canSubmit) return

    onSubmit({
      endpoints: parsed.endpoints.map((endpoint) => ({
        ...endpoint,
        group: Number(group),
        priority: Number(priority),
        check_enabled: checkEnabled,
      })),
    })
  }

  return (
    <CModal visible={visible} onClose={onClose} alignment="center" size="xl">
      <CForm onSubmit={handleSubmit}>
        <CModalHeader>
          <CModalTitle>Bulk create proxy endpoints</CModalTitle>
        </CModalHeader>
        <CModalBody>
          <ErrorState error={error} />
          <CAlert color="info">
            Parse one non-empty proxy per line, then create all valid rows atomically. Passwords are
            sent only to the API and are never shown in the preview.
          </CAlert>

          <CFormSelect
            className="mb-3"
            label="Provider group"
            value={group}
            invalid={submitted && !group}
            feedbackInvalid="Select the provider group for every endpoint."
            disabled={pending}
            onChange={(event) => setGroup(event.target.value)}
          >
            <option value="">Select…</option>
            {groups.map((provider) => (
              <option key={provider.id} value={provider.id}>
                {provider.display_name || provider.provider_key}
              </option>
            ))}
          </CFormSelect>

          <CFormTextarea
            className="mb-3"
            label="Extraction format"
            rows={2}
            value={format}
            invalid={Boolean(parsed.formatError)}
            feedbackInvalid={parsed.formatError}
            text="Use protocol, login, password, hostname, and port placeholders. Protocol, hostname, and port are required."
            disabled={pending}
            onChange={(event) => setFormat(event.target.value)}
          />

          <CFormTextarea
            className="mb-3"
            label="Proxy data"
            rows={8}
            value={bulkData}
            invalid={submitted && !parsed.endpoints.length}
            feedbackInvalid="Paste at least one proxy line that matches the extraction format."
            placeholder="http://user:password@proxy.example:10000"
            disabled={pending}
            onChange={(event) => setBulkData(event.target.value)}
          />

          <div className="row">
            <div className="col-md-6">
              <CFormInput
                className="mb-3"
                label="Priority"
                type="number"
                min="0"
                value={priority}
                disabled={pending}
                onChange={(event) => setPriority(event.target.value)}
              />
            </div>
            <div className="col-md-6 d-flex align-items-center">
              <CFormCheck
                className="mb-3"
                label="Health checks enabled"
                checked={checkEnabled}
                disabled={pending}
                onChange={(event) => setCheckEnabled(event.target.checked)}
              />
            </div>
          </div>

          <div className="d-flex align-items-center justify-content-between mb-2">
            <CFormLabel className="mb-0">Parsed preview</CFormLabel>
            <small className="text-body-secondary">
              {parsed.endpoints.length} endpoint{parsed.endpoints.length === 1 ? '' : 's'} ready
            </small>
          </div>
          {parsed.rows.length ? (
            <div className="table-responsive">
              <CTable small hover align="middle" className="mb-0">
                <CTableHead>
                  <CTableRow>
                    <CTableHeaderCell>Line</CTableHeaderCell>
                    <CTableHeaderCell>Protocol</CTableHeaderCell>
                    <CTableHeaderCell>Host</CTableHeaderCell>
                    <CTableHeaderCell>Port</CTableHeaderCell>
                    <CTableHeaderCell>Username</CTableHeaderCell>
                    <CTableHeaderCell>Result</CTableHeaderCell>
                  </CTableRow>
                </CTableHead>
                <CTableBody>
                  {parsed.rows.map((row, index) => {
                    const backendError = stringifyEndpointError(endpointErrors[index])
                    const rowError = row.error || backendError
                    return (
                      <CTableRow key={row.line} color={rowError ? 'danger' : undefined}>
                        <CTableHeaderCell>{row.line}</CTableHeaderCell>
                        <td>{row.endpoint?.scheme || '—'}</td>
                        <td>{row.endpoint?.host || '—'}</td>
                        <td>{row.endpoint?.port || '—'}</td>
                        <td>
                          {row.endpoint?.username || (
                            <span className="text-body-secondary">None</span>
                          )}
                        </td>
                        <td>
                          {rowError ? (
                            <small>{rowError}</small>
                          ) : (
                            <CBadge color="success">Ready</CBadge>
                          )}
                        </td>
                      </CTableRow>
                    )
                  })}
                </CTableBody>
              </CTable>
            </div>
          ) : (
            <div className="text-body-secondary small">The parsed endpoints will appear here.</div>
          )}
        </CModalBody>
        <CModalFooter>
          <CButton color="secondary" variant="outline" onClick={onClose} disabled={pending}>
            Cancel
          </CButton>
          <CButton color="primary" type="submit" disabled={pending || !canSubmit}>
            {pending && <CSpinner size="sm" className="me-2" />}
            Create {parsed.endpoints.length || ''} endpoint
            {parsed.endpoints.length === 1 ? '' : 's'}
          </CButton>
        </CModalFooter>
      </CForm>
    </CModal>
  )
}

BulkEndpointModal.propTypes = {
  visible: PropTypes.bool,
  groups: PropTypes.arrayOf(PropTypes.object).isRequired,
  pending: PropTypes.bool,
  error: PropTypes.object,
  onClose: PropTypes.func.isRequired,
  onSubmit: PropTypes.func.isRequired,
}

export default BulkEndpointModal
