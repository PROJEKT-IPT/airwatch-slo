import { useEffect, useState } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { getRegionHistory } from '../api/airwatchApi'

function TrendChart({ regionCode, regionName }) {
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

        if (!isMounted) {
          return
        }

        setHistory(data)
      } catch (err) {
        if (!isMounted) {
          return
        }

        setHistory(null)
        setError(
          'Zgodovine meritev ni bilo mogoče naložiti iz API-ja. Preverite, ali backend deluje in ali so podatki naloženi v bazo.',
        )
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    loadHistory()

    return () => {
      isMounted = false
    }
  }, [regionCode, appliedRange])

  // Fetch full history (no date filter) to derive available dates for selectors
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
          .map((m) => {
            try {
              return new Date(m.measurement_end_time).toISOString().slice(0, 10)
            } catch (e) {
              return null
            }
          })
          .filter(Boolean)
        // unique and sorted ascending
        const unique = Array.from(new Set(dates)).sort()
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
    const s = startDate ? startDate : null
    const e = endDate ? endDate : null

    // Validate selections are in availableDates if provided
    if (s && availableDates.length > 0 && !availableDates.includes(s)) {
      setDateError('Izbran začetni datum nima razpoložljivih podatkov.')
      return
    }
    if (e && availableDates.length > 0 && !availableDates.includes(e)) {
      setDateError('Izbran končni datum nima razpoložljivih podatkov.')
      return
    }

    // Ensure start <= end when both present
    if (s && e && s > e) {
      setDateError('Začetni datum mora biti pred ali enak končnemu datumu.')
      return
    }

    const normalizedStart = s ? toUtcStartOfDay(s) : null
    const normalizedEnd = e ? toUtcEndOfDay(e) : null
    setAppliedRange({ start: normalizedStart, end: normalizedEnd })
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
          <span>Od</span>
          {availableDates.length > 0 ? (
            <select value={startDate} onChange={(e) => setStartDate(e.target.value)}>
              <option value="">Vsi datumi</option>
              {availableDates.map((d) => (
                <option key={d} value={d} disabled={Boolean(endDate && d === endDate)}>
                  {d}
                </option>
              ))}
            </select>
          ) : (
            <select disabled>
              <option>Ni razpoložljivih datumov</option>
            </select>
          )}
        </label>

        <label className="trend-filter-item">
          <span>Do</span>
          {availableDates.length > 0 ? (
            <select value={endDate} onChange={(e) => setEndDate(e.target.value)}>
              <option value="">Vsi datumi</option>
              {availableDates.map((d) => (
                <option key={d} value={d} disabled={Boolean(startDate && d === startDate)}>
                  {d}
                </option>
              ))}
            </select>
          ) : (
            <select disabled>
              <option>Ni razpoložljivih datumov</option>
            </select>
          )}
        </label>

        <div className="trend-filter-actions">
          <button type="button" onClick={applyRange} className="btn btn-primary">
            Prikaži
          </button>
          <button type="button" onClick={clearRange} className="btn btn-secondary">
            Počisti
          </button>
        </div>
      </div>
    )
  }

  const measurements = Array.isArray(history?.measurements) ? history.measurements : []
  const chartData = measurements
    .map((m) => ({
      date: new Date(m.measurement_end_time).toLocaleDateString('sl-SI', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      }),
      value: m.value_mean,
      fullDate: m.measurement_end_time,
    }))
    .sort((a, b) => new Date(a.fullDate) - new Date(b.fullDate))
  const hasMeasurements = chartData.length > 0

  if (isLoading) {
    return (
      <section className="card trend-chart-card">
        <p className="section-kicker">Zgodovina meritev</p>
        <h2>Zgodovinski trend NO₂</h2>
        <div className="state-block">
          <div className="loading-line loading-line-title" />
          <div className="loading-line" />
        </div>
      </section>
    )
  }

  if (error) {
    return (
      <section className="card trend-chart-card">
        <p className="section-kicker">Zgodovina meritev</p>
        <h2>Zgodovinski trend NO₂</h2>
        <div className="state-block state-error">
          <h2>Napaka pri nalaganju</h2>
          <p>{error}</p>
        </div>
      </section>
    )
  }

  const displayExponent = getNo2DisplayExponent(chartData)
  const axisLabel = `NO₂\u00A0(×10${toSuperscript(displayExponent)} mol/m²)`
  const yDomain = getZoomedNo2Domain(chartData)

  return (
    <section className="card trend-chart-card">
      <p className="section-kicker">Zgodovina meritev</p>
      <h2>Zgodovinski trend NO₂</h2>
      {renderDateSelectors()}
      {dateError ? <div className="field-message-error">{dateError}</div> : null}
      <p className="muted-text">
        Prikaz zgodovinskih vrednosti NO₂ za regijo {regionName || history?.region_name}. Podatki
        temeljijo na obdelanih Sentinel-5P produktih.
      </p>
      {hasMeasurements ? (
        <>
          <div className="trend-chart-container">
            <div className="trend-chart-axis-label" aria-hidden="true">
              {axisLabel}
            </div>
            <div className="trend-chart-plot">
              <ResponsiveContainer width="100%" height={300}>
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
                    tickFormatter={(value) => formatScaledNo2Tick(value, displayExponent)}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#ffffff',
                      border: '1px solid rgba(47, 58, 85, 0.14)',
                      borderRadius: '8px',
                      color: '#202533',
                    }}
                    cursor={false}
                    formatter={(value) => [formatScaledNo2Value(value, displayExponent), 'NO₂\u00A0(mol/m²)']}
                    labelFormatter={(label) => `Datum: ${label}`}
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
          <p className="map-hint">
            Graf prikazuje povprečne vrednosti NO₂ po času. Manjkajoče vrednosti pomenijo, da za
            določen časovni interval ni bilo veljavnih pikslov.
          </p>
        </>
      ) : (
        <div className="state-block">
          <h2>Ni podatkov za izbrani datum</h2>
          <p>
            Za izbrani datumski interval ni zgodovinskih meritev NO₂. Izberite drug interval ali
            počistite izbor, da se vrnete na razpoložljive podatke.
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

  if (values.length === 0) {
    return -5
  }

  const maxAbsValue = Math.max(...values.map((value) => Math.abs(value)))

  if (maxAbsValue <= 0) {
    return -5
  }

  return Math.floor(Math.log10(maxAbsValue))
}

function getZoomedNo2Domain(data) {
  const values = data
    .map((point) => Number(point.value))
    .filter((value) => Number.isFinite(value))

  if (values.length === 0) {
    return ['auto', 'auto']
  }

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

function formatScaledNo2Tick(value, exponent) {
  const numberValue = Number(value)

  if (!Number.isFinite(numberValue)) {
    return ''
  }

  const scaledValue = numberValue / 10 ** exponent

  return scaledValue.toLocaleString('sl-SI', {
    maximumFractionDigits: 1,
  })
}

function formatScaledNo2Value(value, exponent) {
  if (value === null || value === undefined || value === '') {
    return 'Ni podatka'
  }

  const numberValue = Number(value)

  if (!Number.isFinite(numberValue)) {
    return String(value)
  }

  if (numberValue === 0) {
    return '0'
  }

  const scaledValue = numberValue / 10 ** exponent

  return `${scaledValue.toLocaleString('sl-SI', {
    maximumFractionDigits: 2,
  })} × 10${toSuperscript(exponent)}`
}

function toSuperscript(value) {
  const map = {
    '-': '⁻',
    0: '⁰',
    1: '¹',
    2: '²',
    3: '³',
    4: '⁴',
    5: '⁵',
    6: '⁶',
    7: '⁷',
    8: '⁸',
    9: '⁹',
  }

  return String(value)
    .split('')
    .map((character) => map[character] || character)
    .join('')
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
