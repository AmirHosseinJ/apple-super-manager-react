import React, { useCallback, useMemo, useState } from 'react'
import PropTypes from 'prop-types'
import {
  CAlert,
  CButton,
  CCard,
  CCardBody,
  CFormSelect,
  CInputGroup,
  CFormInput,
  CModal,
  CModalBody,
  CModalFooter,
  CModalHeader,
  CModalTitle,
} from '@coreui/react'

import { useCollection, useMutation, useOptions } from '../../../api/hooks'
import {
  ConfirmDialog,
  DataTable,
  PageHeader,
  RelativeTime,
  ResourceModal,
  StatusBadge,
} from '../../../components/common'
import { consumerGroups, consumers, normaliseDashedKey } from '../api'

/**
 * Shows a freshly rotated API key. The raw key exists only in this component's
 * state and is discarded on close, because the API never returns it again.
 */
const ApiKeyModal = ({ payload, onClose }) => {
  const [copied, setCopied] = useState(false)

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(payload.api_key)
      setCopied(true)
    } catch {
      setCopied(false)
    }
  }

  return (
    <CModal visible alignment="center" onClose={onClose} backdrop="static">
      <CModalHeader closeButton={false}>
        <CModalTitle>API key issued</CModalTitle>
      </CModalHeader>
      <CModalBody>
        <CAlert color="warning">
          <strong>Copy this now.</strong> It is shown once and cannot be retrieved again. Rotating
          again immediately invalidates the previous key.
        </CAlert>
        <CInputGroup>
          <CFormInput readOnly value={payload.api_key} onFocus={(event) => event.target.select()} />
          <CButton color={copied ? 'success' : 'primary'} onClick={copy}>
            <i className={`fa-solid ${copied ? 'fa-check' : 'fa-copy'} me-2`} />
            {copied ? 'Copied' : 'Copy'}
          </CButton>
        </CInputGroup>
      </CModalBody>
      <CModalFooter>
        <CButton color="secondary" onClick={onClose}>
          Done
        </CButton>
      </CModalFooter>
    </CModal>
  )
}

ApiKeyModal.propTypes = {
  payload: PropTypes.shape({ api_key: PropTypes.string }).isRequired,
  onClose: PropTypes.func.isRequired,
}

const Consumers = () => {
  const [filters, setFilters] = useState({ group: '', enabled: '' })

  const collection = useCollection(
    useCallback((options) => consumers.list(options), []),
    {
      ordering: 'key',
      filters,
    },
  )

  const { options: groups } = useOptions(useCallback((options) => consumerGroups.list(options), []))

  const [editing, setEditing] = useState(null)
  const [deleting, setDeleting] = useState(null)
  const [rotating, setRotating] = useState(null)
  const [issuedKey, setIssuedKey] = useState(null)

  const saveMutation = useMutation((consumer, payload) =>
    consumer ? consumers.update(consumer.id, payload) : consumers.create(payload),
  )
  const deleteMutation = useMutation((consumer) => consumers.remove(consumer.id))
  const rotateMutation = useMutation((consumer) => consumers.rotateApiKey(consumer.id))

  const groupNameById = useMemo(
    () => new Map(groups.map((group) => [group.id, group.display_name || group.key])),
    [groups],
  )

  const handleSave = async (payload) => {
    try {
      await saveMutation.run(editing?.id ? editing : null, payload)
      setEditing(null)
      collection.refresh()
    } catch {
      // Rendered in the modal.
    }
  }

  const handleDelete = async () => {
    try {
      await deleteMutation.run(deleting)
      setDeleting(null)
      collection.refresh()
    } catch {
      // Rendered in the dialog.
    }
  }

  const handleRotate = async () => {
    try {
      const result = await rotateMutation.run(rotating)
      setRotating(null)
      setIssuedKey(result)
      collection.refresh()
    } catch {
      // Rendered in the dialog.
    }
  }

  const columns = [
    { key: 'key', label: 'Key', sortable: true, render: (consumer) => <code>{consumer.key}</code> },
    { key: 'display_name', label: 'Display name', sortable: true },
    {
      key: 'group',
      label: 'Consumer group',
      render: (consumer) => groupNameById.get(consumer.group) || `#${consumer.group}`,
    },
    {
      key: 'enabled',
      label: 'State',
      render: (consumer) => <StatusBadge value={consumer.enabled} kind="enabled" />,
    },
    {
      key: 'has_api_key',
      label: 'API key',
      render: (consumer) => <StatusBadge value={consumer.has_api_key} kind="boolean" />,
    },
    {
      key: 'created_at',
      label: 'Created',
      render: (consumer) => <RelativeTime value={consumer.created_at} />,
    },
    {
      key: 'actions',
      label: '',
      className: 'text-end text-nowrap',
      render: (consumer) => (
        <>
          <CButton
            size="sm"
            color="warning"
            variant="ghost"
            title="Rotate API key"
            onClick={() => setRotating(consumer)}
          >
            <i className="fa-solid fa-key" />
          </CButton>
          <CButton
            size="sm"
            color="primary"
            variant="ghost"
            title="Edit"
            onClick={() => setEditing(consumer)}
          >
            <i className="fa-solid fa-pen" />
          </CButton>
          <CButton
            size="sm"
            color="danger"
            variant="ghost"
            title="Delete"
            onClick={() => setDeleting(consumer)}
          >
            <i className="fa-solid fa-trash" />
          </CButton>
        </>
      ),
    },
  ]

  const fields = [
    { name: 'key', label: 'Key', required: true, hint: 'Unique identifier for this consumer.' },
    { name: 'display_name', label: 'Display name', required: true },
    {
      name: 'group',
      label: 'Consumer group',
      type: 'select',
      required: true,
      hint: 'Required. The group binding determines which providers this consumer may allocate from.',
      options: groups.map((group) => ({ value: group.id, label: group.display_name || group.key })),
    },
    { name: 'enabled', label: 'Enabled', type: 'checkbox', defaultValue: true },
  ]

  const filterControls = (
    <>
      <CFormSelect
        size="sm"
        className="w-auto"
        value={filters.group}
        onChange={(event) => setFilters((current) => ({ ...current, group: event.target.value }))}
      >
        <option value="">All groups</option>
        {groups.map((group) => (
          <option key={group.id} value={group.id}>
            {group.display_name || group.key}
          </option>
        ))}
      </CFormSelect>
      <CFormSelect
        size="sm"
        className="w-auto"
        value={filters.enabled}
        onChange={(event) => setFilters((current) => ({ ...current, enabled: event.target.value }))}
      >
        <option value="">Any state</option>
        <option value="true">Enabled</option>
        <option value="false">Disabled</option>
      </CFormSelect>
    </>
  )

  return (
    <>
      <PageHeader
        title="Consumers"
        description="Clients that acquire leases with an API key. Keys are hashed server-side and shown only once at rotation."
        actions={
          <CButton color="primary" onClick={() => setEditing({})}>
            <i className="fa-solid fa-plus me-2" />
            New consumer
          </CButton>
        }
      />

      <CCard>
        <CCardBody>
          <DataTable
            columns={columns}
            items={collection.items}
            loading={collection.loading}
            error={collection.error}
            count={collection.count}
            page={collection.page}
            pageSize={collection.pageSize}
            onPageChange={collection.setPage}
            search={collection.search}
            onSearchChange={collection.setSearch}
            searchPlaceholder="Search consumers…"
            sort={collection.sort}
            onSortChange={collection.setSort}
            onRefresh={collection.refresh}
            filters={filterControls}
            emptyMessage="No consumers yet. Create a consumer group first, then add consumers to it."
          />
        </CCardBody>
      </CCard>

      <ResourceModal
        visible={Boolean(editing)}
        title={editing?.id ? `Edit ${editing.display_name}` : 'New consumer'}
        fields={fields}
        initialValues={editing || {}}
        pending={saveMutation.pending}
        error={saveMutation.error}
        onSubmit={handleSave}
        onClose={() => setEditing(null)}
      >
        {({ values }) =>
          values.key ? (
            <div className="form-text">
              Stored key will be <code>{normaliseDashedKey(values.key)}</code>
            </div>
          ) : null
        }
      </ResourceModal>

      <ConfirmDialog
        visible={Boolean(rotating)}
        title="Rotate API key"
        confirmLabel="Rotate key"
        confirmColor="warning"
        pending={rotateMutation.pending}
        error={rotateMutation.error}
        onConfirm={handleRotate}
        onClose={() => setRotating(null)}
      >
        <p className="mb-0">
          Issue a new API key for <strong>{rotating?.display_name}</strong>? Any existing key stops
          working immediately and every client using it will start receiving 401 responses.
        </p>
      </ConfirmDialog>

      <ConfirmDialog
        visible={Boolean(deleting)}
        title="Delete consumer"
        confirmLabel="Delete"
        pending={deleteMutation.pending}
        error={deleteMutation.error}
        onConfirm={handleDelete}
        onClose={() => setDeleting(null)}
      >
        <p className="mb-0">
          Delete <strong>{deleting?.display_name}</strong>? This fails if the consumer still has
          leases or drift events referencing it; disable it instead.
        </p>
      </ConfirmDialog>

      {issuedKey && <ApiKeyModal payload={issuedKey} onClose={() => setIssuedKey(null)} />}
    </>
  )
}

export default Consumers
