import React, { useCallback, useMemo, useState } from 'react'
import { CBadge, CCard, CCardBody, CFormSelect } from '@coreui/react'

import { useCollection, useOptions } from '../../../api/hooks'
import { DataTable, PageHeader, RelativeTime } from '../../../components/common'
import { allocationDriftEvents, proxyGroups } from '../api'

const DriftEvents = () => {
  const [filters, setFilters] = useState({ reason: '' })

  const collection = useCollection(
    useCallback((options) => allocationDriftEvents.list(options), []),
    {
      ordering: '-created_at',
      filters,
    },
  )

  const { options: providers } = useOptions(useCallback((options) => proxyGroups.list(options), []))

  const providerNameById = useMemo(
    () =>
      new Map(
        providers.map((provider) => [provider.id, provider.display_name || provider.provider_key]),
      ),
    [providers],
  )

  const reasons = useMemo(
    () => Array.from(new Set(collection.allItems.map((row) => row.reason).filter(Boolean))),
    [collection.allItems],
  )

  const columns = [
    {
      key: 'created_at',
      label: 'When',
      sortable: true,
      render: (row) => <RelativeTime value={row.created_at} />,
    },
    {
      key: 'preferred_provider',
      label: 'Preferred',
      render: (row) => providerNameById.get(row.preferred_provider) || `#${row.preferred_provider}`,
    },
    {
      key: 'actual_provider',
      label: 'Actual',
      render: (row) =>
        row.actual_provider ? (
          providerNameById.get(row.actual_provider) || `#${row.actual_provider}`
        ) : (
          <span className="text-danger">not served</span>
        ),
    },
    {
      key: 'reason',
      label: 'Reason',
      render: (row) => <CBadge color="warning">{String(row.reason).replace(/_/g, ' ')}</CBadge>,
    },
    {
      key: 'fallback_candidates',
      label: 'Candidates',
      render: (row) => {
        const candidates = Array.isArray(row.fallback_candidates) ? row.fallback_candidates : []
        if (!candidates.length) return <span className="text-body-secondary">—</span>
        return (
          <span className="small" title={JSON.stringify(candidates)}>
            {candidates.length} considered
          </span>
        )
      },
    },
    {
      key: 'window',
      label: 'Window',
      render: (row) => <span className="text-body-secondary">#{row.window}</span>,
    },
  ]

  const filterControls = reasons.length ? (
    <CFormSelect
      size="sm"
      className="w-auto"
      value={filters.reason}
      onChange={(event) => setFilters((current) => ({ ...current, reason: event.target.value }))}
    >
      <option value="">All reasons</option>
      {reasons.map((reason) => (
        <option key={reason} value={reason}>
          {reason.replace(/_/g, ' ')}
        </option>
      ))}
    </CFormSelect>
  ) : null

  return (
    <>
      <PageHeader
        title="Allocation Drift"
        description="Recorded when the deficit-ranked ideal provider could not serve and a fallback did instead."
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
            sort={collection.sort}
            onSortChange={collection.setSort}
            onRefresh={collection.refresh}
            filters={filterControls}
            emptyMessage="No drift recorded. Allocation has been matching policy targets."
          />
        </CCardBody>
      </CCard>
    </>
  )
}

export default DriftEvents
