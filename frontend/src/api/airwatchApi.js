const DEFAULT_API_URL = '/api'

function getApiBaseUrl() {
  return (import.meta.env.VITE_API_URL || DEFAULT_API_URL).replace(/\/$/, '')
}

export async function getRegions() {
  const response = await fetch(`${getApiBaseUrl()}/regions`)

  if (!response.ok) {
    throw new Error(`Failed to load regions: ${response.status}`)
  }

  return response.json()
}

export async function getLatestMeasurement(regionCode) {
  const params = new URLSearchParams({ region_code: regionCode })
  const response = await fetch(`${getApiBaseUrl()}/measurements/latest?${params}`)

  if (response.status === 404) {
    return null
  }

  if (!response.ok) {
    throw new Error(`Failed to load latest measurement: ${response.status}`)
  }

  return response.json()
}

export async function getProcessingStatus() {
  const response = await fetch(`${getApiBaseUrl()}/processing/status`)

  if (response.status === 404) {
    return null
  }

  if (!response.ok) {
    throw new Error(`Failed to load processing status: ${response.status}`)
  }

  return response.json()
}
