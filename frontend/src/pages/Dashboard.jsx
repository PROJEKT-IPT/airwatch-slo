import { useEffect, useState } from 'react'

import { getRegions } from '../api/airwatchApi'
import RegionSelect from '../components/RegionSelect'

const FALLBACK_REGIONS = [
  {
    id_region: 1,
    region_code: 'SI_BBOX',
    region_name: 'Slovenia bbox',
    region_type: 'test_bbox',
    bbox_lat_min: 45.4,
    bbox_lat_max: 46.9,
    bbox_lon_min: 13.4,
    bbox_lon_max: 16.6,
  },
]

function Dashboard() {
  const [regions, setRegions] = useState([])
  const [selectedRegionCode, setSelectedRegionCode] = useState('')
  const [isLoadingRegions, setIsLoadingRegions] = useState(true)
  const [regionsError, setRegionsError] = useState('')

  useEffect(() => {
    let isMounted = true

    async function loadRegions() {
      try {
        const loadedRegions = await getRegions()

        if (!isMounted) {
          return
        }

        setRegions(loadedRegions)
        setSelectedRegionCode(loadedRegions[0]?.region_code || '')
        setRegionsError('')
      } catch (error) {
        if (!isMounted) {
          return
        }

        setRegions(FALLBACK_REGIONS)
        setSelectedRegionCode(FALLBACK_REGIONS[0].region_code)
        setRegionsError('Could not load regions from the backend. Showing fallback region.')
      } finally {
        if (isMounted) {
          setIsLoadingRegions(false)
        }
      }
    }

    loadRegions()

    return () => {
      isMounted = false
    }
  }, [])

  return (
    <main style={styles.page}>
      <section style={styles.panel}>
        <h1 style={styles.title}>AirWatch SLO</h1>
        <p style={styles.subtitle}>
          Select a Slovenian region to prepare the Sprint 1 NO2 dashboard view.
        </p>

        <RegionSelect
          regions={regions}
          selectedRegionCode={selectedRegionCode}
          onRegionChange={setSelectedRegionCode}
          isLoading={isLoadingRegions}
          error={regionsError}
        />

        {selectedRegionCode ? (
          <p style={styles.selected}>Selected region code: {selectedRegionCode}</p>
        ) : null}
      </section>
    </main>
  )
}

const styles = {
  page: {
    minHeight: '100vh',
    display: 'grid',
    placeItems: 'center',
    padding: '2rem',
    background: '#f4f7f9',
    color: '#1d2733',
    fontFamily:
      'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  },
  panel: {
    width: '100%',
    maxWidth: '42rem',
    textAlign: 'center',
  },
  title: {
    margin: '0 0 0.5rem',
    fontSize: '2rem',
  },
  subtitle: {
    margin: '0 0 1.5rem',
    color: '#53616f',
  },
  selected: {
    marginTop: '1rem',
    color: '#314256',
  },
}

export default Dashboard
