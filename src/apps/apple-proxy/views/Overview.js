import React, { useCallback, useMemo } from 'react'
import PropTypes from 'prop-types'
import { Link } from 'react-router-dom'
import {
  CBadge,
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
  CListGroup,
  CListGroupItem,
  CRow,
  CSpinner,
} from '@coreui/react'
import { CChartBar } from '@coreui/react-chartjs'

import { useResource } from '../../../api/hooks'
import { unwrapCollection } from '../../../api/http'
import { ErrorState, RelativeTime, StatusBadge } from '../../../components/common'
import {
  allocationDriftEvents,
  allocationWindows,
  consumerGroups,
  isLeasable,
  policyBindings,
  proxyEndpoints,
  proxyGroups,
} from '../api'

const StatCard = ({ label, value, icon, color, hint }) => (
  <CCard className="h-100">
    <CCardBody className="d-flex align-items-center gap-3">
      <span
        className={`bg-${color} bg-opacity-10 text-${color} rounded-circle d-inline-flex align-items-center justify-content-center flex-shrink-0`}
        style={{ width: 48, height: 48 }}
      >
        <i className={icon} />
      </span>
      <div className="min-w-0">
        <div className="fs-4 fw-semibold">{value}</div>
        <div className="text-body-secondary text-uppercase small fw-semibold">{label}</div>
        {hint && <div className="text-body-secondary small">{hint}</div>}
      </div>
    </CCardBody>
  </CCard>
)

StatCard.propTypes = {
  label: PropTypes.string.isRequired,
  value: PropTypes.node.isRequired,
  icon: PropTypes.string.isRequired,
  color: PropTypes.string.isRequired,
  hint: PropTypes.node,
}

const Overview = () => {
  const endpointsResource = useResource(
    useCallback(({ signal }) => proxyEndpoints.list({ params: { page_size: 500 }, signal }), []),
  )
  const groupsResource = useResource(
    useCallback(({ signal }) => proxyGroups.list({ params: { page_size: 500 }, signal }), []),
  )
  const consumerGroupsResource = useResource(
    useCallback(({ signal }) => consumerGroups.list({ params: { page_size: 500 }, signal }), []),
  )
  const bindingsResource = useResource(
    useCallback(({ signal }) => policyBindings.list({ params: { page_size: 500 }, signal }), []),
  )
  const windowsResource = useResource(
    useCallback(
      ({ signal }) =>
        allocationWindows.list({ params: { page_size: 1, ordering: '-window_start' }, signal }),
      [],
    ),
  )
  const driftResource = useResource(
    useCallback(
      ({ signal }) =>
        allocationDriftEvents.list({ params: { page_size: 5, ordering: '-created_at' }, signal }),
      [],
    ),
  )

  const endpoints = useMemo(
    () => unwrapCollection(endpointsResource.data).items,
    [endpointsResource.data],
  )
  const groups = useMemo(() => unwrapCollection(groupsResource.data).items, [groupsResource.data])
  const allConsumerGroups = useMemo(
    () => unwrapCollection(consumerGroupsResource.data).items,
    [consumerGroupsResource.data],
  )
  const bindings = useMemo(
    () => unwrapCollection(bindingsResource.data).items,
    [bindingsResource.data],
  )
  const latestWindow = useMemo(
    () => unwrapCollection(windowsResource.data).items[0],
    [windowsResource.data],
  )
  const recentDrift = useMemo(
    () => unwrapCollection(driftResource.data).items,
    [driftResource.data],
  )

  const loading = endpointsResource.loading || groupsResource.loading
  const error = endpointsResource.error || groupsResource.error

  const healthCounts = useMemo(
    () =>
      endpoints.reduce((accumulator, endpoint) => {
        accumulator[endpoint.health_status] = (accumulator[endpoint.health_status] || 0) + 1
        return accumulator
      }, {}),
    [endpoints],
  )

  const leasableCount = useMemo(() => endpoints.filter(isLeasable).length, [endpoints])
  const quarantined = useMemo(
    () => endpoints.filter((endpoint) => endpoint.health_status === 'quarantined'),
    [endpoints],
  )

  const unboundGroups = useMemo(() => {
    const boundIds = new Set(bindings.map((binding) => binding.consumer_group))
    return allConsumerGroups.filter((group) => !boundIds.has(group.id))
  }, [allConsumerGroups, bindings])

  const providerNameById = useMemo(
    () => new Map(groups.map((group) => [group.id, group.display_name || group.provider_key])),
    [groups],
  )

  const chartData = useMemo(() => {
    const counts = latestWindow?.provider_counts || []
    if (!counts.length) return null
    const total = latestWindow.total_acquisitions || 0
    return {
      labels: counts.map((row) => row.provider_key),
      datasets: [
        {
          label: 'Actual %',
          backgroundColor: '#321fdb',
          data: counts.map((row) => (total ? Number(((row.count / total) * 100).toFixed(2)) : 0)),
        },
        {
          label: 'Target %',
          backgroundColor: '#e55353',
          data: counts.map((row) => Number(Number(row.target_weight || 0).toFixed(2))),
        },
      ],
    }
  }, [latestWindow])

  if (loading) {
    return (
      <div className="text-center py-5">
        <CSpinner color="primary" />
      </div>
    )
  }

  return (
    <>
      <div className="mb-4">
        <h4 className="mb-1">Apple Proxy</h4>
        <p className="text-body-secondary mb-0">
          Operator overview of proxy inventory, allocation policy and health.
        </p>
      </div>

      <ErrorState
        error={error}
        onRetry={() => {
          endpointsResource.refresh()
          groupsResource.refresh()
        }}
        className="mb-4"
      />

      <CRow className="mb-4">
        <CCol sm={6} xl={3} className="mb-3 mb-xl-0">
          <StatCard
            label="Leasable now"
            value={leasableCount}
            icon="fa-solid fa-circle-check"
            color="success"
            hint="Active, admin-enabled and healthy"
          />
        </CCol>
        <CCol sm={6} xl={3} className="mb-3 mb-xl-0">
          <StatCard
            label="Endpoints"
            value={endpoints.length}
            icon="fa-solid fa-server"
            color="primary"
          />
        </CCol>
        <CCol sm={6} xl={3} className="mb-3 mb-xl-0">
          <StatCard
            label="Providers"
            value={groups.length}
            icon="fa-solid fa-layer-group"
            color="info"
          />
        </CCol>
        <CCol sm={6} xl={3}>
          <StatCard
            label="Quarantined"
            value={quarantined.length}
            icon="fa-solid fa-triangle-exclamation"
            color={quarantined.length ? 'danger' : 'secondary'}
          />
        </CCol>
      </CRow>

      <CRow>
        <CCol lg={5} className="mb-4">
          <CCard className="h-100">
            <CCardHeader>
              <i className="fa-solid fa-heart-pulse me-2" />
              Endpoint health
            </CCardHeader>
            <CCardBody className="p-0">
              <CListGroup flush>
                {Object.keys(healthCounts).length === 0 && (
                  <CListGroupItem className="text-body-secondary">No endpoints yet.</CListGroupItem>
                )}
                {Object.entries(healthCounts).map(([status, count]) => (
                  <CListGroupItem
                    key={status}
                    className="d-flex justify-content-between align-items-center"
                  >
                    <StatusBadge value={status} />
                    <strong>{count}</strong>
                  </CListGroupItem>
                ))}
              </CListGroup>
            </CCardBody>
          </CCard>
        </CCol>

        <CCol lg={7} className="mb-4">
          <CCard className="h-100">
            <CCardHeader>
              <i className="fa-solid fa-chart-column me-2" />
              Latest allocation window
              {latestWindow && (
                <span className="float-end text-body-secondary small">
                  <RelativeTime value={latestWindow.window_start} />
                </span>
              )}
            </CCardHeader>
            <CCardBody>
              {chartData ? (
                <CChartBar
                  data={chartData}
                  options={{
                    plugins: { legend: { position: 'bottom' } },
                    scales: {
                      y: {
                        beginAtZero: true,
                        max: 100,
                        ticks: { callback: (value) => `${value}%` },
                      },
                    },
                  }}
                />
              ) : (
                <p className="text-body-secondary mb-0">
                  No allocation data yet. Windows appear once consumers start acquiring leases.
                </p>
              )}
            </CCardBody>
          </CCard>
        </CCol>
      </CRow>

      <CRow>
        <CCol lg={6} className="mb-4">
          <CCard className="h-100">
            <CCardHeader>
              <i className="fa-solid fa-link-slash me-2" />
              Policy binding coverage
            </CCardHeader>
            <CCardBody className="p-0">
              <CListGroup flush>
                <CListGroupItem className="d-flex justify-content-between align-items-center">
                  <span className="text-body-secondary">Consumer groups bound</span>
                  <strong>
                    {bindings.length} / {allConsumerGroups.length}
                  </strong>
                </CListGroupItem>
                {unboundGroups.length === 0 ? (
                  <CListGroupItem className="text-success">
                    <i className="fa-solid fa-check me-2" />
                    Every consumer group has a policy binding.
                  </CListGroupItem>
                ) : (
                  unboundGroups.map((group) => (
                    <CListGroupItem
                      key={group.id}
                      className="d-flex justify-content-between align-items-center"
                    >
                      <code>{group.key}</code>
                      <CBadge color="warning">unbound — allocation fails closed</CBadge>
                    </CListGroupItem>
                  ))
                )}
              </CListGroup>
            </CCardBody>
          </CCard>
        </CCol>

        <CCol lg={6} className="mb-4">
          <CCard className="h-100">
            <CCardHeader>
              <i className="fa-solid fa-arrows-turn-to-dots me-2" />
              Recent drift
              <Link
                to="/apps/apple-proxy/drift-events"
                className="float-end small text-decoration-none"
              >
                View all
              </Link>
            </CCardHeader>
            <CCardBody className="p-0">
              <CListGroup flush>
                {recentDrift.length === 0 && (
                  <CListGroupItem className="text-body-secondary">
                    No drift recorded. Allocation is matching policy targets.
                  </CListGroupItem>
                )}
                {recentDrift.map((event) => (
                  <CListGroupItem
                    key={event.id}
                    className="d-flex justify-content-between align-items-center gap-2"
                  >
                    <span className="small">
                      <code>
                        {providerNameById.get(event.preferred_provider) ||
                          `#${event.preferred_provider}`}
                      </code>
                      <i className="fa-solid fa-arrow-right mx-2 text-body-secondary" />
                      <code>
                        {event.actual_provider
                          ? providerNameById.get(event.actual_provider) ||
                            `#${event.actual_provider}`
                          : 'unserved'}
                      </code>
                    </span>
                    <span className="text-body-secondary small text-nowrap">
                      <RelativeTime value={event.created_at} />
                    </span>
                  </CListGroupItem>
                ))}
              </CListGroup>
            </CCardBody>
          </CCard>
        </CCol>
      </CRow>

      {quarantined.length > 0 && (
        <CCard className="mb-4">
          <CCardHeader>
            <i className="fa-solid fa-triangle-exclamation me-2 text-danger" />
            Quarantined endpoints
          </CCardHeader>
          <CCardBody className="p-0">
            <CListGroup flush>
              {quarantined.map((endpoint) => (
                <CListGroupItem
                  key={endpoint.id}
                  className="d-flex justify-content-between align-items-center"
                >
                  <code>
                    {endpoint.scheme}://{endpoint.host}:{endpoint.port}
                  </code>
                  <span className="d-flex align-items-center gap-3">
                    <CBadge color="danger">
                      {endpoint.consecutive_failures} consecutive failures
                    </CBadge>
                    <span className="text-body-secondary small">
                      until <RelativeTime value={endpoint.quarantined_until} />
                    </span>
                  </span>
                </CListGroupItem>
              ))}
            </CListGroup>
          </CCardBody>
        </CCard>
      )}
    </>
  )
}

export default Overview
