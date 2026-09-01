import keycloak from '../auth/keycloak'

/**
 * Error thrown for any non-2xx API response.
 *
 * `body` keeps the raw DRF payload so callers can bind field-level validation
 * errors onto a form, while `message` stays human readable for toasts/alerts.
 */
export class ApiError extends Error {
  constructor(status, body, url) {
    super(ApiError.buildMessage(status, body))
    this.name = 'ApiError'
    this.status = status
    this.body = body
    this.url = url
  }

  static buildMessage(status, body) {
    const detail = ApiError.extractDetail(body)
    switch (status) {
      case 0:
        return (
          detail ||
          'Cannot reach the API. Check that the service is running and CORS allows this origin.'
        )
      case 401:
        return detail || 'Your session is no longer valid. Please sign in again.'
      case 403:
        return detail || 'This action requires operator (admin) access.'
      case 404:
        return detail || 'The requested item no longer exists.'
      case 409:
        return detail || 'The request conflicts with the current server state.'
      case 500:
      case 502:
      case 503:
      case 504:
        return detail || 'The API returned a server error. Try again in a moment.'
      default:
        return detail || `Request failed with status ${status}.`
    }
  }

  static extractDetail(body) {
    if (!body) return ''
    if (typeof body === 'string') return body
    if (typeof body.detail === 'string') return body.detail
    if (Array.isArray(body) && body.length && typeof body[0] === 'string') return body[0]
    return ''
  }

  /** Non-field error text, if the server reported one. */
  get detail() {
    return ApiError.extractDetail(this.body)
  }

  /**
   * Field-keyed validation messages, suitable for inline form errors.
   * Only meaningful for 400 responses.
   */
  get fieldErrors() {
    if (
      this.status !== 400 ||
      !this.body ||
      typeof this.body !== 'object' ||
      Array.isArray(this.body)
    ) {
      return {}
    }
    return Object.entries(this.body).reduce((accumulator, [field, value]) => {
      if (field === 'detail') return accumulator
      accumulator[field] = Array.isArray(value) ? value.join(' ') : String(value)
      return accumulator
    }, {})
  }

  get isNetworkError() {
    return this.status === 0
  }

  get isConflict() {
    return this.status === 409
  }

  get isForbidden() {
    return this.status === 401 || this.status === 403
  }
}

export const buildQueryString = (params) => {
  if (!params) return ''
  const search = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return
    search.append(key, String(value))
  })
  const query = search.toString()
  return query ? `?${query}` : ''
}

/**
 * DRF may or may not paginate depending on deployment, so normalise both the
 * bare-array and `{count, results}` envelope shapes into one structure.
 */
export const unwrapCollection = (payload) => {
  if (Array.isArray(payload)) {
    return { items: payload, count: payload.length, paginated: false }
  }
  if (payload && Array.isArray(payload.results)) {
    return {
      items: payload.results,
      count: typeof payload.count === 'number' ? payload.count : payload.results.length,
      paginated: true,
    }
  }
  return { items: [], count: 0, paginated: false }
}

const refreshToken = async () => {
  try {
    await keycloak.updateToken(30)
  } catch {
    keycloak.login()
    throw new ApiError(401, { detail: 'Session expired. Redirecting to sign in.' })
  }
  return keycloak.token
}

const parseBody = async (response) => {
  if (response.status === 204) return null
  const text = await response.text()
  if (!text) return null
  const contentType = response.headers.get('content-type') || ''
  if (contentType.includes('application/json')) {
    try {
      return JSON.parse(text)
    } catch {
      return text
    }
  }
  return text
}

/**
 * Creates a thin fetch wrapper bound to one managed app's API origin.
 * Every call carries a freshly refreshed Keycloak bearer token.
 */
export const createApiClient = ({ baseUrl }) => {
  const normalisedBase = String(baseUrl || '').replace(/\/+$/, '')

  const request = async (method, path, { body, params, signal } = {}) => {
    const token = await refreshToken()
    const url = `${normalisedBase}${path}${buildQueryString(params)}`

    const headers = { Accept: 'application/json' }
    if (token) headers.Authorization = `Bearer ${token}`
    if (body !== undefined) headers['Content-Type'] = 'application/json'

    let response
    try {
      response = await fetch(url, {
        method,
        headers,
        signal,
        body: body === undefined ? undefined : JSON.stringify(body),
      })
    } catch (error) {
      if (error && error.name === 'AbortError') throw error
      throw new ApiError(0, { detail: error?.message }, url)
    }

    const payload = await parseBody(response)

    if (!response.ok) {
      if (response.status === 401) {
        keycloak.login()
      }
      throw new ApiError(response.status, payload, url)
    }

    return payload
  }

  return {
    baseUrl: normalisedBase,
    request,
    get: (path, options) => request('GET', path, options),
    post: (path, body, options) => request('POST', path, { ...options, body: body ?? {} }),
    put: (path, body, options) => request('PUT', path, { ...options, body: body ?? {} }),
    patch: (path, body, options) => request('PATCH', path, { ...options, body: body ?? {} }),
    delete: (path, options) => request('DELETE', path, options),
  }
}
