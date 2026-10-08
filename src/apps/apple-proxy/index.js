import React from 'react'

const Overview = React.lazy(() => import('./views/Overview'))
const ProviderGroups = React.lazy(() => import('./views/ProviderGroups'))
const Endpoints = React.lazy(() => import('./views/Endpoints'))
const Consumers = React.lazy(() => import('./views/Consumers'))
const ConsumerGroups = React.lazy(() => import('./views/ConsumerGroups'))
const PolicyTemplates = React.lazy(() => import('./views/PolicyTemplates'))
const Leases = React.lazy(() => import('./views/Leases'))
const Outcomes = React.lazy(() => import('./views/Outcomes'))
const AllocationWindows = React.lazy(() => import('./views/AllocationWindows'))
const DriftEvents = React.lazy(() => import('./views/DriftEvents'))
const DatabaseOperations = React.lazy(() => import('./views/DatabaseOperations'))

const basePath = '/apps/apple-proxy'

/**
 * Apple Proxy operator console.
 *
 * Only the operator surface is exposed here. The mutating consumer routes
 * (`leases/<token>/*` and `outcomes/report`) need a consumer API key, which must
 * never be held by the admin browser. The Leases view reads the separate
 * admin-only `leases/` collection instead, so it can observe lease state
 * without being able to acquire, renew or release.
 */
const appleProxyApp = {
  id: 'apple-proxy',
  title: 'Apple Proxy',
  description: 'Proxy inventory, consumers, allocation policy and health.',
  icon: 'fa-solid fa-network-wired',
  basePath,
  requiredRoles: ['admin'],
  routes: [
    { path: basePath, name: 'Apple Proxy', element: Overview },
    { path: `${basePath}/groups`, name: 'Provider Groups', element: ProviderGroups },
    { path: `${basePath}/endpoints`, name: 'Endpoints', element: Endpoints },
    { path: `${basePath}/consumers`, name: 'Consumers', element: Consumers },
    { path: `${basePath}/consumer-groups`, name: 'Consumer Groups', element: ConsumerGroups },
    { path: `${basePath}/policy-templates`, name: 'Policy Templates', element: PolicyTemplates },
    { path: `${basePath}/leases`, name: 'Leases', element: Leases },
    { path: `${basePath}/outcomes`, name: 'Outcomes', element: Outcomes },
    {
      path: `${basePath}/allocation-windows`,
      name: 'Allocation Windows',
      element: AllocationWindows,
    },
    { path: `${basePath}/drift-events`, name: 'Drift Events', element: DriftEvents },
    {
      path: `${basePath}/database`,
      name: 'Database Operations',
      element: DatabaseOperations,
    },
  ],
  navItems: [
    { name: 'Overview', to: basePath, icon: 'fa-solid fa-gauge-high' },
    { name: 'Provider Groups', to: `${basePath}/groups`, icon: 'fa-solid fa-layer-group' },
    { name: 'Endpoints', to: `${basePath}/endpoints`, icon: 'fa-solid fa-server' },
    { name: 'Consumers', to: `${basePath}/consumers`, icon: 'fa-solid fa-plug' },
    { name: 'Consumer Groups', to: `${basePath}/consumer-groups`, icon: 'fa-solid fa-users-gear' },
    {
      name: 'Policy Templates',
      to: `${basePath}/policy-templates`,
      icon: 'fa-solid fa-scale-balanced',
    },
    { name: 'Leases', to: `${basePath}/leases`, icon: 'fa-solid fa-key' },
    { name: 'Outcomes', to: `${basePath}/outcomes`, icon: 'fa-solid fa-clipboard-list' },
    {
      name: 'Allocation Windows',
      to: `${basePath}/allocation-windows`,
      icon: 'fa-solid fa-chart-pie',
    },
    {
      name: 'Drift Events',
      to: `${basePath}/drift-events`,
      icon: 'fa-solid fa-arrows-turn-to-dots',
    },
    {
      name: 'Database',
      to: `${basePath}/database`,
      icon: 'fa-solid fa-database',
    },
  ],
}

export default appleProxyApp
