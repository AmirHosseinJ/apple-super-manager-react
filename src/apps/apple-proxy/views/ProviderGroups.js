import React, { useCallback, useState } from 'react'
import { CAlert, CButton, CCard, CCardBody } from '@coreui/react'

import { useCollection, useMutation } from '../../../api/hooks'
import {
  ConfirmDialog,
  DataTable,
  PageHeader,
  RelativeTime,
  ResourceModal,
  StatusBadge,
} from '../../../components/common'
import { normaliseProviderKey, proxyGroups } from '../api'

const ProviderGroups = () => {
  const collection = useCollection(
    useCallback((options) => proxyGroups.list(options), []),
    {
      ordering: 'provider_key',
    },
  )

  const [editing, setEditing] = useState(null)
  const [deleting, setDeleting] = useState(null)
  const [notice, setNotice] = useState(null)

  const saveMutation = useMutation((group, payload) =>
    group ? proxyGroups.update(group.id, payload) : proxyGroups.create(payload),
  )
  const deleteMutation = useMutation((group) => proxyGroups.remove(group.id))
  const probeMutation = useMutation((group) => proxyGroups.probe(group.id))

  const handleSave = async (payload) => {
    try {
      await saveMutation.run(editing?.id ? editing : null, payload)
      setEditing(null)
      collection.refresh()
    } catch {
      // Error is rendered inside the modal by ResourceModal.
    }
  }

  const handleDelete = async () => {
    try {
      await deleteMutation.run(deleting)
      setDeleting(null)
      collection.refresh()
    } catch {
      // Error is rendered inside the dialog.
    }
  }

  const handleProbe = async (group) => {
    setNotice(null)
    try {
      const result = await probeMutation.run(group)
      setNotice({
        color: 'info',
        text: `Queued ${result?.queued ?? 0} probe(s) for ${group.display_name}. A Celery worker on proxy_health_queue must be running to process them.`,
      })
    } catch (error) {
      setNotice({ color: 'danger', text: error.message })
    }
  }

  const columns = [
    {
      key: 'provider_key',
      label: 'Provider key',
      sortable: true,
      render: (g) => <code>{g.provider_key}</code>,
    },
    { key: 'display_name', label: 'Display name', sortable: true },
    {
      key: 'health_status',
      label: 'Health',
      sortable: true,
      render: (g) => <StatusBadge value={g.health_status} />,
    },
    {
      key: 'health_score',
      label: 'Score',
      sortable: true,
      render: (g) =>
        g.health_score === null || g.health_score === undefined
          ? '—'
          : Number(g.health_score).toFixed(2),
    },
    {
      key: 'quarantined_until',
      label: 'Quarantined until',
      render: (g) => <RelativeTime value={g.quarantined_until} />,
    },
    {
      key: 'last_recovered_at',
      label: 'Last recovered',
      render: (g) => <RelativeTime value={g.last_recovered_at} />,
    },
    {
      key: 'last_error',
      label: 'Last error',
      render: (g) =>
        g.last_error ? (
          <span
            className="text-danger small text-truncate d-inline-block"
            style={{ maxWidth: 220 }}
            title={g.last_error}
          >
            {g.last_error}
          </span>
        ) : (
          <span className="text-body-secondary">—</span>
        ),
    },
    {
      key: 'actions',
      label: '',
      className: 'text-end text-nowrap',
      render: (group) => (
        <>
          <CButton
            size="sm"
            color="secondary"
            variant="ghost"
            title="Probe all endpoints"
            onClick={() => handleProbe(group)}
          >
            <i className="fa-solid fa-satellite-dish" />
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
    { name: 'display_name', label: 'Display name', required: true },
    {
      name: 'provider_key',
      label: 'Provider key',
      hint: 'Optional. Defaults to the display name. Normalised server-side to lowercase, single-spaced text.',
    },
  ]

  return (
    <>
      <PageHeader
        title="Provider Groups"
        description="Upstream proxy providers. Health fields are maintained by the probe pipeline and are read-only here."
        actions={
          <CButton color="primary" onClick={() => setEditing({})}>
            <i className="fa-solid fa-plus me-2" />
            New provider
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
            searchPlaceholder="Search providers…"
            sort={collection.sort}
            onSortChange={collection.setSort}
            onRefresh={collection.refresh}
            emptyMessage="No provider groups yet. Create one to start adding endpoints."
          />
        </CCardBody>
      </CCard>

      <ResourceModal
        visible={Boolean(editing)}
        title={editing?.id ? `Edit ${editing.display_name}` : 'New provider group'}
        fields={fields}
        initialValues={editing || {}}
        pending={saveMutation.pending}
        error={saveMutation.error}
        onSubmit={handleSave}
        onClose={() => setEditing(null)}
      >
        {({ values }) =>
          values.provider_key || values.display_name ? (
            <div className="form-text">
              Stored key will be{' '}
              <code>{normaliseProviderKey(values.provider_key || values.display_name)}</code>
            </div>
          ) : null
        }
      </ResourceModal>

      <ConfirmDialog
        visible={Boolean(deleting)}
        title="Delete provider group"
        confirmLabel="Delete"
        pending={deleteMutation.pending}
        error={deleteMutation.error}
        onConfirm={handleDelete}
        onClose={() => setDeleting(null)}
      >
        <p className="mb-0">
          Delete <strong>{deleting?.display_name}</strong>? This fails if endpoints or policy
          entries still reference it.
        </p>
      </ConfirmDialog>
    </>
  )
}

export default ProviderGroups
