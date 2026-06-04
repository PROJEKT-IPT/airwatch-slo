import { useEffect, useMemo, useState } from 'react'

import {
  getAllRegionsCsvExportUrl,
  getRegionComparison,
  getRegionCsvExportUrl,
  getRegionDetails,
  getRegionGeometries,
  getRegionHistoryCsvExportUrl,
  getRegionalMeasurementDates,
  getRegionalLatestMeasurements,
} from '../api/airwatchApi'
import LatestMeasurementCard from '../components/LatestMeasurementCard'
import LearnCard from '../components/LearnCard'
import MeasurementDatePicker from '../components/MeasurementDatePicker'
import MethodologyCard from '../components/MethodologyCard'
import RegionComparisonCard from '../components/RegionComparisonCard'
import RegionDetailsCard from '../components/RegionDetailsCard'
import RegionSelect from '../components/RegionSelect'
import RegionalMap from '../components/RegionalMap'
import SatelliteCard from '../components/SatelliteCard'
import TrendChart from '../components/TrendChart'
import { useLanguage } from '../i18n'

function Dashboard({ activeView = 'overview', onDataUpdatedAt }) {
  const { t } = useLanguage()
  const [regionSummaries, setRegionSummaries] = useState([])
  const [regionGeometries, setRegionGeometries] = useState([])
  const [regionComparison, setRegionComparison] = useState([])
  const [selectedRegionCode, setSelectedRegionCode] = useState('')
  const [isLoadingRegions, setIsLoadingRegions] = useState(true)
  const [isLoadingGeometries, setIsLoadingGeometries] = useState(true)
  const [regionsErrorKey, setRegionsErrorKey] = useState('')
  const [geometriesErrorKey, setGeometriesErrorKey] = useState('')
  const [availableMeasurementDates, setAvailableMeasurementDates] = useState([])
  const [selectedMeasurementDate, setSelectedMeasurementDate] = useState(null)
  const [isLoadingMeasurementDates, setIsLoadingMeasurementDates] = useState(true)
  const [measurementDatesErrorKey, setMeasurementDatesErrorKey] = useState('')
  const [isLoadingComparison, setIsLoadingComparison] = useState(false)
  const [comparisonErrorKey, setComparisonErrorKey] = useState('')
  const [regionDetail, setRegionDetail] = useState(null)
  const [isLoadingDetail, setIsLoadingDetail] = useState(false)
  const [detailErrorKey, setDetailErrorKey] = useState('')

  useEffect(() => {
    let isMounted = true

    async function loadMeasurementDates() {
      setIsLoadingMeasurementDates(true)
      setMeasurementDatesErrorKey('')

      try {
        const dates = await getRegionalMeasurementDates()
        if (!isMounted) return
        setAvailableMeasurementDates(normalizeMeasurementDates(dates))
      } catch (error) {
        if (!isMounted) return
        setAvailableMeasurementDates([])
        setMeasurementDatesErrorKey('measurementDatesLoadError')
      } finally {
        if (isMounted) setIsLoadingMeasurementDates(false)
      }
    }

    loadMeasurementDates()
    return () => {
      isMounted = false
    }
  }, [])

  useEffect(() => {
    let isMounted = true

    async function loadRegionSummaries() {
      setIsLoadingRegions(true)
      setRegionsErrorKey('')

      try {
        const summaries = selectedMeasurementDate
          ? await getRegionalLatestMeasurements({ date: selectedMeasurementDate })
          : await getRegionalLatestMeasurements()
        if (!isMounted) return

        const safeSummaries = Array.isArray(summaries) ? summaries : []
        setRegionSummaries(safeSummaries)

        setSelectedRegionCode(currentRegionCode => {
          const selectedStillAvailable = safeSummaries.some(item => item.region_code === currentRegionCode)
          if (selectedStillAvailable) return currentRegionCode

          const firstValid = safeSummaries.find(item => item.quality_status === 'valid')
          return firstValid?.region_code || safeSummaries[0]?.region_code || ''
        })
      } catch (error) {
        if (!isMounted) return
        setRegionSummaries([])
        setSelectedRegionCode('')
        setRegionsErrorKey('regionLoadError')
      } finally {
        if (isMounted) setIsLoadingRegions(false)
      }
    }

    loadRegionSummaries()
    return () => {
      isMounted = false
    }
  }, [selectedMeasurementDate])

  useEffect(() => {
    let isMounted = true

    async function loadRegionGeometries() {
      setIsLoadingGeometries(true)
      setGeometriesErrorKey('')

      try {
        const geometries = await getRegionGeometries()
        if (!isMounted) return
        setRegionGeometries(Array.isArray(geometries) ? geometries : [])
      } catch (error) {
        if (!isMounted) return
        setRegionGeometries([])
        setGeometriesErrorKey('geometryLoadError')
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
        setComparisonErrorKey('')
        setIsLoadingComparison(false)
        return
      }

      setIsLoadingComparison(true)
      setComparisonErrorKey('')

      try {
        const comparison = await getRegionComparison(regionCodes)
        if (!isMounted) return
        setRegionComparison(Array.isArray(comparison) ? comparison : [])
      } catch (error) {
        if (!isMounted) return
        setRegionComparison([])
        setComparisonErrorKey('comparisonLoadError')
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
        setDetailErrorKey('')
        return
      }

      setIsLoadingDetail(true)
      setRegionDetail(null)
      setDetailErrorKey('')

      try {
        const detail = selectedMeasurementDate
          ? await getRegionDetails(selectedRegionCode, { date: selectedMeasurementDate })
          : await getRegionDetails(selectedRegionCode)
        if (!isMounted) return
        setRegionDetail(detail)
      } catch (error) {
        if (!isMounted) return
        setRegionDetail(null)
        setDetailErrorKey('detailLoadError')
      } finally {
        if (isMounted) setIsLoadingDetail(false)
      }
    }

    loadRegionDetail()
    return () => {
      isMounted = false
    }
  }, [selectedMeasurementDate, selectedRegionCode])

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
  const regionsError = regionsErrorKey ? t(regionsErrorKey) : ''
  const geometriesError = geometriesErrorKey ? t(geometriesErrorKey) : ''
  const measurementDatesError = measurementDatesErrorKey ? t(measurementDatesErrorKey) : ''
  const comparisonError = comparisonErrorKey ? t(comparisonErrorKey) : ''
  const detailError = detailErrorKey ? t(detailErrorKey) : ''
  const latestAvailableMeasurementDate = availableMeasurementDates[0]?.measurement_date || null
  const isLatestMeasurementView = !selectedMeasurementDate || selectedMeasurementDate === latestAvailableMeasurementDate

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

  // Report the most recent measurement date (ISO sorts chronologically) so the
  // sidebar can show a discreet "data updated" line.
  useEffect(() => {
    if (!onDataUpdatedAt) return
    const latest = regionSummaries
      .map(region => region.measurement_end_time)
      .filter(Boolean)
      .sort()
      .at(-1)
    onDataUpdatedAt(latest || null)
  }, [regionSummaries, onDataUpdatedAt])

  const viewMeta = {
    overview: { title: t('dashboardTitle'), lead: t('dashboardSubtitle') },
    trend: { title: t('navTrend'), lead: t('trendViewLead') },
    comparison: { title: t('navComparison'), lead: t('comparisonViewLead') },
    data: { title: t('navDataExport'), lead: t('dataMethodologyLead') },
    learn: { title: t('navLearn'), lead: t('learnViewLead') },
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
      datePicker={
        <MeasurementDatePicker
          availableDates={availableMeasurementDates}
          selectedDate={selectedMeasurementDate}
          onDateChange={setSelectedMeasurementDate}
          isLoading={isLoadingMeasurementDates}
          error={measurementDatesError}
        />
      }
      timestampLabelKey={isLatestMeasurementView ? 'lastMeasurement' : 'measurement'}
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

      {activeView === 'learn' && <LearnCard />}

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

function normalizeMeasurementDates(dates) {
  if (!Array.isArray(dates)) return []

  const datesByValue = new Map()

  dates.forEach(item => {
    const date = typeof item === 'string'
      ? item.slice(0, 10)
      : String(item?.measurement_date || item?.date || '').slice(0, 10)

    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return

    const current = datesByValue.get(date)
    const hasMissingRegions = Boolean(
      current?.has_missing_regions ||
      current?.hasMissingRegions ||
      item?.has_missing_regions ||
      item?.hasMissingRegions,
    )
    const validRegionCount = getNumber(item?.valid_region_count ?? item?.validRegionCount)
    const totalRegionCount = getNumber(item?.total_region_count ?? item?.totalRegionCount)

    datesByValue.set(date, {
      measurement_date: date,
      has_missing_regions: hasMissingRegions,
      valid_region_count: validRegionCount ?? current?.valid_region_count ?? null,
      total_region_count: totalRegionCount ?? current?.total_region_count ?? null,
    })
  })

  return Array.from(datesByValue.values()).sort((left, right) =>
    right.measurement_date.localeCompare(left.measurement_date),
  )
}

function getNumber(value) {
  const number = Number(value)
  return Number.isFinite(number) ? number : null
}

export default Dashboard
