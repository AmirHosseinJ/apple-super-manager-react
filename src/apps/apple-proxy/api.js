import { createApiClient } from '../../api/http'

export const APPLE_PROXY_BASE_URL = import.meta.env.VITE_APPLE_PROXY_API_URL || '/api/proxy-manager'

const client = createApiClient({ baseUrl: APPLE_PROXY_BASE_URL })

/** Builds the standard DRF list/retrieve/create/update/delete set for a route. */
const resource = (path) => ({
  list: (options) => client.get(`/${path}/`, options),
  retrieve: (id, options) => client.get(`/${path}/${id}/`, options),
  create: (body, options) => client.post(`/${path}/`, body, options),
  update: (id, body, options) => client.put(`/${path}/${id}/`, body, options),
  patch: (id, body, options) => client.patch(`/${path}/${id}/`, body, options),
  remove: (id, options) => client.delete(`/${path}/${id}/`, options),
})

export const proxyGroups = {
  ...resource('groups'),
  /** Queues probes for every check-enabled endpoint in the group. Returns { queued }. */
  probe: (id) => client.post(`/groups/${id}/probe/`),
}

export const proxyEndpoints = {
  ...resource('endpoints'),
  /** 202 when queued, 409 when checks are disabled for the endpoint. */
  probe: (id) => client.post(`/endpoints/${id}/probe/`),
}

export const consumers = {
  ...resource('consumers'),
  /** Returns the raw `apx_` key exactly once; it is never retrievable again. */
  rotateApiKey: (id) => client.post(`/consumers/${id}/rotate-api-key/`),
}

export const consumerGroups = {
  ...resource('consumer-groups'),
  /** 200 { valid: true } or 409 when enabled weights are not exactly 100.000. */
  validatePolicies: (id) => client.post(`/consumer-groups/${id}/validate-policies/`),
  getBinding: (id, options) => client.get(`/consumer-groups/${id}/binding/`, options),
  setBinding: (id, templateId) =>
    client.put(`/consumer-groups/${id}/binding/`, { template: templateId }),
  clearBinding: (id) => client.delete(`/consumer-groups/${id}/binding/`),
}

export const policyTemplates = {
  ...resource('provider-policy-templates'),
  validate: (id) => client.post(`/provider-policy-templates/${id}/validate/`),
  /** Atomically replaces all entries; 409 unless the enabled total is 100.000. */
  replaceEntries: (id, entries) => client.put(`/provider-policy-templates/${id}/entries/`, entries),
  bind: (id, consumerGroupIds) =>
    client.post(`/provider-policy-templates/${id}/bind/`, { consumer_groups: consumerGroupIds }),
  bindings: (id, options) => client.get(`/provider-policy-templates/${id}/bindings/`, options),
}

export const policyTemplateEntries = resource('provider-policy-template-entries')

export const policyBindings = {
  list: (options) => client.get('/consumer-group-policy-bindings/', options),
  retrieve: (id, options) => client.get(`/consumer-group-policy-bindings/${id}/`, options),
}

export const outcomes = {
  list: (options) => client.get('/outcomes/', options),
  retrieve: (id, options) => client.get(`/outcomes/${id}/`, options),
}

export const databaseBackups = {
  list: (options) => client.get('/backups/', options),
  retrieve: (id, options) => client.get(`/backups/${id}/`, options),
  create: () => client.post('/backups/', {}),
  upload: (file) => {
    const formData = new FormData()
    formData.append('file', file)
    return client.postForm('/backups/upload/', formData)
  },
  remove: (id, options) => client.delete(`/backups/${id}/`, options),
  download: (id, options) => client.download(`/backups/${id}/download/`, options),
  restore: (id, confirmation) => client.post(`/backups/${id}/restore/`, { confirmation }),
}

export const restoreJobs = {
  list: (options) => client.get('/restore-jobs/', options),
  retrieve: (id, options) => client.get(`/restore-jobs/${id}/`, options),
}

export const leases = {
  list: (options) => client.get('/leases/', options),
  retrieve: (id, options) => client.get(`/leases/${id}/`, options),
}

export const allocationWindows = {
  list: (options) => client.get('/allocation-windows/', options),
  retrieve: (id, options) => client.get(`/allocation-windows/${id}/`, options),
}

export const allocationDriftEvents = {
  list: (options) => client.get('/allocation-drift-events/', options),
  retrieve: (id, options) => client.get(`/allocation-drift-events/${id}/`, options),
}

export const HEALTH_STATUSES = ['unknown', 'healthy', 'degraded', 'quarantined', 'probing']
export const GROUP_HEALTH_STATUSES = ['healthy', 'quarantined']
export const OUTCOMES = ['success', 'degraded', 'proxy_failure', 'neutral']
export const OUTCOME_SOURCES = [
  'session_start',
  'session_runtime',
  'session_end',
  'health_probe',
  'manual',
]
export const SCHEMES = ['http', 'https', 'socks5']
export const CLIENT_STATUSES = ['acquired', 'running', 'finished', 'failed']
export const DATABASE_STATUSES = ['queued', 'running', 'completed', 'failed']
/** Server-side computed views over a lease; `stuck` means running but expired. */
export const LEASE_LIFECYCLES = ['active', 'expired', 'released', 'stuck']

/** Mirrors the server-side key normalisation so the UI can preview the result. */
export const normaliseProviderKey = (value) =>
  String(value || '')
    .split(/\s+/)
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
export const normaliseDashedKey = (value) =>
  String(value || '')
    .split(/\s+/)
    .filter(Boolean)
    .join('-')
    .toLowerCase()

/** An endpoint is only leasable when all of these hold (see the API testbook). */
export const isLeasable = (endpoint) =>
  Boolean(endpoint) &&
  endpoint.is_active &&
  endpoint.admin_enabled &&
  endpoint.health_status === 'healthy'

export default client
