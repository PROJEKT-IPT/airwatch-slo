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
import { useLanguage } from '../i18n'

function Dashboard({ activeView = 'overview' }) {
  const { t, locale } = useLanguage()
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
        if (!isMounted) return

        const safeSummaries = Array.isArray(summaries) ? summaries : []
        setRegionSummaries(safeSummaries)

        const firstValid = safeSummaries.find(item => item.quality_status === 'valid')
        const defaultRegion = firstValid?.region_code || safeSummaries[0]?.region_code || ''
        setSelectedRegionCode(defaultRegion)
      } catch (error) {
        if (!isMounted) return
        setRegionSummaries([])
        setSelectedRegionCode('')
        setRegionsError(t('regionLoadError'))
      } finally {
        if (isMounted) setIsLoadingRegions(false)
      }
    }

    loadRegionSummaries()
    return () => {
      isMounted = false
    }
  }, [t])

  useEffect(() => {
    let isMounted = true

    async function loadRegionGeometries() {
      setIsLoadingGeometries(true)
      setGeometriesError('')

      try {
        const geometries = await getRegionGeometries()
        if (!isMounted) return
        setRegionGeometries(Array.isArray(geometries) ? geometries : [])
      } catch (error) {
        if (!isMounted) return
        setRegionGeometries([])
        setGeometriesError(t('geometryLoadError'))
      } finally {
        if (isMounted) setIsLoadingGeometries(false)
      }
    }

    loadRegionGeometries()
    return () => {
      isMounted = false
    }
  }, [t])

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
        if (!isMounted) return
        setRegionComparison(Array.isArray(comparison) ? comparison : [])
      } catch (error) {
        if (!isMounted) return
        setRegionComparison([])
        setComparisonError(t('comparisonLoadError'))
      } finally {
        if (isMounted) setIsLoadingComparison(false)
      }
    }

    loadRegionComparison()
    return () => {
      isMounted = false
    }
  }, [regionSummaries, t])

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
        if (!isMounted) return
        setRegionDetail(detail)
      } catch (error) {
        if (!isMounted) return
        setRegionDetail(null)
        setDetailError(t('detailLoadError'))
      } finally {
        if (isMounted) setIsLoadingDetail(false)
      }
    }

    loadRegionDetail()
    return () => {
      isMounted = false
    }
  }, [selectedRegionCode, t])

  const measurement = useMemo(() => {
    if (!regionDetail || !regionDetail.latest_measurement) return null

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

  // Relative rank of the selected region among regions with a valid value.
  const rankInfo = useMemo(() => {
    const valid = regionSummaries.filter(
      region => region.quality_status === 'valid' && Number.isFinite(Number(region.value_mean)),
    )
    const sorted = [...valid].sort((left, right) => Number(right.value_mean) - Number(left.value_mean))
    const index = sorted.findIndex(region => region.region_code === selectedRegionCode)
    return index >= 0 ? { rank: index + 1, total: sorted.length } : null
  }, [regionSummaries, selectedRegionCode])

  const viewMeta = {
    overview: { title: t('dashboardTitle'), lead: t('dashboardSubtitle') },
    trend: { title: t('navTrend'), lead: t('trendViewLead') },
    comparison: { title: t('navComparison'), lead: t('comparisonViewLead') },
    data: { title: t('navDataExport'), lead: t('dataMethodologyLead') },
    methodology: { title: t('navMethodology'), lead: t('methodologyViewLead') },
    about: { title: t('navAbout'), lead: t('aboutLead') },
  }
  const meta = viewMeta[activeView] || viewMeta.overview

  const regionSelect = (
    <RegionSelect
      regions={regionSummaries}
      selectedRegionCode={selectedRegionCode}
      onRegionChange={setSelectedRegionCode}
      isLoading={isLoadingRegions}
      error={regionsError}
    />
  )

  const regionalMap = (
    <RegionalMap
      regions={regionSummaries}
      geometries={regionGeometries}
      selectedRegionCode={selectedRegionCode}
      onRegionSelect={setSelectedRegionCode}
      isLoading={isLoadingRegions || isLoadingGeometries}
      error={regionsError || geometriesError}
    />
  )

  return (
    <main className="dashboard-main">
      <header className="dashboard-header">
        <div>
          <p className="eyebrow">AirWatch SLO</p>
          <h1>{meta.title}</h1>
          <p className="dashboard-subtitle">{meta.lead}</p>
        </div>
        <SourceCard latestRefreshAt={latestRefreshAt} isLoading={isLoadingRegions} t={t} locale={locale} />
      </header>

      {activeView === 'overview' && (
        <section className="overview" aria-label={t('heroAria')}>
          <div className="region-bar">
            {regionSelect}
            <RegionChips selectedRegion={selectedSummary} measurement={measurement} locale={locale} t={t} />
          </div>
          <div className="overview-grid">
            {regionalMap}
            <LatestMeasurementCard
              measurement={measurement}
              selectedRegion={selectedSummary}
              isLoading={isLoadingDetail}
              error={detailError}
              hasRegion={Boolean(selectedRegionCode)}
              rank={rankInfo}
            />
          </div>
        </section>
      )}

      {activeView === 'trend' && (
        <section className="dashboard-view" aria-label={t('navTrend')}>
          {regionSelect}
          <TrendChart regionCode={selectedRegionCode} regionName={displayRegionName} />
        </section>
      )}

      {activeView === 'comparison' && (
        <section className="dashboard-view" aria-label={t('navComparison')}>
          <RegionComparisonCard
            regions={regionComparison}
            selectedRegionCode={selectedRegionCode}
            onRegionSelect={setSelectedRegionCode}
            isLoading={isLoadingComparison}
            error={comparisonError}
          />
        </section>
      )}

      {activeView === 'data' && (
        <section className="dashboard-view" aria-label={t('navDataExport')}>
          {regionSelect}
          <RegionDetailsCard
            measurement={measurement}
            selectedRegion={selectedSummary}
            isLoading={isLoadingDetail}
            error={detailError}
            hasRegion={Boolean(selectedRegionCode)}
            csvExportUrl={csvExportUrl}
          />
        </section>
      )}

      {activeView === 'methodology' && (
        <section className="dashboard-view" aria-label={t('navMethodology')}>
          <MethodologyCard />
        </section>
      )}

      {activeView === 'about' && (
        <section className="dashboard-view" aria-label={t('navAbout')}>
          <section className="card">
            <p className="section-kicker">{t('navAbout')}</p>
            <h2>AirWatch SLO</h2>
            <p className="muted-text">{t('aboutText1')}</p>
            <p className="muted-text">{t('aboutText2')}</p>
          </section>
        </section>
      )}
    </main>
  )
}

// Compact info card (top-right of the header): data source + latest
// measurement time + freshness + a subtle not-real-time note.
function SourceCard({ latestRefreshAt, isLoading, t, locale }) {
  const ageDays = latestRefreshAt
    ? Math.floor((Date.now() - latestRefreshAt.getTime()) / (24 * 60 * 60 * 1000))
    : null
  const stale = ageDays !== null && ageDays >= 8
  const absolute = latestRefreshAt ? formatDateTime(latestRefreshAt.toISOString(), t, locale) : null

  return (
    <aside className={`source-card${stale ? ' source-card--stale' : ''}`}>
      <div className="source-row">
        <span className="status-dot" aria-hidden="true" />
        <div className="source-field">
          <span className="source-label">{t('dataSource')}</span>
          <strong className="source-value">Copernicus Sentinel-5P</strong>
        </div>
      </div>
      <div className="source-row">
        <div className="source-field">
          <span className="source-label">{t('latestMeasurement')}</span>
          <strong className="source-value">
            {isLoading ? t('loading') : absolute || t('noData')}
            {ageDays !== null ? <em className="source-age"> · {formatRelativeAgeDays(ageDays, t)}</em> : null}
          </strong>
        </div>
      </div>
      <p className="source-note">{t('notRealTimeNote')}</p>
    </aside>
  )
}

function qualityChip(status, t) {
  if (status === 'valid') return { label: t('valid'), className: 'quality-valid' }
  if (status === 'no_valid_pixels') return { label: t('noValidPixels'), className: 'quality-empty' }
  if (status === 'processing_error') return { label: t('processingError'), className: 'quality-error' }
  return { label: t('unknown'), className: 'quality-empty' }
}

// Small supporting chips next to the region picker for the selected region.
function RegionChips({ selectedRegion, measurement, locale, t }) {
  const code = selectedRegion?.region_code || measurement?.region_code
  if (!code) return null

  const status = selectedRegion?.quality_status ?? measurement?.quality_status
  const pixels = selectedRegion?.pixel_count_valid ?? measurement?.pixel_count_valid
  const qa = measurement?.qa_threshold
  const statusInfo = status ? qualityChip(status, t) : null

  return (
    <div className="region-chips">
      <span className="region-chip">{code}</span>
      {statusInfo ? <span className={`region-chip ${statusInfo.className}`}>{statusInfo.label}</span> : null}
      {Number.isFinite(Number(pixels)) ? (
        <span className="region-chip">{Number(pixels).toLocaleString(locale)} px</span>
      ) : null}
      {qa !== null && qa !== undefined ? (
        <span className="region-chip">QA {Number(qa).toLocaleString(locale, { maximumFractionDigits: 2 })}</span>
      ) : null}
    </div>
  )
}

function formatRelativeAgeDays(ageDays, t) {
  if (ageDays <= 0) return t('today')
  if (ageDays === 1) return t('yesterday')
  return t('daysAgo', { count: ageDays })
}

function formatDateTime(value, t, locale) {
  if (!value) return t('noData')

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value

  return new Intl.DateTimeFormat(locale, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date)
}

export default Dashboard
