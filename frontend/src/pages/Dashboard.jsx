import { useEffect, useMemo, useState } from 'react'

import { getLatestMeasurement, getRegions } from '../api/airwatchApi'
import DataQualityCard from '../components/DataQualityCard'
import LatestMeasurementCard from '../components/LatestMeasurementCard'
import MapPlaceholder from '../components/MapPlaceholder'
import RegionDetailsCard from '../components/RegionDetailsCard'
import RegionSelect from '../components/RegionSelect'

const TEST_REGION_CODE = 'SI_BBOX'
const TEST_REGION_TYPE = 'test_bbox'

function Dashboard() {
  const [regions, setRegions] = useState([])
  const [selectedRegionCode, setSelectedRegionCode] = useState('')
  const [isLoadingRegions, setIsLoadingRegions] = useState(true)
  const [regionsError, setRegionsError] = useState('')
  const [latestMeasurement, setLatestMeasurement] = useState(null)
  const [isLoadingMeasurement, setIsLoadingMeasurement] = useState(false)
  const [measurementError, setMeasurementError] = useState('')

  const selectedRegion = useMemo(
    () => regions.find(region => region.region_code === selectedRegionCode) || null,
    [regions, selectedRegionCode],
  )

  useEffect(() => {
    let isMounted = true

    async function loadRegions() {
      setIsLoadingRegions(true)
      setRegionsError('')

      try {
        const loadedRegions = await getRegions()

        if (!isMounted) {
          return
        }

        setRegions(Array.isArray(loadedRegions) ? loadedRegions : [])
        setSelectedRegionCode(loadedRegions?.[0]?.region_code || '')
      } catch (error) {
        if (!isMounted) {
          return
        }

        setRegions([])
        setSelectedRegionCode('')
        setRegionsError('Regij ni bilo mogoče naložiti iz API-ja.')
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
        setMeasurementError('Zadnje meritve NO₂ ni bilo mogoče naložiti iz API-ja.')
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
      <main className="dashboard-main">
        <header className="dashboard-header">
          <div>
            <p className="eyebrow">AirWatch SLO</p>
            <h1>Pregled NO₂ po regijah</h1>
            <p className="dashboard-subtitle">
              Satelitsko spremljanje kakovosti zraka nad Slovenijo.
            </p>
          </div>
          <div className="header-status">
            <span className="status-dot" />
            <span>Copernicus Sentinel-5P</span>
          </div>
        </header>

        <section className="top-controls" aria-label="Izbira regije in metapodatki">
          <RegionSelect
            regions={regions}
            selectedRegionCode={selectedRegionCode}
            onRegionChange={setSelectedRegionCode}
            isLoading={isLoadingRegions}
            error={regionsError}
            isTestRegion={isTestRegion}
          />

          <div className="metadata-strip">
            <MetadataItem
              label="Izbrana regija"
              value={selectedRegion?.region_name || 'Ni izbrana'}
              badge={isTestRegion(selectedRegion) ? 'testno območje' : ''}
            />
            <MetadataItem
              label="Čas meritve"
              value={formatDateTime(latestMeasurement?.measurement_end_time)}
            />
            <ProductMetadataItem
              label="Produkt"
              sourceProductName={latestMeasurement?.source_product_name}
            />
          </div>
        </section>

        <section className="dashboard-grid">
          <LatestMeasurementCard
            measurement={latestMeasurement}
            selectedRegion={selectedRegion}
            isLoading={isLoadingMeasurement}
            error={measurementError}
            hasRegion={Boolean(selectedRegionCode)}
            isTestRegion={isTestRegion(selectedRegion)}
          />

          <MapPlaceholder
            regions={regions}
            selectedRegionCode={selectedRegionCode}
            isLoading={isLoadingRegions}
            error={regionsError}
          />

          <RegionDetailsCard
            measurement={latestMeasurement}
            selectedRegion={selectedRegion}
            isLoading={isLoadingMeasurement}
            error={measurementError}
            hasRegion={Boolean(selectedRegionCode)}
          />

          <DataQualityCard />

          <section className="card coming-soon-card">
            <div>
              <p className="section-kicker">Prihaja kmalu</p>
              <h2>Zgodovina, primerjava in izvoz</h2>
              <p>
                Naslednji koraki vključujejo zgodovinske trende, primerjavo regij
                in izvoz podatkov v CSV.
              </p>
            </div>
            <div className="coming-soon-list" aria-label="Prihodnje funkcionalnosti">
              <span>Zgodovinski trend</span>
              <span>Primerjava regij</span>
              <span>CSV izvoz</span>
            </div>
          </section>
        </section>
      </main>
  )
}

function MetadataItem({ label, value, badge = '' }) {
  return (
    <div className="metadata-item">
      <span>{label}</span>
      <strong>{value || 'Ni podatka'}</strong>
      {badge ? <em className="metadata-badge">{badge}</em> : null}
    </div>
  )
}

function ProductMetadataItem({ label, sourceProductName }) {
  return (
    <div className="metadata-item" title={sourceProductName || ''}>
      <span>{label}</span>
      <strong>{formatProductLabel(sourceProductName)}</strong>
      {sourceProductName ? <em>{sourceProductName}</em> : null}
    </div>
  )
}

function formatProductLabel(sourceProductName) {
  if (!sourceProductName) {
    return 'Ni podatka'
  }

  if (sourceProductName.includes('S5P') && sourceProductName.includes('NO2')) {
    return 'Sentinel-5P OFFL L2 NO₂'
  }

  return sourceProductName
}

function isTestRegion(region) {
  return region?.region_type === TEST_REGION_TYPE || region?.region_code === TEST_REGION_CODE
}

function formatDateTime(value) {
  if (!value) {
    return 'Ni podatka'
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return value
  }

  return new Intl.DateTimeFormat('sl-SI', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date)
}

export default Dashboard
