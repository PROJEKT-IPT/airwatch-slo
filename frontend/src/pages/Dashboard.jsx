import { useEffect, useMemo, useState } from 'react'

import {
  getRegionCsvExportUrl,
  getRegionDetails,
  getRegionalLatestMeasurements,
} from '../api/airwatchApi'
import DataProvenanceCard from '../components/DataProvenanceCard'
import DataQualityCard from '../components/DataQualityCard'
import LatestMeasurementCard from '../components/LatestMeasurementCard'
import MapPlaceholder from '../components/MapPlaceholder'
import No2ExplanationCard from '../components/No2ExplanationCard'
import RegionComparisonCard from '../components/RegionComparisonCard'
import RegionDetailsCard from '../components/RegionDetailsCard'
import RegionSelect from '../components/RegionSelect'

function Dashboard() {
  const [regionSummaries, setRegionSummaries] = useState([])
  const [selectedRegionCode, setSelectedRegionCode] = useState('')
  const [isLoadingRegions, setIsLoadingRegions] = useState(true)
  const [regionsError, setRegionsError] = useState('')
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
  const timeRangeLabel = formatDateTimeRange(
    measurement?.measurement_start_time,
    measurement?.measurement_end_time,
  )

  return (
      <main className="dashboard-main">
        <header className="dashboard-header">
          <div>
            <p className="eyebrow">AirWatch SLO</p>
            <h1>Pregled NO₂ po slovenskih statističnih regijah</h1>
            <p className="dashboard-subtitle">
              Prikaz zadnje razpoložljive veljavne NO₂ meritve iz obdelanih
              Sentinel-5P produktov. Prikaz ne predstavlja meritev v realnem
              času.
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

        <section className="top-controls" aria-label="Izbira regije in metapodatki">
          <RegionSelect
            regions={regionSummaries}
            selectedRegionCode={selectedRegionCode}
            onRegionChange={setSelectedRegionCode}
            isLoading={isLoadingRegions}
            error={regionsError}
          />

          <div className="metadata-strip">
            <MetadataItem
              label="Izbrana regija"
              value={displayRegionName || 'Ni izbrana'}
              detail={selectedRegionCode || ''}
            />
            <MetadataItem
              label="Čas meritve"
              value={formatDateTime(measurement?.measurement_end_time)}
              detail={timeRangeLabel}
            />
            <ProductMetadataItem
              label="Vir produkta"
              sourceProductName={measurement?.source_product_name}
            />
          </div>
        </section>

        <section className="dashboard-grid">
          <LatestMeasurementCard
            measurement={measurement}
            selectedRegion={selectedSummary}
            isLoading={isLoadingDetail}
            error={detailError}
            hasRegion={Boolean(selectedRegionCode)}
          />

          <MapPlaceholder
            regions={regionSummaries}
            selectedRegionCode={selectedRegionCode}
            isLoading={isLoadingRegions}
            error={regionsError}
          />

          <RegionDetailsCard
            measurement={measurement}
            selectedRegion={selectedSummary}
            isLoading={isLoadingDetail}
            error={detailError}
            hasRegion={Boolean(selectedRegionCode)}
            csvExportUrl={csvExportUrl}
          />

          <DataQualityCard />

          <No2ExplanationCard />

          <RegionComparisonCard
            regions={regionSummaries}
            selectedRegionCode={selectedRegionCode}
            onRegionSelect={setSelectedRegionCode}
            isLoading={isLoadingRegions}
            error={regionsError}
          />

          <DataProvenanceCard
            measurement={measurement}
            selectedRegion={selectedSummary}
            isLoading={isLoadingDetail}
            error={detailError}
            hasRegion={Boolean(selectedRegionCode)}
          />

          <section className="card coming-soon-card">
            <div>
              <p className="section-kicker">Prihaja kmalu</p>
              <h2>Zgodovina meritev</h2>
              <p>
                Naslednji koraki vključujejo zgodovinske trende za izbrano regijo.
              </p>
            </div>
            <div className="coming-soon-list" aria-label="Prihodnje funkcionalnosti">
              <span>Zgodovinski trend</span>
            </div>
          </section>
        </section>
      </main>
  )
}

function FreshnessBadge({ latestRefreshAt, isLoading }) {
  if (isLoading) {
    return (
      <div className="freshness-badge freshness-badge--loading" aria-live="polite">
        <span className="freshness-badge-label">Podatki nazadnje osveženi</span>
        <span className="freshness-badge-value">Nalaganje…</span>
      </div>
    )
  }

  if (!latestRefreshAt) {
    return (
      <div className="freshness-badge freshness-badge--missing">
        <span className="freshness-badge-label">Podatki nazadnje osveženi</span>
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

function MetadataItem({ label, value, detail = '' }) {
  return (
    <div className="metadata-item" title={detail || ''}>
      <span>{label}</span>
      <strong>{value || 'Ni podatka'}</strong>
      {detail ? <em>{detail}</em> : null}
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

function formatDateTimeRange(startValue, endValue) {
  if (!startValue || !endValue) {
    return ''
  }

  const startText = formatDateTime(startValue)
  const endText = formatDateTime(endValue)

  if (startText === 'Ni podatka' || endText === 'Ni podatka') {
    return ''
  }

  if (startText === endText) {
    return startText
  }

  return `${startText} – ${endText}`
}

export default Dashboard
