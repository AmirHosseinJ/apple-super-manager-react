import React, { useCallback, useMemo, useState } from 'react'
import { CAlert, CCard, CCardBody, CFormSelect } from '@coreui/react'

import { useCollection, useOptions } from '../../../api/hooks'
import { DataTable, PageHeader, RelativeTime, StatusBadge } from '../../../components/common'
import { CLIENT_STATUSES, consumers, leases, proxyGroups } from '../api'

const LIFECYCLE_OPTIONS = [
  { value: '', label: 'All leases' },
  { value: 'active', label: 'Active' },
  { value: 'expired', label: 'Expired' },
  { value: 'released', label: 'Released' },
  { value: 'stuck', label: 'Stuck (running but expired)' },
]

const Leases = () => {
  const [filters, setFilters] = useState({ lifecycle: '', client_status: '', consumer: '' })

  const collection = useCollection(
    useCallback((options) => leases.list(options), []),
    {
      ordering: '-acquired_at',
      filters,
    },
  )

  const { options: consumerOptions } = useOptions(
    useCallback((options) => consumers.list(options), []),
  )
  const { options: providers } = useOptions(useCallback((options) => proxyGroups.list(options), []))

  const providerLabel = useMemo(
    () => new Map(providers.map((provider) => [provider.provider_key, provider.display_name])),
    [providers],
  )

  const stuckCount = useMemo(
    () =>
      collection.allItems.filter(
        (row) => row.client_status === 'running' && row.status === 'expired',
      ).length,
    [collection.allItems],
  )

  const columns = [
    {
      key: 'consumer_key',
      label: 'Consumer',
      render: (row) => <code>{row.consumer_key || `#${row.consumer}`}</code>,
    },
    {
      key: 'endpoint_host',
      label: 'Endpoint',
      render: (row) => (
        <>
          <code>
            {row.endpoint_host}:{row.endpoint_port}
          </code>
          <div className="small text-body-secondary">
            {providerLabel.get(row.provider_key) || row.provider_key}
          </div>
        </>
      ),
    },
    {
      key: 'client_status',
      label: 'Client stage',
      sortable: true,
      render: (row) => (
        <>
          <StatusBadge value={row.client_status} kind="clientStatus" />
          {row.client_status_detail ? (
            <div className="small text-body-secondary" title={row.client_status_detail}>
              {row.client_status_detail}
            </div>
          ) : null}
        </>
      ),
    },
    {
      key: 'status',
      label: 'Lease',
      render: (row) => {
        const stuck = row.client_status === 'running' && row.status === 'expired'
        return (
          <>
            <StatusBadge value={row.status} kind="clientStatus" />
            {stuck ? <div className="small text-danger">client never released</div> : null}
          </>
        )
      },
    },
    {
      key: 'owner_key',
      label: 'Owner',
      render: (row) => row.owner_key || <span className="text-body-secondary">&mdash;</span>,
    },
    {
      key: 'acquired_at',
      label: 'Acquired',
      sortable: true,
      render: (row) => <RelativeTime value={row.acquired_at} />,
    },
    {
      key: 'expires_at',
      label: 'Expires',
      sortable: true,
      render: (row) => <RelativeTime value={row.expires_at} />,
    },
    {
      key: 'client_status_at',
      label: 'Stage updated',
      sortable: true,
      render: (row) =>
        row.client_status_at ? (
          <RelativeTime value={row.client_status_at} />
        ) : (
          <span className="text-body-secondary">&mdash;</span>
        ),
    },
    {
      key: 'observed_exit_ip',
      label: 'Observed exit',
      render: (row) => (
        <>
          {row.observed_exit_ip ? (
            <code>{row.observed_exit_ip}</code>
          ) : (
            <span className="text-body-secondary">Not verified</span>
          )}
          {row.observed_country_code || row.observed_asn ? (
            <div className="small text-body-secondary">
              {[row.observed_country_code, row.observed_asn].filter(Boolean).join(' · ')}
            </div>
          ) : null}
          {row.exit_verified_at ? (
            <div className="small text-body-secondary">
              <RelativeTime value={row.exit_verified_at} />
            </div>
          ) : null}
        </>
      ),
    },
  ]

  const filterControls = (
    <>
      <CFormSelect
        size="sm"
        className="w-auto"
        value={filters.lifecycle}
        onChange={(event) =>
          setFilters((current) => ({ ...current, lifecycle: event.target.value }))
        }
      >
        {LIFECYCLE_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </CFormSelect>
      <CFormSelect
        size="sm"
        className="w-auto"
        value={filters.client_status}
        onChange={(event) =>
          setFilters((current) => ({ ...current, client_status: event.target.value }))
        }
      >
        <option value="">All stages</option>
        {CLIENT_STATUSES.map((clientStatus) => (
          <option key={clientStatus} value={clientStatus}>
            {clientStatus}
          </option>
        ))}
      </CFormSelect>
      <CFormSelect
        size="sm"
        className="w-auto"
        value={filters.consumer}
        onChange={(event) =>
          setFilters((current) => ({ ...current, consumer: event.target.value }))
        }
      >
        <option value="">All consumers</option>
        {consumerOptions.map((consumer) => (
          <option key={consumer.id} value={consumer.id}>
            {consumer.key}
          </option>
        ))}
      </CFormSelect>
    </>
  )

  return (
    <>
      <PageHeader
        title="Leases"
        description="Read-only lease activity. Clients report their own stage; the panel never holds a consumer API key, so leases cannot be released from here."
      />
      {stuckCount > 0 && filters.lifecycle !== 'stuck' ? (
        <CAlert color="warning" className="d-flex justify-content-between align-items-center">
          <span>
            {stuckCount} lease{stuckCount === 1 ? '' : 's'} still report running but have expired,
            which usually means the client crashed without releasing.
          </span>
          <button
            type="button"
            className="btn btn-sm btn-warning"
            onClick={() => setFilters((current) => ({ ...current, lifecycle: 'stuck' }))}
          >
            Show them
          </button>
        </CAlert>
      ) : null}
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
            searchPlaceholder="Search host, consumer or owner…"
            sort={collection.sort}
            onSortChange={collection.setSort}
            onRefresh={collection.refresh}
            filters={filterControls}
            emptyMessage="No leases match these filters."
          />
        </CCardBody>
      </CCard>
    </>
  )
}

export default Leases
