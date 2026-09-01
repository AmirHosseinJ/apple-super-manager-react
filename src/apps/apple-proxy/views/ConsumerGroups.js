import React, { useCallback, useMemo, useState } from 'react'
import PropTypes from 'prop-types'
import {
  CAlert,
  CButton,
  CCard,
  CCardBody,
  CFormSelect,
  CModal,
  CModalBody,
  CModalFooter,
  CModalHeader,
  CModalTitle,
  CSpinner,
} from '@coreui/react'

import { useCollection, useMutation, useOptions } from '../../../api/hooks'
import {
  ConfirmDialog,
  DataTable,
  ErrorState,
  PageHeader,
  RelativeTime,
  ResourceModal,
  StatusBadge,
} from '../../../components/common'
import { consumerGroups, normaliseDashedKey, policyBindings, policyTemplates } from '../api'

/** View, set or clear the single policy template bound to one consumer group. */
const BindingModal = ({ group, templates, currentTemplateId, onClose, onChanged }) => {
  const [selected, setSelected] = useState(currentTemplateId ? String(currentTemplateId) : '')
  const setMutation = useMutation((templateId) => consumerGroups.setBinding(group.id, templateId))
  const clearMutation = useMutation(() => consumerGroups.clearBinding(group.id))

  const apply = async () => {
    try {
      if (selected) {
        await setMutation.run(Number(selected))
      } else {
        await clearMutation.run()
      }
      onChanged()
      onClose()
    } catch {
      // Rendered below.
    }
  }

  const pending = setMutation.pending || clearMutation.pending

  return (
    <CModal visible alignment="center" onClose={onClose}>
      <CModalHeader>
        <CModalTitle>Policy binding — {group.display_name}</CModalTitle>
      </CModalHeader>
      <CModalBody>
        <ErrorState error={setMutation.error || clearMutation.error} />
        <p className="text-body-secondary">
          A consumer group allocates from exactly one provider combo. Weights are read from the
          template at allocation time, so editing the template affects every group bound to it.
        </p>
        <CFormSelect
          value={selected}
          onChange={(event) => setSelected(event.target.value)}
          disabled={pending}
        >
          <option value="">No binding (allocation will fail closed)</option>
          {templates.map((template) => (
            <option key={template.id} value={template.id}>
              {template.display_name} ({template.key}){template.enabled ? '' : ' — disabled'}
            </option>
          ))}
        </CFormSelect>
      </CModalBody>
      <CModalFooter>
        <CButton color="secondary" variant="outline" onClick={onClose} disabled={pending}>
          Cancel
        </CButton>
        <CButton color="primary" onClick={apply} disabled={pending}>
          {pending && <CSpinner size="sm" className="me-2" />}
          {selected ? 'Bind template' : 'Clear binding'}
        </CButton>
      </CModalFooter>
    </CModal>
  )
}

BindingModal.propTypes = {
  group: PropTypes.object.isRequired,
  templates: PropTypes.array.isRequired,
  currentTemplateId: PropTypes.number,
  onClose: PropTypes.func.isRequired,
  onChanged: PropTypes.func.isRequired,
}

const ConsumerGroups = () => {
  const collection = useCollection(
    useCallback((options) => consumerGroups.list(options), []),
    {
      ordering: 'key',
    },
  )

  const { options: templates } = useOptions(
    useCallback((options) => policyTemplates.list(options), []),
  )
  const { options: bindings, refresh: refreshBindings } = useOptions(
    useCallback((options) => policyBindings.list(options), []),
  )

  const [editing, setEditing] = useState(null)
  const [deleting, setDeleting] = useState(null)
  const [binding, setBinding] = useState(null)
  const [notice, setNotice] = useState(null)

  const saveMutation = useMutation((group, payload) =>
    group ? consumerGroups.update(group.id, payload) : consumerGroups.create(payload),
  )
  const deleteMutation = useMutation((group) => consumerGroups.remove(group.id))
  const validateMutation = useMutation((group) => consumerGroups.validatePolicies(group.id))

  const bindingByGroupId = useMemo(
    () => new Map(bindings.map((item) => [item.consumer_group, item])),
    [bindings],
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
      refreshBindings()
    } catch {
      // Rendered in the dialog.
    }
  }

  const handleValidate = async (group) => {
    setNotice(null)
    try {
      const result = await validateMutation.run(group)
      setNotice({
        color: 'success',
        text: result?.valid
          ? `${group.display_name}: policy set is valid — enabled weights total exactly 100.000%.`
          : `${group.display_name}: validated.`,
      })
    } catch (error) {
      setNotice({
        color: error.isConflict ? 'warning' : 'danger',
        text: `${group.display_name}: ${error.message}`,
      })
    }
  }

  const columns = [
    { key: 'key', label: 'Key', sortable: true, render: (group) => <code>{group.key}</code> },
    { key: 'display_name', label: 'Display name', sortable: true },
    {
      key: 'enabled',
      label: 'State',
      render: (group) => <StatusBadge value={group.enabled} kind="enabled" />,
    },
    {
      key: 'binding',
      label: 'Bound template',
      render: (group) => {
        const bound = bindingByGroupId.get(group.id)
        return bound ? (
          <code>{bound.template_key}</code>
        ) : (
          <span className="text-warning small">
            <i className="fa-solid fa-triangle-exclamation me-1" />
            none
          </span>
        )
      },
    },
    {
      key: 'created_at',
      label: 'Created',
      render: (group) => <RelativeTime value={group.created_at} />,
    },
    {
      key: 'actions',
      label: '',
      className: 'text-end text-nowrap',
      render: (group) => (
        <>
          <CButton
            size="sm"
            color="info"
            variant="ghost"
            title="Validate policies"
            onClick={() => handleValidate(group)}
          >
            <i className="fa-solid fa-circle-check" />
          </CButton>
          <CButton
            size="sm"
            color="secondary"
            variant="ghost"
            title="Manage binding"
            onClick={() => setBinding(group)}
          >
            <i className="fa-solid fa-link" />
          </CButton>
          <CButton
            size="sm"
            color="primary"
            variant="ghost"
            title="Edit"
            onClick={() => setEditing(group)}
          >
            <i className="fa-solid fa-pen" />
          </CButton>
          <CButton
            size="sm"
            color="danger"
            variant="ghost"
            title="Delete"
            onClick={() => setDeleting(group)}
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
    { name: 'enabled', label: 'Enabled', type: 'checkbox', defaultValue: true },
  ]

  return (
    <>
      <PageHeader
        title="Consumer Groups"
        description="Groups own the allocation policy. Disabling a group makes every new acquisition fail closed."
        actions={
          <CButton color="primary" onClick={() => setEditing({})}>
            <i className="fa-solid fa-plus me-2" />
            New consumer group
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
            searchPlaceholder="Search groups…"
            sort={collection.sort}
            onSortChange={collection.setSort}
            onRefresh={collection.refresh}
            emptyMessage="No consumer groups yet."
          />
        </CCardBody>
      </CCard>

      <ResourceModal
        visible={Boolean(editing)}
        title={editing?.id ? `Edit ${editing.display_name}` : 'New consumer group'}
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
        title="Delete consumer group"
        confirmLabel="Delete"
        pending={deleteMutation.pending}
        error={deleteMutation.error}
        onConfirm={handleDelete}
        onClose={() => setDeleting(null)}
      >
        <p className="mb-0">
          Delete <strong>{deleting?.display_name}</strong>? This fails while consumers still belong
          to it.
        </p>
      </ConfirmDialog>

      {binding && (
        <BindingModal
          group={binding}
          templates={templates}
          currentTemplateId={bindingByGroupId.get(binding.id)?.template}
          onClose={() => setBinding(null)}
          onChanged={() => {
            refreshBindings()
            collection.refresh()
          }}
        />
      )}
    </>
  )
}

export default ConsumerGroups
