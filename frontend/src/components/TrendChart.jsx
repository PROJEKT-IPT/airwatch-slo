import { useEffect, useState } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

import { getRegionHistory } from '../api/airwatchApi'
import { useLanguage } from '../i18n'

function TrendChart({ regionCode, regionName }) {
  const { t, locale } = useLanguage()
  const [history, setHistory] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [appliedRange, setAppliedRange] = useState({ start: null, end: null })
  const [availableDates, setAvailableDates] = useState([])
  const [dateError, setDateError] = useState('')

  useEffect(() => {
    let isMounted = true

    async function loadHistory() {
      if (!regionCode) {
        setHistory(null)
        setError('')
        setAvailableDates([])
        setStartDate('')
        setEndDate('')
        setAppliedRange(prev =>
          prev.start === null && prev.end === null ? prev : { start: null, end: null },
        )
        setDateError('')
        return
      }

      setIsLoading(true)
      setHistory(null)
      setError('')

      try {
        const data = await getRegionHistory(regionCode, {
          startDate: appliedRange.start || undefined,
          endDate: appliedRange.end || undefined,
        })

        if (!isMounted) return
        setHistory(data)
      } catch (err) {
        if (!isMounted) return
        setHistory(null)
        setError(t('historyLoadError'))
      } finally {
        if (isMounted) setIsLoading(false)
      }
    }

    loadHistory()
    return () => {
      isMounted = false
    }
  }, [regionCode, appliedRange, t])

  useEffect(() => {
    let isMounted = true

    async function loadAvailableDates() {
      if (!regionCode) {
        setAvailableDates([])
        setStartDate('')
        setEndDate('')
        setAppliedRange(prev =>
          prev.start === null && prev.end === null ? prev : { start: null, end: null },
        )
        setDateError('')
        return
      }

      try {
        const full = await getRegionHistory(regionCode)
        if (!isMounted) return
        const dates = (full?.measurements || [])
          .map((measurement) => {
            try {
              return new Date(measurement.measurement_end_time).toISOString().slice(0, 10)
            } catch (error) {
              return null
            }
          })
          .filter(Boolean)
        const unique = Array.from(new Set(dates)).sort((left, right) => left.localeCompare(right))
        setAvailableDates(unique)

        if (unique.length > 0) {
          setStartDate(unique[0])
          setEndDate(unique[unique.length - 1])
        } else {
          setStartDate('')
          setEndDate('')
        }
      } catch (err) {
        setAvailableDates([])
      }
    }

    loadAvailableDates()
    return () => {
      isMounted = false
    }
  }, [regionCode])

  function applyRange() {
    setDateError('')
    const start = startDate ? startDate : null
    const end = endDate ? endDate : null

    if (start && availableDates.length > 0 && !availableDates.includes(start)) {
      setDateError(t('startDateUnavailable'))
      return
    }
    if (end && availableDates.length > 0 && !availableDates.includes(end)) {
      setDateError(t('endDateUnavailable'))
      return
    }

    if (start && end && start > end) {
      setDateError(t('startBeforeEnd'))
      return
    }

    setAppliedRange({
      start: start ? toUtcStartOfDay(start) : null,
      end: end ? toUtcEndOfDay(end) : null,
    })
  }

  function clearRange() {
    if (availableDates.length > 0) {
      setStartDate(availableDates[0])
      setEndDate(availableDates[availableDates.length - 1])
    } else {
      setStartDate('')
      setEndDate('')
    }
    setAppliedRange({ start: null, end: null })
    setDateError('')
  }

  function renderDateSelectors() {
    return (
      <div className="trend-filter-row">
        <label className="trend-filter-item">
          <span>{t('from')}</span>
          {availableDates.length > 0 ? (
            <select value={startDate} onChange={(event) => setStartDate(event.target.value)}>
              <option value="">{t('allDates')}</option>
              {availableDates.map((date) => (
                <option key={date} value={date} disabled={Boolean(endDate && date === endDate)}>
                  {date}
                </option>
              ))}
            </select>
          ) : (
            <select disabled>
              <option>{t('noAvailableDates')}</option>
            </select>
          )}
        </label>

        <label className="trend-filter-item">
          <span>{t('to')}</span>
          {availableDates.length > 0 ? (
            <select value={endDate} onChange={(event) => setEndDate(event.target.value)}>
              <option value="">{t('allDates')}</option>
              {availableDates.map((date) => (
                <option key={date} value={date} disabled={Boolean(startDate && date === startDate)}>
                  {date}
                </option>
              ))}
            </select>
          ) : (
            <select disabled>
              <option>{t('noAvailableDates')}</option>
            </select>
          )}
        </label>

        <div className="trend-filter-actions">
          <button type="button" onClick={applyRange} className="btn btn-primary">
            {t('show')}
          </button>
          <button type="button" onClick={clearRange} className="btn btn-secondary">
            {t('clear')}
          </button>
        </div>
      </div>
    )
  }

  const measurements = Array.isArray(history?.measurements) ? history.measurements : []
  const chartData = measurements
    .map((measurement) => ({
      date: new Date(measurement.measurement_end_time).toLocaleDateString(locale, {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      }),
      value: measurement.value_mean,
      fullDate: measurement.measurement_end_time,
    }))
    .sort((left, right) => new Date(left.fullDate) - new Date(right.fullDate))
  const hasMeasurements = chartData.length > 0

  if (isLoading) {
    return (
      <section className="card trend-chart-card" id="trend-section">
        <p className="section-kicker">{t('historyKicker')}</p>
        <h2>{t('trendTitle')}</h2>
        <div className="state-block">
          <div className="loading-line loading-line-title" />
          <div className="loading-line" />
        </div>
      </section>
    )
  }

  if (error) {
    return (
      <section className="card trend-chart-card" id="trend-section">
        <p className="section-kicker">{t('historyKicker')}</p>
        <h2>{t('trendTitle')}</h2>
        <div className="state-block state-error">
          <h2>{t('loadingErrorTitle')}</h2>
          <p>{error}</p>
        </div>
      </section>
    )
  }

  const displayExponent = getNo2DisplayExponent(chartData)
  const axisLabel = `NO2 (x10^${displayExponent} mol/m2)`
  const yDomain = getZoomedNo2Domain(chartData)
  const availablePointCount = Math.max(availableDates.length, chartData.length)
  const canShowTrend = availablePointCount >= 2
  const singleDateLabel = chartData[0]?.date || availableDates[0] || ''
  const displayedRegion = regionName || history?.region_name || t('selectedRegion')

  return (
    <section className="card trend-chart-card" id="trend-section">
      <p className="section-kicker">{t('historyKicker')}</p>
      <h2>{t('trendTitle')}</h2>
      {canShowTrend ? (
        <>
          {renderDateSelectors()}
          {dateError ? <div className="field-message-error">{dateError}</div> : null}
          <p className="muted-text">{t('trendLead', { region: displayedRegion })}</p>
          {hasMeasurements ? (
            <>
              <div className="trend-chart-container">
                <div className="trend-chart-axis-label" aria-hidden="true">
                  {axisLabel}
                </div>
                <div className="trend-chart-plot">
                  <ResponsiveContainer
                    width="100%"
                    height="100%"
                    initialDimension={{ width: 0, height: 300 }}
                  >
                    <LineChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(47, 58, 85, 0.14)" />
                      <XAxis
                        dataKey="date"
                        stroke="#6e6f73"
                        fontSize={12}
                        tickLine={false}
                        axisLine={{ stroke: 'rgba(47, 58, 85, 0.14)' }}
                      />
                      <YAxis
                        stroke="#6e6f73"
                        fontSize={12}
                        tickLine={false}
                        axisLine={{ stroke: 'rgba(47, 58, 85, 0.14)' }}
                        domain={yDomain}
                        tickFormatter={(value) => formatScaledNo2Tick(value, displayExponent, locale)}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#ffffff',
                          border: '1px solid rgba(47, 58, 85, 0.14)',
                          borderRadius: '8px',
                          color: '#202533',
                        }}
                        cursor={false}
                        formatter={(value) => [formatScaledNo2Value(value, displayExponent, t, locale), 'NO2 (mol/m2)']}
                        labelFormatter={(label) => `${t('date')}: ${label}`}
                      />
                      <Line
                        type="monotone"
                        dataKey="value"
                        stroke="#2f3a55"
                        strokeWidth={2}
                        dot={{ fill: '#2f3a55', strokeWidth: 2, r: 4 }}
                        activeDot={{ r: 6 }}
                        connectNulls={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <p className="map-hint">{t('trendHint')}</p>
            </>
          ) : (
            <div className="state-block">
              <h2>{t('noDataForDateTitle')}</h2>
              <p>{t('noDataForDateText')}</p>
            </div>
          )}
        </>
      ) : (
        <div className="state-block">
          <h2>{availablePointCount === 0 ? t('noHistoryTitle') : t('trendUnavailableTitle')}</h2>
          <p>
            {availablePointCount === 0
              ? t('noHistoryText')
              : t('trendNeedsTwo', { date: singleDateLabel ? ` (${singleDateLabel})` : '' })}
          </p>
        </div>
      )}
    </section>
  )
}

export default TrendChart

function getNo2DisplayExponent(data) {
  const values = data
    .map((point) => Number(point.value))
    .filter((value) => Number.isFinite(value) && value !== 0)

  if (values.length === 0) return -5

  const maxAbsValue = Math.max(...values.map((value) => Math.abs(value)))
  if (maxAbsValue <= 0) return -5

  return Math.floor(Math.log10(maxAbsValue))
}

function getZoomedNo2Domain(data) {
  const values = data
    .map((point) => Number(point.value))
    .filter((value) => Number.isFinite(value))

  if (values.length === 0) return ['auto', 'auto']

  const minValue = Math.min(...values)
  const maxValue = Math.max(...values)

  if (minValue === maxValue) {
    const padding = Math.max(Math.abs(maxValue) * 0.15, 1e-6)
    return [Math.max(0, minValue - padding), maxValue + padding]
  }

  const span = maxValue - minValue
  const padding = Math.max(span * 0.2, Math.abs(maxValue) * 0.1, 1e-6)

  return [Math.max(0, minValue - padding), maxValue + padding]
}

function formatScaledNo2Tick(value, exponent, locale) {
  const numberValue = Number(value)
  if (!Number.isFinite(numberValue)) return ''

  const scaledValue = numberValue / 10 ** exponent
  return scaledValue.toLocaleString(locale, { maximumFractionDigits: 1 })
}

function formatScaledNo2Value(value, exponent, t, locale) {
  if (value === null || value === undefined || value === '') return t('noData')

  const numberValue = Number(value)
  if (!Number.isFinite(numberValue)) return String(value)
  if (numberValue === 0) return '0'

  const scaledValue = numberValue / 10 ** exponent
  return `${scaledValue.toLocaleString(locale, { maximumFractionDigits: 2 })} x 10^${exponent}`
}

function toUtcStartOfDay(dateString) {
  if (!dateString) return dateString
  if (dateString.includes('T')) return dateString
  return `${dateString}T00:00:00Z`
}

function toUtcEndOfDay(dateString) {
  if (!dateString) return dateString
  if (dateString.includes('T')) return dateString
  return `${dateString}T23:59:59.999Z`
}
