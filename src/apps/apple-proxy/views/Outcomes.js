import React, { useCallback, useMemo, useState } from 'react'
import { CCard, CCardBody, CFormSelect } from '@coreui/react'

import { useCollection, useOptions } from '../../../api/hooks'
import { DataTable, PageHeader, RelativeTime, StatusBadge } from '../../../components/common'
import { OUTCOMES, OUTCOME_SOURCES, outcomes, proxyEndpoints } from '../api'

const Outcomes = () => {
  const [filters, setFilters] = useState({ endpoint: '', outcome: '', source: '' })

  const collection = useCollection(
    useCallback((options) => outcomes.list(options), []),
    {
      ordering: '-measured_at',
      filters,
    },
  )

  const { options: endpoints } = useOptions(
    useCallback((options) => proxyEndpoints.list(options), []),
  )

  const endpointLabelById = useMemo(
    () => new Map(endpoints.map((endpoint) => [endpoint.id, `${endpoint.host}:${endpoint.port}`])),
    [endpoints],
  )

  const columns = [
    {
      key: 'endpoint',
      label: 'Endpoint',
      render: (row) => <code>{endpointLabelById.get(row.endpoint) || `#${row.endpoint}`}</code>,
    },
    {
      key: 'outcome',
      label: 'Outcome',
      sortable: true,
      render: (row) => <StatusBadge value={row.outcome} kind="outcome" />,
    },
    {
      key: 'source',
      label: 'Source',
      sortable: true,
      render: (row) => (
        <span className="text-capitalize">{String(row.source).replace(/_/g, ' ')}</span>
      ),
    },
    {
      key: 'error_code',
      label: 'Error',
      render: (row) =>
        row.error_code || row.error_message ? (
          <span className="text-danger small" title={row.error_message}>
            {row.error_code || row.error_message}
          </span>
        ) : (
          <span className="text-body-secondary">—</span>
        ),
    },
    {
      key: 'latency_ms',
      label: 'Latency',
      sortable: true,
      render: (row) =>
        row.latency_ms === null || row.latency_ms === undefined ? '—' : `${row.latency_ms} ms`,
    },
    {
      key: 'session_key',
      label: 'Session',
      render: (row) => row.session_key || <span className="text-body-secondary">—</span>,
    },
    {
      key: 'measured_at',
      label: 'Measured',
      sortable: true,
      render: (row) => <RelativeTime value={row.measured_at} />,
    },
  ]

  const filterControls = (
    <>
      <CFormSelect
        size="sm"
        className="w-auto"
        value={filters.endpoint}
        onChange={(event) =>
          setFilters((current) => ({ ...current, endpoint: event.target.value }))
        }
      >
        <option value="">All endpoints</option>
        {endpoints.map((endpoint) => (
          <option key={endpoint.id} value={endpoint.id}>
            {endpoint.host}:{endpoint.port}
          </option>
        ))}
      </CFormSelect>
      <CFormSelect
        size="sm"
        className="w-auto"
        value={filters.outcome}
        onChange={(event) => setFilters((current) => ({ ...current, outcome: event.target.value }))}
      >
        <option value="">All outcomes</option>
        {OUTCOMES.map((outcome) => (
          <option key={outcome} value={outcome}>
            {outcome.replace(/_/g, ' ')}
          </option>
        ))}
      </CFormSelect>
      <CFormSelect
        size="sm"
        className="w-auto"
        value={filters.source}
        onChange={(event) => setFilters((current) => ({ ...current, source: event.target.value }))}
      >
        <option value="">All sources</option>
        {OUTCOME_SOURCES.map((source) => (
          <option key={source} value={source}>
            {source.replace(/_/g, ' ')}
          </option>
        ))}
      </CFormSelect>
    </>
  )

  return (
    <>
      <PageHeader
        title="Outcomes"
        description="Read-only history of reported proxy results. Repeated proxy failures drive an endpoint into quarantine."
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
            emptyMessage="No outcomes recorded yet."
          />
        </CCardBody>
      </CCard>
    </>
  )
}

export default Outcomes
