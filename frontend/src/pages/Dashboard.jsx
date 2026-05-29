import { useEffect, useMemo, useState } from 'react'

import {
  getRegionCsvExportUrl,
  getRegionComparison,
  getRegionDetails,
  getRegionGeometries,
  getRegionalLatestMeasurements,
} from '../api/airwatchApi'
import LatestMeasurementCard from '../components/LatestMeasurementCard'
import MethodologyCard from '../components/MethodologyCard'
import RegionComparisonCard from '../components/RegionComparisonCard'
import RegionDetailsCard from '../components/RegionDetailsCard'
import RegionSelect from '../components/RegionSelect'
import RegionalMap from '../components/RegionalMap'
import TrendChart from '../components/TrendChart'

function Dashboard() {
  const [regionSummaries, setRegionSummaries] = useState([])
  const [regionGeometries, setRegionGeometries] = useState([])
  const [regionComparison, setRegionComparison] = useState([])
  const [selectedRegionCode, setSelectedRegionCode] = useState('')
  const [isLoadingRegions, setIsLoadingRegions] = useState(true)
  const [isLoadingGeometries, setIsLoadingGeometries] = useState(true)
  const [regionsError, setRegionsError] = useState('')
  const [geometriesError, setGeometriesError] = useState('')
  const [isLoadingComparison, setIsLoadingComparison] = useState(false)
  const [comparisonError, setComparisonError] = useState('')
  const [regionDetail, setRegionDetail] = useState(null)
  const [isLoadingDetail, setIsLoadingDetail] = useState(false)
  const [detailError, setDetailError] = useState('')

  useEffect(() => {
    let isMounted = true

    async function loadRegionSummaries() {
      setIsLoadingRegions(true)
      setRegionsError('')

      try {
        const summaries = await getRegionalLatestMeasurements()

        if (!isMounted) {
          return
        }

        const safeSummaries = Array.isArray(summaries) ? summaries : []
        setRegionSummaries(safeSummaries)

        const firstValid = safeSummaries.find(item => item.quality_status === 'valid')
        const defaultRegion = firstValid?.region_code || safeSummaries[0]?.region_code || ''
        setSelectedRegionCode(defaultRegion)
      } catch (error) {
        if (!isMounted) {
          return
        }

        setRegionSummaries([])
        setSelectedRegionCode('')
        setRegionsError(
          'Statističnih regij ni bilo mogoče naložiti iz API-ja. Preverite, ali backend deluje in ali so podatki naloženi v bazo.',
        )
      } finally {
        if (isMounted) {
          setIsLoadingRegions(false)
        }
      }
    }

    loadRegionSummaries()

    return () => {
      isMounted = false
    }
  }, [])

  useEffect(() => {
    let isMounted = true

    async function loadRegionGeometries() {
      setIsLoadingGeometries(true)
      setGeometriesError('')

      try {
        const geometries = await getRegionGeometries()

        if (!isMounted) {
          return
        }

        setRegionGeometries(Array.isArray(geometries) ? geometries : [])
      } catch (error) {
        if (!isMounted) {
          return
        }

        setRegionGeometries([])
        setGeometriesError(
          'Geometrij statističnih regij ni bilo mogoče naložiti iz API-ja. Preverite, ali backend deluje in ali so regionalne meje naložene v bazo.',
        )
      } finally {
        if (isMounted) {
          setIsLoadingGeometries(false)
        }
      }
    }

    loadRegionGeometries()

    return () => {
      isMounted = false
    }
  }, [])

  useEffect(() => {
    let isMounted = true
    const regionCodes = regionSummaries.map(region => region.region_code).filter(Boolean)

    async function loadRegionComparison() {
      if (regionCodes.length < 2) {
        setRegionComparison([])
        setComparisonError('')
        setIsLoadingComparison(false)
        return
      }

      setIsLoadingComparison(true)
      setComparisonError('')

      try {
        const comparison = await getRegionComparison(regionCodes)

        if (!isMounted) {
          return
        }

        setRegionComparison(Array.isArray(comparison) ? comparison : [])
      } catch (error) {
        if (!isMounted) {
          return
        }

        setRegionComparison([])
        setComparisonError(
          'Primerjave regij ni bilo mogoče naložiti iz API-ja. Preverite, ali backend deluje in ali so podatki naloženi v bazo.',
        )
      } finally {
        if (isMounted) {
          setIsLoadingComparison(false)
        }
      }
    }

    loadRegionComparison()

    return () => {
      isMounted = false
    }
  }, [regionSummaries])

  useEffect(() => {
    let isMounted = true

    async function loadRegionDetail() {
      if (!selectedRegionCode) {
        setRegionDetail(null)
        setDetailError('')
        return
      }

      setIsLoadingDetail(true)
      setRegionDetail(null)
      setDetailError('')

      try {
        const detail = await getRegionDetails(selectedRegionCode)

        if (!isMounted) {
          return
        }

        setRegionDetail(detail)
      } catch (error) {
        if (!isMounted) {
          return
        }

        setRegionDetail(null)
        setDetailError(
          'Podrobnosti izbrane regije ni bilo mogoče naložiti iz API-ja. Preverite, ali backend deluje in ali so podatki naloženi v bazo.',
        )
      } finally {
        if (isMounted) {
          setIsLoadingDetail(false)
        }
      }
    }

    loadRegionDetail()

    return () => {
      isMounted = false
    }
  }, [selectedRegionCode])

  const measurement = useMemo(() => {
    if (!regionDetail || !regionDetail.latest_measurement) {
      return null
    }

    return {
      region_code: regionDetail.region_code,
      region_name: regionDetail.region_name,
      region_type: regionDetail.region_type,
      ...regionDetail.latest_measurement,
    }
  }, [regionDetail])

  const selectedSummary = useMemo(
    () => regionSummaries.find(item => item.region_code === selectedRegionCode) || null,
    [regionSummaries, selectedRegionCode],
  )
  const csvExportUrl = selectedRegionCode ? getRegionCsvExportUrl(selectedRegionCode) : ''

  const latestRefreshAt = useMemo(() => {
    let newest = null
    for (const item of regionSummaries) {
      const ts = item?.measurement_end_time
      if (!ts) continue
      const date = new Date(ts)
      if (Number.isNaN(date.getTime())) continue
      if (!newest || date > newest) newest = date
    }
    return newest
  }, [regionSummaries])

  const displayRegionName = measurement?.region_name || selectedSummary?.region_name || ''

  return (
      <main className="dashboard-main">
        <header className="dashboard-header">
          <div>
            <p className="eyebrow">AirWatch SLO</p>
            <h1>Pregled NO₂ po slovenskih statističnih regijah</h1>
            <p className="dashboard-subtitle">
              Zadnja razpoložljiva obdelana meritev NO₂ iz satelitskih produktov
              Sentinel-5P. Prikaz ni v realnem času.
            </p>
          </div>
          <div className="header-status-group">
            <div className="header-status">
              <span className="status-dot" />
              <span>Copernicus Sentinel-5P</span>
            </div>
            <FreshnessBadge latestRefreshAt={latestRefreshAt} isLoading={isLoadingRegions} />
          </div>
        </header>

        <section className="dashboard-hero" aria-label="Izbrana regija in zadnja meritev">
          <div className="hero-primary">
            <RegionSelect
              regions={regionSummaries}
              selectedRegionCode={selectedRegionCode}
              onRegionChange={setSelectedRegionCode}
              isLoading={isLoadingRegions}
              error={regionsError}
            />

            <LatestMeasurementCard
              measurement={measurement}
              selectedRegion={selectedSummary}
              isLoading={isLoadingDetail}
              error={detailError}
              hasRegion={Boolean(selectedRegionCode)}
            />
          </div>

          <RegionalMap
            regions={regionSummaries}
            geometries={regionGeometries}
            selectedRegionCode={selectedRegionCode}
            onRegionSelect={setSelectedRegionCode}
            isLoading={isLoadingRegions || isLoadingGeometries}
            error={regionsError || geometriesError}
          />
        </section>

        <section className="dashboard-section" aria-label="Analiza">
          <div className="section-head">
            <h2 className="section-title">Analiza</h2>
            <p className="section-lead">
              Zgodovinski trend izbrane regije in primerjava regij po zadnji
              razpoložljivi vrednosti NO₂.
            </p>
          </div>
          <div className="section-grid section-grid--analysis">
            <TrendChart
              regionCode={selectedRegionCode}
              regionName={displayRegionName}
            />

            <RegionComparisonCard
              regions={regionComparison}
              selectedRegionCode={selectedRegionCode}
              onRegionSelect={setSelectedRegionCode}
              isLoading={isLoadingComparison}
              error={comparisonError}
            />
          </div>
        </section>

        <section className="dashboard-section" aria-label="Podatki in metodologija">
          <div className="section-head">
            <h2 className="section-title">Podatki in metodologija</h2>
            <p className="section-lead">
              Podrobnosti meritve, izvor in sledljivost podatka ter kako brati
              rezultat.
            </p>
          </div>
          <div className="section-grid section-grid--details">
            <RegionDetailsCard
              measurement={measurement}
              selectedRegion={selectedSummary}
              isLoading={isLoadingDetail}
              error={detailError}
              hasRegion={Boolean(selectedRegionCode)}
              csvExportUrl={csvExportUrl}
            />

            <MethodologyCard />
          </div>
        </section>
      </main>
  )
}

function FreshnessBadge({ latestRefreshAt, isLoading }) {
  if (isLoading) {
    return (
      <div className="freshness-badge freshness-badge--loading" aria-live="polite">
        <span className="freshness-badge-label">Zadnja meritev</span>
        <span className="freshness-badge-value">Nalaganje…</span>
      </div>
    )
  }

  if (!latestRefreshAt) {
    return (
      <div className="freshness-badge freshness-badge--missing">
        <span className="freshness-badge-label">Zadnja meritev</span>
        <span className="freshness-badge-value">Ni podatka</span>
      </div>
    )
  }

  const ageDays = Math.floor((Date.now() - latestRefreshAt.getTime()) / (24 * 60 * 60 * 1000))
  const stale = ageDays >= 4
  const className = stale ? 'freshness-badge freshness-badge--stale' : 'freshness-badge'
  const absolute = formatDateTime(latestRefreshAt.toISOString())

  return (
    <div className={className} title={absolute}>
      <span className="freshness-badge-label">Podatki nazadnje osveženi</span>
      <span className="freshness-badge-value">{formatRelativeAgeDays(ageDays)}</span>
      <em className="freshness-badge-absolute">{absolute}</em>
    </div>
  )
}

function formatRelativeAgeDays(ageDays) {
  if (ageDays <= 0) return 'danes'
  if (ageDays === 1) return 'včeraj'
  return `pred ${ageDays} dnevi`
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
