import React, { useMemo, useState } from 'react'
import PropTypes from 'prop-types'
import {
  CAlert,
  CButton,
  CFormCheck,
  CFormInput,
  CFormSelect,
  CModal,
  CModalBody,
  CModalFooter,
  CModalHeader,
  CModalTitle,
  CSpinner,
  CTable,
  CTableBody,
  CTableDataCell,
  CTableHead,
  CTableHeaderCell,
  CTableRow,
} from '@coreui/react'

import { useMutation } from '../../../api/hooks'
import { ErrorState } from '../../../components/common'
import { policyTemplates } from '../api'

const REQUIRED_TOTAL = 100
const EPSILON = 0.0005

const emptyRow = () => ({
  uid: `row-${Math.random().toString(36).slice(2)}`,
  provider: '',
  weight_percentage: '',
  enabled: true,
  minimum_health_score: 0,
  fallback_allowed: true,
})

const toRows = (entries) =>
  (entries || []).map((entry, index) => ({
    uid: `entry-${entry.id ?? index}`,
    provider: entry.provider,
    weight_percentage: entry.weight_percentage,
    enabled: entry.enabled,
    minimum_health_score: entry.minimum_health_score,
    fallback_allowed: entry.fallback_allowed,
  }))

/**
 * Edits every entry of a policy template as one list and saves through
 * `PUT entries/`, which the API applies atomically. The enabled weights must
 * total exactly 100.000 or the server rejects the write with a 409, so saving
 * is blocked client-side until the total matches.
 */
const WeightEditor = ({ template, providers, onClose, onSaved }) => {
  const [rows, setRows] = useState(() => {
    const initial = toRows(template.entries)
    return initial.length ? initial : [emptyRow()]
  })

  const saveMutation = useMutation((entries) =>
    policyTemplates.replaceEntries(template.id, entries),
  )

  const enabledTotal = useMemo(
    () =>
      rows
        .filter((row) => row.enabled)
        .reduce((total, row) => total + (Number(row.weight_percentage) || 0), 0),
    [rows],
  )

  const duplicateProvider = useMemo(() => {
    const used = rows.map((row) => String(row.provider)).filter(Boolean)
    return used.length !== new Set(used).size
  }, [rows])

  const missingProvider = rows.some((row) => !row.provider)
  const totalMatches = Math.abs(enabledTotal - REQUIRED_TOTAL) < EPSILON
  const canSave = totalMatches && !duplicateProvider && !missingProvider && rows.length > 0

  const updateRow = (uid, patch) =>
    setRows((current) => current.map((row) => (row.uid === uid ? { ...row, ...patch } : row)))

  const removeRow = (uid) => setRows((current) => current.filter((row) => row.uid !== uid))

  const save = async () => {
    const payload = rows.map((row) => ({
      provider: Number(row.provider),
      weight_percentage: Number(row.weight_percentage),
      enabled: row.enabled,
      minimum_health_score: Number(row.minimum_health_score) || 0,
      fallback_allowed: row.fallback_allowed,
    }))
    try {
      await saveMutation.run(payload)
      onSaved()
      onClose()
    } catch {
      // Rendered below; a 409 means the server disagreed with the total.
    }
  }

  const distributeEvenly = () => {
    const enabledRows = rows.filter((row) => row.enabled)
    if (!enabledRows.length) return
    const share = Math.floor((REQUIRED_TOTAL / enabledRows.length) * 1000) / 1000
    let remainder = Math.round((REQUIRED_TOTAL - share * enabledRows.length) * 1000) / 1000
    setRows((current) =>
      current.map((row) => {
        if (!row.enabled) return row
        const isFirst = row.uid === enabledRows[0].uid
        const weight = isFirst ? Math.round((share + remainder) * 1000) / 1000 : share
        if (isFirst) remainder = 0
        return { ...row, weight_percentage: weight }
      }),
    )
  }

  return (
    <CModal visible alignment="center" size="xl" onClose={onClose}>
      <CModalHeader>
        <CModalTitle>Weights — {template.display_name}</CModalTitle>
      </CModalHeader>
      <CModalBody>
        <ErrorState error={saveMutation.error} />

        <p className="text-body-secondary">
          Entries are replaced atomically. Enabled weights must total exactly 100.000%; the API
          rejects anything else so a half-configured policy fails closed rather than guessing a
          distribution.
        </p>

        <CTable responsive align="middle" className="mb-3">
          <CTableHead>
            <CTableRow>
              <CTableHeaderCell scope="col">Provider</CTableHeaderCell>
              <CTableHeaderCell scope="col" style={{ width: 150 }}>
                Weight %
              </CTableHeaderCell>
              <CTableHeaderCell scope="col" style={{ width: 150 }}>
                Min health
              </CTableHeaderCell>
              <CTableHeaderCell scope="col" className="text-center">
                Enabled
              </CTableHeaderCell>
              <CTableHeaderCell scope="col" className="text-center">
                Fallback
              </CTableHeaderCell>
              <CTableHeaderCell scope="col" />
            </CTableRow>
          </CTableHead>
          <CTableBody>
            {rows.map((row) => (
              <CTableRow key={row.uid}>
                <CTableDataCell>
                  <CFormSelect
                    size="sm"
                    value={row.provider}
                    onChange={(event) => updateRow(row.uid, { provider: event.target.value })}
                  >
                    <option value="">Select provider…</option>
                    {providers.map((provider) => (
                      <option key={provider.id} value={provider.id}>
                        {provider.display_name || provider.provider_key}
                      </option>
                    ))}
                  </CFormSelect>
                </CTableDataCell>
                <CTableDataCell>
                  <CFormInput
                    size="sm"
                    type="number"
                    min="0.001"
                    max="100"
                    step="0.001"
                    value={row.weight_percentage}
                    onChange={(event) =>
                      updateRow(row.uid, { weight_percentage: event.target.value })
                    }
                  />
                </CTableDataCell>
                <CTableDataCell>
                  <CFormInput
                    size="sm"
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    value={row.minimum_health_score}
                    onChange={(event) =>
                      updateRow(row.uid, { minimum_health_score: event.target.value })
                    }
                  />
                </CTableDataCell>
                <CTableDataCell className="text-center">
                  <CFormCheck
                    checked={Boolean(row.enabled)}
                    onChange={(event) => updateRow(row.uid, { enabled: event.target.checked })}
                  />
                </CTableDataCell>
                <CTableDataCell className="text-center">
                  <CFormCheck
                    checked={Boolean(row.fallback_allowed)}
                    onChange={(event) =>
                      updateRow(row.uid, { fallback_allowed: event.target.checked })
                    }
                  />
                </CTableDataCell>
                <CTableDataCell className="text-end">
                  <CButton
                    size="sm"
                    color="danger"
                    variant="ghost"
                    onClick={() => removeRow(row.uid)}
                  >
                    <i className="fa-solid fa-xmark" />
                  </CButton>
                </CTableDataCell>
              </CTableRow>
            ))}
          </CTableBody>
        </CTable>

        <div className="d-flex flex-wrap align-items-center gap-2 mb-3">
          <CButton
            size="sm"
            color="secondary"
            variant="outline"
            onClick={() => setRows((current) => [...current, emptyRow()])}
          >
            <i className="fa-solid fa-plus me-2" />
            Add provider
          </CButton>
          <CButton size="sm" color="secondary" variant="outline" onClick={distributeEvenly}>
            <i className="fa-solid fa-scale-balanced me-2" />
            Distribute evenly
          </CButton>
          <div className="ms-auto">
            <span className="text-body-secondary me-2">Enabled total</span>
            <strong className={totalMatches ? 'text-success' : 'text-danger'}>
              {enabledTotal.toFixed(3)}% / 100.000%
            </strong>
          </div>
        </div>

        {!totalMatches && (
          <CAlert color="warning" className="py-2">
            Enabled weights total {enabledTotal.toFixed(3)}%. Adjust them to exactly 100.000% to
            save.
          </CAlert>
        )}
        {duplicateProvider && (
          <CAlert color="warning" className="py-2">
            Each provider may appear only once per template.
          </CAlert>
        )}
        {missingProvider && (
          <CAlert color="warning" className="py-2">
            Every row needs a provider selected.
          </CAlert>
        )}
      </CModalBody>
      <CModalFooter>
        <CButton
          color="secondary"
          variant="outline"
          onClick={onClose}
          disabled={saveMutation.pending}
        >
          Cancel
        </CButton>
        <CButton color="primary" onClick={save} disabled={!canSave || saveMutation.pending}>
          {saveMutation.pending && <CSpinner size="sm" className="me-2" />}
          Save weights
        </CButton>
      </CModalFooter>
    </CModal>
  )
}

WeightEditor.propTypes = {
  template: PropTypes.object.isRequired,
  providers: PropTypes.array.isRequired,
  onClose: PropTypes.func.isRequired,
  onSaved: PropTypes.func.isRequired,
}

export default WeightEditor
