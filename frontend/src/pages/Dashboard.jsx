import { useEffect, useMemo, useRef, useState } from 'react'

import {
  getAllRegionsCsvExportUrl,
  getRegionComparison,
  getRegionCsvExportUrl,
  getRegionDetails,
  getRegionGeometries,
  getRegionHistoryCsvExportUrl,
  getRegionalLatestMeasurements,
} from '../api/airwatchApi'
import LatestMeasurementCard from '../components/LatestMeasurementCard'
import MethodologyCard from '../components/MethodologyCard'
import RegionComparisonCard from '../components/RegionComparisonCard'
import RegionDetailsCard from '../components/RegionDetailsCard'
import RegionSelect from '../components/RegionSelect'
import RegionalMap from '../components/RegionalMap'
import SatelliteCard from '../components/SatelliteCard'
import TrendChart from '../components/TrendChart'
import { useLanguage } from '../i18n'

function Dashboard({ activeView = 'overview' }) {
  const { t } = useLanguage()
  const tRef = useRef(t)
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
    tRef.current = t
  }, [t])

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
        setRegionsError(tRef.current('regionLoadError'))
      } finally {
        if (isMounted) setIsLoadingRegions(false)
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
        if (!isMounted) return
        setRegionGeometries(Array.isArray(geometries) ? geometries : [])
      } catch (error) {
        if (!isMounted) return
        setRegionGeometries([])
        setGeometriesError(tRef.current('geometryLoadError'))
      } finally {
        if (isMounted) setIsLoadingGeometries(false)
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
        if (!isMounted) return
        setRegionComparison(Array.isArray(comparison) ? comparison : [])
      } catch (error) {
        if (!isMounted) return
        setRegionComparison([])
        setComparisonError(tRef.current('comparisonLoadError'))
      } finally {
        if (isMounted) setIsLoadingComparison(false)
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
        if (!isMounted) return
        setRegionDetail(detail)
      } catch (error) {
        if (!isMounted) return
        setRegionDetail(null)
        setDetailError(tRef.current('detailLoadError'))
      } finally {
        if (isMounted) setIsLoadingDetail(false)
      }
    }

    loadRegionDetail()
    return () => {
      isMounted = false
    }
  }, [selectedRegionCode])

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
  const latestRegionCsvExportUrl = selectedRegionCode ? getRegionCsvExportUrl(selectedRegionCode) : ''
  const regionHistoryCsvExportUrl = selectedRegionCode ? getRegionHistoryCsvExportUrl(selectedRegionCode) : ''
  const allRegionsCsvExportUrl = getAllRegionsCsvExportUrl()

  const displayRegionName = measurement?.region_name || selectedSummary?.region_name || ''

  // Relative NO₂ level of the selected region vs. the other valid regions
  // (low / moderate / high), consistent with the map's relative coloring.
  const concentrationLevel = useMemo(() => {
    if (!measurement || measurement.quality_status !== 'valid') return null
    const current = Number(measurement.value_mean)
    if (!Number.isFinite(current)) return null

    const values = regionSummaries
      .filter(region => region.quality_status === 'valid' && Number.isFinite(Number(region.value_mean)))
      .map(region => Number(region.value_mean))
    if (values.length === 0) return null

    const min = Math.min(...values)
    const max = Math.max(...values)
    const ratio = max === min ? 0.5 : (current - min) / (max - min)
    if (ratio < 1 / 3) return 'low'
    if (ratio < 2 / 3) return 'moderate'
    return 'high'
  }, [measurement, regionSummaries])

  const viewMeta = {
    overview: { title: t('dashboardTitle'), lead: t('dashboardSubtitle') },
    trend: { title: t('navTrend'), lead: t('trendViewLead') },
    comparison: { title: t('navComparison'), lead: t('comparisonViewLead') },
    data: { title: t('navDataExport'), lead: t('dataMethodologyLead') },
    suggestions: { title: t('navSuggestions'), lead: '' },
    satellite: { title: t('navSatellite') },
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

  const measurementPanel = (
    <LatestMeasurementCard
      measurement={measurement}
      isLoading={isLoadingDetail}
      error={detailError}
      hasRegion={Boolean(selectedRegionCode)}
      concentrationLevel={concentrationLevel}
      regionSelect={
        <RegionSelect
          regions={regionSummaries}
          selectedRegionCode={selectedRegionCode}
          onRegionChange={setSelectedRegionCode}
          isLoading={isLoadingRegions}
          error={regionsError}
          embedded
          dropUp
        />
      }
    />
  )

  const isMapView = activeView === 'overview'

  return (
    <main className={`dashboard-main${isMapView ? ' dashboard-main--map' : ''}`}>
      {isMapView ? (
        <h1 className="sr-only">{meta.title}</h1>
      ) : (
        <header className="dashboard-header">
          <div>
            <p className="eyebrow">AirWatch SLO</p>
            <h1>{meta.title}</h1>
            {meta.lead ? <p className="dashboard-subtitle">{meta.lead}</p> : null}
          </div>
        </header>
      )}

      {activeView === 'overview' && (
        <RegionalMap
          regions={regionSummaries}
          geometries={regionGeometries}
          selectedRegionCode={selectedRegionCode}
          onRegionSelect={setSelectedRegionCode}
          isLoading={isLoadingRegions || isLoadingGeometries}
          error={regionsError || geometriesError}
          fullScreen
          overlay={measurementPanel}
        />
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
            latestRegionCsvExportUrl={latestRegionCsvExportUrl}
            regionHistoryCsvExportUrl={regionHistoryCsvExportUrl}
            allRegionsCsvExportUrl={allRegionsCsvExportUrl}
          />
        </section>
      )}

      {activeView === 'satellite' && (
        <>
          <SatelliteCard />
          <MethodologyCard />
        </>
      )}

      {activeView === 'suggestions' && (
        <section className="dashboard-view" aria-label={t('navSuggestions')} />
      )}

      {activeView === 'about' && (
        <section className="dashboard-view about-view" aria-label={t('navAbout')}>
          <section className="card">
            <p className="section-kicker">{t('navAbout')}</p>
            <h2>AirWatch SLO</h2>
            <p className="muted-text">{t('aboutText1')}</p>
            <p className="muted-text">{t('aboutVisionText')}</p>
          </section>

          <div className="about-grid">
            <section className="card">
              <h3>{t('aboutUsersTitle')}</h3>
              <ul className="about-list">
                <li>{t('aboutUsersResearchers')}</li>
                <li>{t('aboutUsersPublic')}</li>
                <li>{t('aboutUsersEducation')}</li>
              </ul>
            </section>

            <section className="card">
              <h3>{t('aboutFeaturesTitle')}</h3>
              <ul className="about-list">
                <li>{t('aboutFeature1')}</li>
                <li>{t('aboutFeature2')}</li>
                <li>{t('aboutFeature3')}</li>
                <li>{t('aboutFeature4')}</li>
              </ul>
            </section>
          </div>

          <section className="card">
            <h3>{t('aboutLimitsTitle')}</h3>
            <p className="muted-text">{t('aboutLimitsText')}</p>
            <h3>{t('aboutScopeTitle')}</h3>
            <p className="muted-text">{t('aboutScopeText')}</p>
          </section>

          <section className="card">
            <h3>{t('aboutDataTitle')}</h3>
            <p className="muted-text">{t('aboutDataText')}</p>
            <h3>{t('aboutTeamTitle')}</h3>
            <p className="provenance-note">{t('aboutTeamText')}</p>
          </section>
        </section>
      )}
    </main>
  )
}

export default Dashboard
