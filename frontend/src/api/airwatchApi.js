const LOCAL_API_URL = 'http://localhost:8000'
const PRODUCTION_API_URL = 'https://airwatch-slo-production.up.railway.app'
const ADMIN_AUTH_STORAGE_KEY = 'airwatch-admin-auth'

function getApiBaseUrl() {
  const defaultApiUrl = import.meta.env.DEV ? LOCAL_API_URL : PRODUCTION_API_URL
  return (import.meta.env.VITE_API_URL || defaultApiUrl).replace(/\/$/, '')
}

export class AdminUnauthorizedError extends Error {
  constructor(message = 'Admin session is no longer valid.') {
    super(message)
    this.name = 'AdminUnauthorizedError'
  }
}

export class AdminDisabledError extends Error {
  constructor(message = 'Admin endpoints are disabled on the server.') {
    super(message)
    this.name = 'AdminDisabledError'
  }
}

export function setAdminPassword(password) {
  if (typeof window === 'undefined') return
  window.sessionStorage.setItem(ADMIN_AUTH_STORAGE_KEY, password)
}

export function clearAdminAuth() {
  if (typeof window === 'undefined') return
  window.sessionStorage.removeItem(ADMIN_AUTH_STORAGE_KEY)
}

export function hasAdminAuth() {
  if (typeof window === 'undefined') return false
  return Boolean(window.sessionStorage.getItem(ADMIN_AUTH_STORAGE_KEY))
}

function adminAuthHeader() {
  if (typeof window === 'undefined') return {}
  const token = window.sessionStorage.getItem(ADMIN_AUTH_STORAGE_KEY)
  return token ? { 'X-Admin-Token': token } : {}
}

export async function verifyAdminPassword(password) {
  const response = await fetch(`${getApiBaseUrl()}/processing/status`, {
    headers: { 'X-Admin-Token': password },
  })

  if (response.status === 401) return false
  if (response.status === 503) throw new AdminDisabledError()
  // 200 (status row present) and 404 (no runs yet) both mean the token passed.
  return response.ok || response.status === 404
}

async function fetchJsonOrNull(url, label) {
  const response = await fetch(url)

  if (response.status === 404) {
    return null
  }

  if (!response.ok) {
    throw new Error(`Failed to load ${label}: ${response.status}`)
  }

  return response.json()
}

export async function getRegionalLatestMeasurements() {
  const response = await fetch(`${getApiBaseUrl()}/api/v1/regions/latest-measurements`)

  if (!response.ok) {
    throw new Error(`Failed to load regional latest measurements: ${response.status}`)
  }

  return response.json()
}

export async function getRegionGeometries() {
  const response = await fetch(`${getApiBaseUrl()}/api/v1/regions/geometries`)

  if (!response.ok) {
    throw new Error(`Failed to load region geometries: ${response.status}`)
  }

  return response.json()
}

export async function getRegionComparison(regionCodes) {
  const safeCodes = [...new Set(regionCodes.filter(Boolean))]

  if (safeCodes.length < 2) {
    return []
  }

  const params = new URLSearchParams()
  safeCodes.forEach(regionCode => {
    params.append('region_codes', regionCode)
  })

  const response = await fetch(`${getApiBaseUrl()}/api/v1/regions/compare?${params}`)

  if (!response.ok) {
    throw new Error(`Failed to load region comparison: ${response.status}`)
  }

  return response.json()
}

export async function getRegionDetails(regionCode) {
  const safeCode = encodeURIComponent(regionCode)
  return fetchJsonOrNull(
    `${getApiBaseUrl()}/api/v1/regions/${safeCode}`,
    `region details for ${regionCode}`,
  )
}

export async function getProcessingStatus() {
  const response = await fetch(`${getApiBaseUrl()}/processing/status`, {
    headers: adminAuthHeader(),
  })

  if (response.status === 401) throw new AdminUnauthorizedError()
  if (response.status === 503) throw new AdminDisabledError()
  if (response.status === 404) return null

  if (!response.ok) {
    throw new Error(`Failed to load processing status: ${response.status}`)
  }

  return response.json()
}

export async function getProcessingHistory({ limit = 20, offset = 0 } = {}) {
  const params = new URLSearchParams()
  if (limit !== null && limit !== undefined) params.append('limit', String(limit))
  if (offset !== null && offset !== undefined) params.append('offset', String(offset))

  const query = params.toString() ? `?${params.toString()}` : ''
  const response = await fetch(`${getApiBaseUrl()}/processing/history${query}`, {
    headers: adminAuthHeader(),
  })

  if (response.status === 401) throw new AdminUnauthorizedError()
  if (response.status === 503) throw new AdminDisabledError()

  if (!response.ok) {
    throw new Error(`Failed to load processing history: ${response.status}`)
  }

  return response.json()
}

export function getRegionCsvExportUrl(regionCode) {
  const safeCode = encodeURIComponent(regionCode)
  return `${getApiBaseUrl()}/api/v1/regions/${safeCode}/export.csv`
}

export function getRegionHistoryCsvExportUrl(regionCode) {
  const safeCode = encodeURIComponent(regionCode)
  return `${getApiBaseUrl()}/api/v1/regions/${safeCode}/history/export.csv`
}

export function getAllRegionsCsvExportUrl() {
  return `${getApiBaseUrl()}/api/v1/regions/export.csv`
}

export async function getRegionHistory(regionCode, { startDate, endDate } = {}) {
  const safeCode = encodeURIComponent(regionCode)
  const params = new URLSearchParams()
  if (startDate) params.append('start_date', startDate)
  if (endDate) params.append('end_date', endDate)

  const query = params.toString() ? `?${params.toString()}` : ''

  return fetchJsonOrNull(
    `${getApiBaseUrl()}/api/v1/regions/${safeCode}/history${query}`,
    `region history for ${regionCode}`,
  )
}
