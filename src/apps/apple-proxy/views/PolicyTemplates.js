import React, { useCallback, useMemo, useState } from 'react'
import PropTypes from 'prop-types'
import {
  CAlert,
  CBadge,
  CButton,
  CCard,
  CCardBody,
  CFormCheck,
  CListGroup,
  CListGroupItem,
  CModal,
  CModalBody,
  CModalFooter,
  CModalHeader,
  CModalTitle,
  CSpinner,
} from '@coreui/react'

import { useCollection, useMutation, useOptions, useResource } from '../../../api/hooks'
import {
  ConfirmDialog,
  DataTable,
  ErrorState,
  PageHeader,
  RelativeTime,
  ResourceModal,
  StatusBadge,
} from '../../../components/common'
import { consumerGroups, normaliseDashedKey, policyTemplates, proxyGroups } from '../api'
import WeightEditor from './WeightEditor'

/** Binds a template to consumer groups and lists the groups already bound. */
const BindModal = ({ template, groups, onClose, onChanged }) => {
  const [selected, setSelected] = useState([])
  const bindMutation = useMutation((ids) => policyTemplates.bind(template.id, ids))

  const bindings = useResource(
    useCallback(({ signal }) => policyTemplates.bindings(template.id, { signal }), [template.id]),
  )

  const boundList = useMemo(
    () => (Array.isArray(bindings.data) ? bindings.data : []),
    [bindings.data],
  )
  const boundGroupIds = useMemo(
    () => new Set(boundList.map((item) => item.consumer_group)),
    [boundList],
  )

  const toggle = (id) =>
    setSelected((current) =>
      current.includes(id) ? current.filter((value) => value !== id) : [...current, id],
    )

  const apply = async () => {
    try {
      await bindMutation.run(selected)
      setSelected([])
      bindings.refresh()
      onChanged()
    } catch {
      // Rendered below.
    }
  }

  return (
    <CModal visible alignment="center" size="lg" onClose={onClose}>
      <CModalHeader>
        <CModalTitle>Bindings — {template.display_name}</CModalTitle>
      </CModalHeader>
      <CModalBody>
        <ErrorState error={bindMutation.error} />

        <h6 className="text-body-secondary text-uppercase small fw-semibold">Currently bound</h6>
        {bindings.loading ? (
          <CSpinner size="sm" />
        ) : boundList.length ? (
          <CListGroup flush className="mb-4">
            {boundList.map((item) => (
              <CListGroupItem
                key={item.id}
                className="d-flex justify-content-between align-items-center px-0"
              >
                <code>{item.consumer_group_key}</code>
                <StatusBadge value={item.enabled} kind="enabled" />
              </CListGroupItem>
            ))}
          </CListGroup>
        ) : (
          <p className="text-body-secondary">No consumer groups are bound to this template yet.</p>
        )}

        <h6 className="text-body-secondary text-uppercase small fw-semibold">Bind more groups</h6>
        <p className="text-body-secondary small">
          Binding fails with a conflict if the template is disabled or its enabled weights do not
          total exactly 100.000%.
        </p>
        {groups.map((group) => (
          <CFormCheck
            key={group.id}
            id={`bind-group-${group.id}`}
            label={
              <>
                {group.display_name} <code className="ms-1">{group.key}</code>
                {boundGroupIds.has(group.id) && (
                  <CBadge color="info" className="ms-2">
                    already bound
                  </CBadge>
                )}
              </>
            }
            checked={selected.includes(group.id)}
            onChange={() => toggle(group.id)}
          />
        ))}
      </CModalBody>
      <CModalFooter>
        <CButton
          color="secondary"
          variant="outline"
          onClick={onClose}
          disabled={bindMutation.pending}
        >
          Close
        </CButton>
        <CButton
          color="primary"
          onClick={apply}
          disabled={!selected.length || bindMutation.pending}
        >
          {bindMutation.pending && <CSpinner size="sm" className="me-2" />}
          Bind selected
        </CButton>
      </CModalFooter>
    </CModal>
  )
}

BindModal.propTypes = {
  template: PropTypes.object.isRequired,
  groups: PropTypes.array.isRequired,
  onClose: PropTypes.func.isRequired,
  onChanged: PropTypes.func.isRequired,
}

const PolicyTemplates = () => {
  const collection = useCollection(
    useCallback((options) => policyTemplates.list(options), []),
    {
      ordering: 'key',
    },
  )

  const { options: providers } = useOptions(useCallback((options) => proxyGroups.list(options), []))
  const { options: groups } = useOptions(useCallback((options) => consumerGroups.list(options), []))

  const [editing, setEditing] = useState(null)
  const [deleting, setDeleting] = useState(null)
  const [weighting, setWeighting] = useState(null)
  const [binding, setBinding] = useState(null)
  const [notice, setNotice] = useState(null)

  const saveMutation = useMutation((template, payload) =>
    template ? policyTemplates.update(template.id, payload) : policyTemplates.create(payload),
  )
  const deleteMutation = useMutation((template) => policyTemplates.remove(template.id))
  const validateMutation = useMutation((template) => policyTemplates.validate(template.id))

  const providerNameById = useMemo(
    () =>
      new Map(
        providers.map((provider) => [provider.id, provider.display_name || provider.provider_key]),
      ),
    [providers],
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
      // Rendered in the dialog; a 409 explains how many groups are still bound.
    }
  }

  const handleValidate = async (template) => {
    setNotice(null)
    try {
      await validateMutation.run(template)
      setNotice({ color: 'success', text: `${template.display_name}: template is valid.` })
    } catch (error) {
      setNotice({
        color: error.isConflict ? 'warning' : 'danger',
        text: `${template.display_name}: ${error.message}`,
      })
    }
  }

  const columns = [
    { key: 'key', label: 'Key', sortable: true, render: (template) => <code>{template.key}</code> },
    { key: 'display_name', label: 'Display name', sortable: true },
    {
      key: 'entries',
      label: 'Mix',
      render: (template) => {
        const entries = template.entries || []
        if (!entries.length) return <span className="text-warning small">no entries</span>
        return (
          <div className="d-flex flex-wrap gap-1">
            {entries.map((entry) => (
              <CBadge key={entry.id} color={entry.enabled ? 'primary' : 'secondary'}>
                {providerNameById.get(entry.provider) || `#${entry.provider}`}{' '}
                {Number(entry.weight_percentage).toFixed(1)}%
              </CBadge>
            ))}
          </div>
        )
      },
    },
    {
      key: 'total',
      label: 'Total',
      render: (template) => {
        const total = (template.entries || [])
          .filter((entry) => entry.enabled)
          .reduce((sum, entry) => sum + Number(entry.weight_percentage || 0), 0)
        const valid = Math.abs(total - 100) < 0.0005
        return <span className={valid ? 'text-success' : 'text-danger'}>{total.toFixed(3)}%</span>
      },
    },
    {
      key: 'enabled',
      label: 'State',
      render: (template) => <StatusBadge value={template.enabled} kind="enabled" />,
    },
    {
      key: 'updated_at',
      label: 'Updated',
      render: (template) => <RelativeTime value={template.updated_at} />,
    },
    {
      key: 'actions',
      label: '',
      className: 'text-end text-nowrap',
      render: (template) => (
        <>
          <CButton
            size="sm"
            color="success"
            variant="ghost"
            title="Edit weights"
            onClick={() => setWeighting(template)}
          >
            <i className="fa-solid fa-sliders" />
          </CButton>
          <CButton
            size="sm"
            color="secondary"
            variant="ghost"
            title="Bindings"
            onClick={() => setBinding(template)}
          >
            <i className="fa-solid fa-link" />
          </CButton>
          <CButton
            size="sm"
            color="info"
            variant="ghost"
            title="Validate"
            onClick={() => handleValidate(template)}
          >
            <i className="fa-solid fa-circle-check" />
          </CButton>
          <CButton
            size="sm"
            color="primary"
            variant="ghost"
            title="Edit"
            onClick={() => setEditing(template)}
          >
            <i className="fa-solid fa-pen" />
          </CButton>
          <CButton
            size="sm"
            color="danger"
            variant="ghost"
            title="Delete"
            onClick={() => setDeleting(template)}
          >
            <i className="fa-solid fa-trash" />
          </CButton>
        </>
      ),
    },
  ]

  const fields = [
    {
      name: 'key',
      label: 'Key',
      hint: 'Optional. Defaults to the display name, normalised to a dashed lowercase key.',
    },
    { name: 'display_name', label: 'Display name', required: true },
    { name: 'description', label: 'Description', type: 'textarea' },
    { name: 'enabled', label: 'Enabled', type: 'checkbox', defaultValue: true },
  ]

  return (
    <>
      <PageHeader
        title="Policy Templates"
        description="Reusable provider combos. Consumer groups bind to one template, and weights are read at allocation time."
        actions={
          <CButton color="primary" onClick={() => setEditing({})}>
            <i className="fa-solid fa-plus me-2" />
            New template
          </CButton>
        }
      />

      {notice && (
        <CAlert color={notice.color} dismissible onClose={() => setNotice(null)}>
          {notice.text}
        </CAlert>
      )}

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
            searchPlaceholder="Search templates…"
            sort={collection.sort}
            onSortChange={collection.setSort}
            onRefresh={collection.refresh}
            emptyMessage="No policy templates yet."
          />
        </CCardBody>
      </CCard>

      <ResourceModal
        visible={Boolean(editing)}
        title={editing?.id ? `Edit ${editing.display_name}` : 'New policy template'}
        fields={fields}
        initialValues={editing || {}}
        pending={saveMutation.pending}
        error={saveMutation.error}
        onSubmit={handleSave}
        onClose={() => setEditing(null)}
      >
        {({ values }) =>
          values.key || values.display_name ? (
            <div className="form-text">
              Stored key will be{' '}
              <code>{normaliseDashedKey(values.key || values.display_name)}</code>
            </div>
          ) : null
        }
      </ResourceModal>

      <ConfirmDialog
        visible={Boolean(deleting)}
        title="Delete policy template"
        confirmLabel="Delete"
        pending={deleteMutation.pending}
        error={deleteMutation.error}
        onConfirm={handleDelete}
        onClose={() => setDeleting(null)}
      >
        <p className="mb-0">
          Delete <strong>{deleting?.display_name}</strong>? Templates bound to consumer groups
          cannot be deleted until those groups are unbound.
        </p>
      </ConfirmDialog>

      {weighting && (
        <WeightEditor
          template={weighting}
          providers={providers}
          onClose={() => setWeighting(null)}
          onSaved={collection.refresh}
        />
      )}

      {binding && (
        <BindModal
          template={binding}
          groups={groups}
          onClose={() => setBinding(null)}
          onChanged={collection.refresh}
        />
      )}
    </>
  )
}

export default PolicyTemplates
