const DEFAULT_API_URL = 'http://localhost:8000'

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
