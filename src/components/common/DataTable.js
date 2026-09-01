import React from 'react'
import PropTypes from 'prop-types'
import {
  CButton,
  CFormInput,
  CFormSelect,
  CPagination,
  CPaginationItem,
  CSpinner,
  CTable,
  CTableBody,
  CTableDataCell,
  CTableHead,
  CTableHeaderCell,
  CTableRow,
} from '@coreui/react'

import ErrorState from './ErrorState'

const PAGE_SIZES = [10, 20, 50, 100]

const toggleOrdering = (current, field) => {
  if (current === field) return `-${field}`
  if (current === `-${field}`) return ''
  return field
}

const sortIcon = (current, field) => {
  if (current === field) return 'fa-solid fa-arrow-up-short-wide'
  if (current === `-${field}`) return 'fa-solid fa-arrow-down-wide-short'
  return 'fa-solid fa-sort text-body-secondary opacity-50'
}

/**
 * Server-driven table shell: owns search, ordering and pagination controls and
 * renders loading, error and empty states consistently across every module.
 *
 * `columns` entries: { key, label, render(item), sortable, className, style }
 */
const DataTable = ({
  columns,
  items,
  loading,
  error,
  count,
  page,
  pageSize,
  onPageChange,
  onPageSizeChange,
  search,
  onSearchChange,
  searchPlaceholder = 'Search…',
  sort,
  onSortChange,
  onRefresh,
  rowKey = (item) => item.id,
  emptyMessage = 'Nothing to show yet.',
  toolbar = null,
  filters = null,
}) => {
  const totalPages = Math.max(1, Math.ceil((count || 0) / pageSize))
  const showingFrom = count === 0 ? 0 : (page - 1) * pageSize + 1
  const showingTo = Math.min(page * pageSize, count)

  return (
    <div>
      <div className="d-flex flex-wrap align-items-center gap-2 mb-3">
        {onSearchChange && (
          <CFormInput
            type="search"
            size="sm"
            className="w-auto flex-grow-1"
            style={{ maxWidth: 280 }}
            placeholder={searchPlaceholder}
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
          />
        )}
        {filters}
        <div className="ms-auto d-flex align-items-center gap-2">
          {toolbar}
          {onRefresh && (
            <CButton
              color="secondary"
              variant="outline"
              size="sm"
              onClick={onRefresh}
              disabled={loading}
            >
              <i className="fa-solid fa-rotate-right" />
            </CButton>
          )}
        </div>
      </div>

      <ErrorState error={error} onRetry={onRefresh} />

      <div className="position-relative">
        {loading && (
          <div
            className="position-absolute top-0 start-0 end-0 bottom-0 d-flex align-items-center justify-content-center bg-body bg-opacity-75"
            style={{ zIndex: 2 }}
          >
            <CSpinner color="primary" />
          </div>
        )}

        <CTable hover responsive align="middle" className="mb-0">
          <CTableHead>
            <CTableRow>
              {columns.map((column) => (
                <CTableHeaderCell
                  key={column.key}
                  className={column.className}
                  style={column.style}
                  scope="col"
                >
                  {column.sortable && onSortChange ? (
                    <button
                      type="button"
                      className="btn btn-link p-0 text-decoration-none text-body fw-semibold"
                      onClick={() =>
                        onSortChange(toggleOrdering(sort, column.sortField || column.key))
                      }
                    >
                      {column.label}
                      <i className={`ms-2 ${sortIcon(sort, column.sortField || column.key)}`} />
                    </button>
                  ) : (
                    column.label
                  )}
                </CTableHeaderCell>
              ))}
            </CTableRow>
          </CTableHead>
          <CTableBody>
            {!loading && !error && items.length === 0 && (
              <CTableRow>
                <CTableDataCell
                  colSpan={columns.length}
                  className="text-center text-body-secondary py-5"
                >
                  {emptyMessage}
                </CTableDataCell>
              </CTableRow>
            )}
            {items.map((item) => (
              <CTableRow key={rowKey(item)}>
                {columns.map((column) => (
                  <CTableDataCell
                    key={column.key}
                    className={column.className}
                    style={column.style}
                  >
                    {column.render ? column.render(item) : item[column.key]}
                  </CTableDataCell>
                ))}
              </CTableRow>
            ))}
          </CTableBody>
        </CTable>
      </div>

      <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mt-3">
        <small className="text-body-secondary">
          {count > 0 ? `Showing ${showingFrom}–${showingTo} of ${count}` : 'No records'}
        </small>
        <div className="d-flex align-items-center gap-2">
          {onPageSizeChange && (
            <CFormSelect
              size="sm"
              className="w-auto"
              value={pageSize}
              onChange={(event) => onPageSizeChange(Number(event.target.value))}
            >
              {PAGE_SIZES.map((size) => (
                <option key={size} value={size}>
                  {size} / page
                </option>
              ))}
            </CFormSelect>
          )}
          <CPagination size="sm" className="mb-0">
            <CPaginationItem
              disabled={page <= 1}
              onClick={() => onPageChange(page - 1)}
              style={{ cursor: page <= 1 ? 'default' : 'pointer' }}
            >
              Previous
            </CPaginationItem>
            <CPaginationItem disabled>
              {page} / {totalPages}
            </CPaginationItem>
            <CPaginationItem
              disabled={page >= totalPages}
              onClick={() => onPageChange(page + 1)}
              style={{ cursor: page >= totalPages ? 'default' : 'pointer' }}
            >
              Next
            </CPaginationItem>
          </CPagination>
        </div>
      </div>
    </div>
  )
}

DataTable.propTypes = {
  columns: PropTypes.arrayOf(PropTypes.object).isRequired,
  items: PropTypes.array.isRequired,
  loading: PropTypes.bool,
  error: PropTypes.object,
  count: PropTypes.number,
  page: PropTypes.number,
  pageSize: PropTypes.number,
  onPageChange: PropTypes.func,
  onPageSizeChange: PropTypes.func,
  search: PropTypes.string,
  onSearchChange: PropTypes.func,
  searchPlaceholder: PropTypes.string,
  sort: PropTypes.string,
  onSortChange: PropTypes.func,
  onRefresh: PropTypes.func,
  rowKey: PropTypes.func,
  emptyMessage: PropTypes.node,
  toolbar: PropTypes.node,
  filters: PropTypes.node,
}

export default DataTable
