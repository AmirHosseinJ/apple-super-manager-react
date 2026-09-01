import React, { useEffect, useMemo, useState } from 'react'
import PropTypes from 'prop-types'
import {
  CButton,
  CForm,
  CFormCheck,
  CFormInput,
  CFormSelect,
  CFormTextarea,
  CModal,
  CModalBody,
  CModalFooter,
  CModalHeader,
  CModalTitle,
  CSpinner,
} from '@coreui/react'

import ErrorState from './ErrorState'

const buildInitialValues = (fields, initialValues) =>
  fields.reduce((accumulator, field) => {
    const existing = initialValues ? initialValues[field.name] : undefined
    if (field.writeOnly) {
      // Credentials are never echoed back by the API, so always start blank.
      accumulator[field.name] = ''
    } else if (existing !== undefined && existing !== null) {
      accumulator[field.name] = existing
    } else {
      accumulator[field.name] = field.defaultValue ?? (field.type === 'checkbox' ? false : '')
    }
    return accumulator
  }, {})

/**
 * Create/edit modal driven by a field descriptor list. Binds DRF 400 responses
 * onto the matching inputs and shows any non-field detail at the top.
 *
 * `fields` entries: { name, label, type, options, required, hint, writeOnly, ... }
 */
const ResourceModal = ({
  visible,
  title,
  fields,
  initialValues,
  onSubmit,
  onClose,
  submitLabel = 'Save',
  pending = false,
  error = null,
  children,
}) => {
  const [values, setValues] = useState(() => buildInitialValues(fields, initialValues))

  useEffect(() => {
    if (visible) setValues(buildInitialValues(fields, initialValues))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, initialValues])

  const fieldErrors = useMemo(() => (error && error.fieldErrors ? error.fieldErrors : {}), [error])
  const nonFieldError = useMemo(() => {
    if (!error) return null
    if (error.status === 400 && Object.keys(fieldErrors).length > 0 && !error.detail) return null
    return error
  }, [error, fieldErrors])

  const setValue = (name, value) => setValues((current) => ({ ...current, [name]: value }))

  const handleSubmit = (event) => {
    event.preventDefault()
    const payload = fields.reduce((accumulator, field) => {
      const value = values[field.name]
      // Blank write-only inputs mean "keep the stored credential untouched".
      if (field.writeOnly && value === '') return accumulator
      if (field.type === 'number') {
        accumulator[field.name] = value === '' ? null : Number(value)
      } else {
        accumulator[field.name] = value
      }
      return accumulator
    }, {})
    onSubmit(payload)
  }

  const renderField = (field) => {
    const invalid = Boolean(fieldErrors[field.name])
    const feedback = fieldErrors[field.name]
    const common = {
      id: `field-${field.name}`,
      label: field.label,
      invalid,
      feedbackInvalid: feedback,
      disabled: pending || field.disabled,
      text: field.hint,
    }

    if (field.type === 'checkbox') {
      return (
        <div className="mb-3" key={field.name}>
          <CFormCheck
            id={common.id}
            label={field.label}
            checked={Boolean(values[field.name])}
            disabled={common.disabled}
            onChange={(event) => setValue(field.name, event.target.checked)}
          />
          {field.hint && <div className="form-text">{field.hint}</div>}
          {invalid && <div className="text-danger small">{feedback}</div>}
        </div>
      )
    }

    if (field.type === 'select') {
      return (
        <CFormSelect
          key={field.name}
          className="mb-3"
          {...common}
          value={values[field.name] ?? ''}
          onChange={(event) => setValue(field.name, event.target.value)}
        >
          <option value="">{field.placeholder || 'Select…'}</option>
          {(field.options || []).map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </CFormSelect>
      )
    }

    if (field.type === 'textarea') {
      return (
        <CFormTextarea
          key={field.name}
          className="mb-3"
          rows={field.rows || 3}
          {...common}
          value={values[field.name] ?? ''}
          onChange={(event) => setValue(field.name, event.target.value)}
        />
      )
    }

    return (
      <CFormInput
        key={field.name}
        className="mb-3"
        type={field.type || 'text'}
        min={field.min}
        max={field.max}
        step={field.step}
        placeholder={field.placeholder}
        autoComplete={field.writeOnly ? 'new-password' : 'off'}
        {...common}
        value={values[field.name] ?? ''}
        onChange={(event) => setValue(field.name, event.target.value)}
      />
    )
  }

  return (
    <CModal visible={visible} onClose={onClose} alignment="center" size="lg">
      <CForm onSubmit={handleSubmit}>
        <CModalHeader>
          <CModalTitle>{title}</CModalTitle>
        </CModalHeader>
        <CModalBody>
          <ErrorState error={nonFieldError} />
          {fields.map(renderField)}
          {typeof children === 'function' ? children({ values, setValue }) : children}
        </CModalBody>
        <CModalFooter>
          <CButton color="secondary" variant="outline" onClick={onClose} disabled={pending}>
            Cancel
          </CButton>
          <CButton color="primary" type="submit" disabled={pending}>
            {pending && <CSpinner size="sm" className="me-2" />}
            {submitLabel}
          </CButton>
        </CModalFooter>
      </CForm>
    </CModal>
  )
}

ResourceModal.propTypes = {
  visible: PropTypes.bool,
  title: PropTypes.node,
  fields: PropTypes.arrayOf(PropTypes.object).isRequired,
  initialValues: PropTypes.object,
  onSubmit: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired,
  submitLabel: PropTypes.string,
  pending: PropTypes.bool,
  error: PropTypes.object,
  children: PropTypes.oneOfType([PropTypes.node, PropTypes.func]),
}

export default ResourceModal
