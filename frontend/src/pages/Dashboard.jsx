import { useEffect, useState } from 'react'

import { getLatestMeasurement, getRegions } from '../api/airwatchApi'
import LatestMeasurementCard from '../components/LatestMeasurementCard'
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
  const [latestMeasurement, setLatestMeasurement] = useState(null)
  const [isLoadingMeasurement, setIsLoadingMeasurement] = useState(false)
  const [measurementError, setMeasurementError] = useState('')

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

  useEffect(() => {
    let isMounted = true

    async function loadLatestMeasurement() {
      if (!selectedRegionCode) {
        setLatestMeasurement(null)
        setMeasurementError('')
        return
      }

      setIsLoadingMeasurement(true)
      setMeasurementError('')

      try {
        const measurement = await getLatestMeasurement(selectedRegionCode)

        if (!isMounted) {
          return
        }

        setLatestMeasurement(measurement)
      } catch (error) {
        if (!isMounted) {
          return
        }

        setLatestMeasurement(null)
        setMeasurementError('Could not load the latest NO2 measurement from the backend.')
      } finally {
        if (isMounted) {
          setIsLoadingMeasurement(false)
        }
      }
    }

    loadLatestMeasurement()

    return () => {
      isMounted = false
    }
  }, [selectedRegionCode])

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

        <LatestMeasurementCard
          measurement={latestMeasurement}
          isLoading={isLoadingMeasurement}
          error={measurementError}
        />
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
}

export default Dashboard
