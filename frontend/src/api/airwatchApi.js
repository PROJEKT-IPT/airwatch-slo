const DEFAULT_API_URL = 'https://airwatch-slo-production.up.railway.app'

function getApiBaseUrl() {
  return (import.meta.env.VITE_API_URL || DEFAULT_API_URL).replace(/\/$/, '')
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
  return fetchJsonOrNull(`${getApiBaseUrl()}/processing/status`, 'processing status')
}

export async function getProcessingHistory({ limit = 20, offset = 0 } = {}) {
  const params = new URLSearchParams()
  if (limit !== null && limit !== undefined) params.append('limit', String(limit))
  if (offset !== null && offset !== undefined) params.append('offset', String(offset))

  const query = params.toString() ? `?${params.toString()}` : ''
  const response = await fetch(`${getApiBaseUrl()}/processing/history${query}`)

  if (!response.ok) {
    throw new Error(`Failed to load processing history: ${response.status}`)
  }

  return response.json()
}

export function getRegionCsvExportUrl(regionCode) {
  const safeCode = encodeURIComponent(regionCode)
  return `${getApiBaseUrl()}/api/v1/regions/${safeCode}/export.csv`
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
