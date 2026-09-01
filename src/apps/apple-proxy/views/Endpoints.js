import React, { useCallback, useMemo, useState } from 'react'
import { CAlert, CBadge, CButton, CCard, CCardBody, CFormSelect } from '@coreui/react'

import { useCollection, useMutation, useOptions } from '../../../api/hooks'
import {
  ConfirmDialog,
  DataTable,
  PageHeader,
  RelativeTime,
  ResourceModal,
  StatusBadge,
} from '../../../components/common'
import { HEALTH_STATUSES, SCHEMES, proxyEndpoints, proxyGroups } from '../api'

const Endpoints = () => {
  const [filters, setFilters] = useState({ group: '', health_status: '', admin_enabled: '' })

  const collection = useCollection(
    useCallback((options) => proxyEndpoints.list(options), []),
    {
      ordering: 'priority',
      filters,
    },
  )

  const { options: groups } = useOptions(useCallback((options) => proxyGroups.list(options), []))

  const [editing, setEditing] = useState(null)
  const [disabling, setDisabling] = useState(null)
  const [notice, setNotice] = useState(null)

  const saveMutation = useMutation((endpoint, payload) =>
    endpoint ? proxyEndpoints.patch(endpoint.id, payload) : proxyEndpoints.create(payload),
  )
  const deleteMutation = useMutation((endpoint) => proxyEndpoints.remove(endpoint.id))
  const probeMutation = useMutation((endpoint) => proxyEndpoints.probe(endpoint.id))

  const groupNameById = useMemo(
    () => new Map(groups.map((group) => [group.id, group.display_name || group.provider_key])),
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
      await deleteMutation.run(disabling)
      setDisabling(null)
      collection.refresh()
    } catch {
      // Rendered in the dialog.
    }
  }

  const handleProbe = async (endpoint) => {
    setNotice(null)
    try {
      await probeMutation.run(endpoint)
      setNotice({
        color: 'info',
        text: `Probe queued for ${endpoint.scheme}://${endpoint.host}:${endpoint.port}. Requires a Celery worker on proxy_health_queue.`,
      })
    } catch (error) {
      setNotice({ color: error.isConflict ? 'warning' : 'danger', text: error.message })
    }
  }

  const columns = [
    {
      key: 'group',
      label: 'Provider',
      sortable: true,
      render: (endpoint) => groupNameById.get(endpoint.group) || `#${endpoint.group}`,
    },
    {
      key: 'host',
      label: 'Address',
      sortable: true,
      render: (endpoint) => (
        <code>
          {endpoint.scheme}://{endpoint.host}:{endpoint.port}
        </code>
      ),
    },
    { key: 'priority', label: 'Priority', sortable: true },
    {
      key: 'health_status',
      label: 'Health',
      sortable: true,
      render: (endpoint) => <StatusBadge value={endpoint.health_status} />,
    },
    {
      key: 'admin_enabled',
      label: 'Admin',
      render: (endpoint) => <StatusBadge value={endpoint.admin_enabled} kind="enabled" />,
    },
    {
      key: 'check_enabled',
      label: 'Checks',
      render: (endpoint) => <StatusBadge value={endpoint.check_enabled} kind="boolean" />,
    },
    {
      key: 'has_credentials',
      label: 'Creds',
      render: (endpoint) =>
        endpoint.has_credentials ? (
          <CBadge color="info">
            <i className="fa-solid fa-key" />
          </CBadge>
        ) : (
          <span className="text-body-secondary">—</span>
        ),
    },
    {
      key: 'consecutive_failures',
      label: 'Fails',
      render: (endpoint) =>
        endpoint.consecutive_failures ? (
          <CBadge color="danger">{endpoint.consecutive_failures}</CBadge>
        ) : (
          <span className="text-body-secondary">0</span>
        ),
    },
    {
      key: 'leased_until',
      label: 'Leased until',
      render: (endpoint) => <RelativeTime value={endpoint.leased_until} />,
    },
    {
      key: 'last_checked_at',
      label: 'Last check',
      render: (endpoint) => <RelativeTime value={endpoint.last_checked_at} />,
    },
    {
      key: 'exit_ip',
      label: 'Verified exit',
      render: (endpoint) => (
        <>
          {endpoint.exit_ip ? (
            <code>{endpoint.exit_ip}</code>
          ) : (
            <span className="text-body-secondary">Not verified</span>
          )}
          {endpoint.exit_country_code || endpoint.exit_asn ? (
            <div className="small text-body-secondary">
              {[endpoint.exit_country_code, endpoint.exit_asn].filter(Boolean).join(' · ')}
            </div>
          ) : null}
          {endpoint.exit_checked_at ? (
            <div className="small text-body-secondary">
              <RelativeTime value={endpoint.exit_checked_at} />
            </div>
          ) : null}
        </>
      ),
    },
    {
      key: 'actions',
      label: '',
      className: 'text-end text-nowrap',
      render: (endpoint) => (
        <>
          <CButton
            size="sm"
            color="secondary"
            variant="ghost"
            title="Probe"
            onClick={() => handleProbe(endpoint)}
          >
            <i className="fa-solid fa-satellite-dish" />
          </CButton>
          <CButton
            size="sm"
            color="primary"
            variant="ghost"
            title="Edit"
            onClick={() => setEditing(endpoint)}
          >
            <i className="fa-solid fa-pen" />
          </CButton>
          <CButton
            size="sm"
            color="danger"
            variant="ghost"
            title="Disable"
            disabled={!endpoint.admin_enabled && !endpoint.is_active}
            onClick={() => setDisabling(endpoint)}
          >
            <i className="fa-solid fa-ban" />
          </CButton>
        </>
      ),
    },
  ]

  const fields = [
    {
      name: 'group',
      label: 'Provider group',
      type: 'select',
      required: true,
      options: groups.map((group) => ({
        value: group.id,
        label: group.display_name || group.provider_key,
      })),
    },
    {
      name: 'scheme',
      label: 'Scheme',
      type: 'select',
      defaultValue: 'http',
      options: SCHEMES.map((scheme) => ({ value: scheme, label: scheme })),
    },
    { name: 'host', label: 'Host', required: true },
    { name: 'port', label: 'Port', type: 'number', min: 1, max: 65535, required: true },
    {
      name: 'username',
      label: 'Username',
      writeOnly: true,
      hint: 'Write-only. Leave blank to keep the stored value.',
    },
    {
      name: 'password',
      label: 'Password',
      type: 'password',
      writeOnly: true,
      hint: 'Write-only and never returned by the API. Leave blank to keep the stored value.',
    },
    {
      name: 'priority',
      label: 'Priority',
      type: 'number',
      min: 0,
      defaultValue: 100,
      hint: 'Lower wins while free.',
    },
    { name: 'admin_enabled', label: 'Admin enabled', type: 'checkbox', defaultValue: true },
    { name: 'check_enabled', label: 'Health checks enabled', type: 'checkbox', defaultValue: true },
  ]

  const filterControls = (
    <>
      <CFormSelect
        size="sm"
        className="w-auto"
        value={filters.group}
        onChange={(event) => setFilters((current) => ({ ...current, group: event.target.value }))}
      >
        <option value="">All providers</option>
        {groups.map((group) => (
          <option key={group.id} value={group.id}>
            {group.display_name || group.provider_key}
          </option>
        ))}
      </CFormSelect>
      <CFormSelect
        size="sm"
        className="w-auto"
        value={filters.health_status}
        onChange={(event) =>
          setFilters((current) => ({ ...current, health_status: event.target.value }))
        }
      >
        <option value="">All health</option>
        {HEALTH_STATUSES.map((status) => (
          <option key={status} value={status}>
            {status}
          </option>
        ))}
      </CFormSelect>
      <CFormSelect
        size="sm"
        className="w-auto"
        value={filters.admin_enabled}
        onChange={(event) =>
          setFilters((current) => ({ ...current, admin_enabled: event.target.value }))
        }
      >
        <option value="">Any admin state</option>
        <option value="true">Admin enabled</option>
        <option value="false">Admin disabled</option>
      </CFormSelect>
    </>
  )

  return (
    <>
      <PageHeader
        title="Proxy Endpoints"
        description="Individual upstream proxies. An endpoint is leasable only when it is active, admin-enabled and healthy."
        actions={
          <CButton color="primary" onClick={() => setEditing({})}>
            <i className="fa-solid fa-plus me-2" />
            New endpoint
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
            searchPlaceholder="Search host…"
            sort={collection.sort}
            onSortChange={collection.setSort}
            onRefresh={collection.refresh}
            filters={filterControls}
            emptyMessage="No endpoints match these filters."
          />
        </CCardBody>
      </CCard>

      <ResourceModal
        visible={Boolean(editing)}
        title={editing?.id ? `Edit ${editing.host}:${editing.port}` : 'New endpoint'}
        fields={fields}
        initialValues={editing || {}}
        pending={saveMutation.pending}
        error={saveMutation.error}
        onSubmit={handleSave}
        onClose={() => setEditing(null)}
      />

      <ConfirmDialog
        visible={Boolean(disabling)}
        title="Disable endpoint"
        confirmLabel="Disable endpoint"
        pending={deleteMutation.pending}
        error={deleteMutation.error}
        onConfirm={handleDelete}
        onClose={() => setDisabling(null)}
      >
        <p>
          This is a <strong>soft delete</strong>. The API clears <code>admin_enabled</code> and{' '}
          <code>is_active</code> but keeps the row, so historical leases and outcomes stay
          auditable.
        </p>
        <p className="mb-0">
          The row will remain in this table marked as disabled:{' '}
          <code>
            {disabling?.scheme}://{disabling?.host}:{disabling?.port}
          </code>
        </p>
      </ConfirmDialog>
    </>
  )
}

export default Endpoints
