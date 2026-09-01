import React, { useCallback, useMemo, useState } from 'react'
import PropTypes from 'prop-types'
import {
  CButton,
  CCard,
  CCardBody,
  CCollapse,
  CFormSelect,
  CProgress,
  CProgressBar,
  CTable,
  CTableBody,
  CTableDataCell,
  CTableHead,
  CTableHeaderCell,
  CTableRow,
} from '@coreui/react'

import { useCollection, useOptions } from '../../../api/hooks'
import { DataTable, PageHeader, RelativeTime } from '../../../components/common'
import { allocationWindows, consumerGroups } from '../api'

/** Per-provider actual-vs-target breakdown for one hourly window. */
const ProviderCounts = ({ window: allocationWindow }) => {
  const counts = allocationWindow.provider_counts || []
  const total = allocationWindow.total_acquisitions || 0

  if (!counts.length) {
    return <p className="text-body-secondary mb-0">No provider counts recorded for this window.</p>
  }

  return (
    <CTable small responsive className="mb-0">
      <CTableHead>
        <CTableRow>
          <CTableHeaderCell scope="col">Provider</CTableHeaderCell>
          <CTableHeaderCell scope="col">Count</CTableHeaderCell>
          <CTableHeaderCell scope="col">Actual</CTableHeaderCell>
          <CTableHeaderCell scope="col">Target</CTableHeaderCell>
          <CTableHeaderCell scope="col" style={{ width: '35%' }}>
            Distribution
          </CTableHeaderCell>
        </CTableRow>
      </CTableHead>
      <CTableBody>
        {counts.map((row) => {
          const actual = total ? (row.count / total) * 100 : 0
          const target = Number(row.target_weight || 0)
          const drifted = Math.abs(actual - target) > 5
          return (
            <CTableRow key={row.provider}>
              <CTableDataCell>
                <code>{row.provider_key}</code>
              </CTableDataCell>
              <CTableDataCell>{row.count}</CTableDataCell>
              <CTableDataCell className={drifted ? 'text-warning' : ''}>
                {actual.toFixed(1)}%
              </CTableDataCell>
              <CTableDataCell className="text-body-secondary">{target.toFixed(3)}%</CTableDataCell>
              <CTableDataCell>
                <CProgress height={8} className="mb-1">
                  <CProgressBar color={drifted ? 'warning' : 'success'} value={actual} />
                </CProgress>
                <CProgress height={4}>
                  <CProgressBar color="secondary" value={target} />
                </CProgress>
              </CTableDataCell>
            </CTableRow>
          )
        })}
      </CTableBody>
    </CTable>
  )
}

ProviderCounts.propTypes = {
  window: PropTypes.object.isRequired,
}

const AllocationWindows = () => {
  const [filters, setFilters] = useState({ consumer_group: '' })
  const [expanded, setExpanded] = useState(null)

  const collection = useCollection(
    useCallback((options) => allocationWindows.list(options), []),
    {
      ordering: '-window_start',
      filters,
    },
  )

  const { options: groups } = useOptions(useCallback((options) => consumerGroups.list(options), []))

  const groupNameById = useMemo(
    () => new Map(groups.map((group) => [group.id, group.display_name || group.key])),
    [groups],
  )

  const columns = [
    {
      key: 'window_start',
      label: 'Window start',
      sortable: true,
      render: (row) => <RelativeTime value={row.window_start} />,
    },
    {
      key: 'consumer_group',
      label: 'Consumer group',
      render: (row) => groupNameById.get(row.consumer_group) || `#${row.consumer_group}`,
    },
    { key: 'total_acquisitions', label: 'Acquisitions', sortable: true },
    {
      key: 'providers',
      label: 'Providers',
      render: (row) => (row.provider_counts || []).length,
    },
    {
      key: 'actions',
      label: '',
      className: 'text-end',
      render: (row) => (
        <CButton
          size="sm"
          color="secondary"
          variant="ghost"
          onClick={() => setExpanded((current) => (current === row.id ? null : row.id))}
        >
          <i className={`fa-solid ${expanded === row.id ? 'fa-chevron-up' : 'fa-chevron-down'}`} />
        </CButton>
      ),
    },
  ]

  const filterControls = (
    <CFormSelect
      size="sm"
      className="w-auto"
      value={filters.consumer_group}
      onChange={(event) =>
        setFilters((current) => ({ ...current, consumer_group: event.target.value }))
      }
    >
      <option value="">All consumer groups</option>
      {groups.map((group) => (
        <option key={group.id} value={group.id}>
          {group.display_name || group.key}
        </option>
      ))}
    </CFormSelect>
  )

  const expandedWindow = collection.items.find((row) => row.id === expanded)

  return (
    <>
      <PageHeader
        title="Allocation Windows"
        description="Hourly allocation tallies per consumer group, showing actual provider share against the policy target."
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
            emptyMessage="No allocation windows yet. They appear once consumers start acquiring leases."
          />

          <CCollapse visible={Boolean(expandedWindow)}>
            {expandedWindow && (
              <div className="border-top pt-3 mt-3">
                <h6 className="text-body-secondary text-uppercase small fw-semibold">
                  Provider distribution — {expandedWindow.total_acquisitions} acquisitions
                </h6>
                <ProviderCounts window={expandedWindow} />
              </div>
            )}
          </CCollapse>
        </CCardBody>
      </CCard>
    </>
  )
}

export default AllocationWindows
