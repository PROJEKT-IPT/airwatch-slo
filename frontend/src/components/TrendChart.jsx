import { useEffect, useState } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { getRegionHistory } from '../api/airwatchApi'

function TrendChart({ regionCode, regionName }) {
  const [history, setHistory] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let isMounted = true

    async function loadHistory() {
      if (!regionCode) {
        setHistory(null)
        setError('')
        return
      }

      setIsLoading(true)
      setHistory(null)
      setError('')

      try {
        const data = await getRegionHistory(regionCode)

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
  }, [regionCode])

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

  if (!history || !history.measurements || history.measurements.length === 0) {
    return (
      <section className="card trend-chart-card">
        <p className="section-kicker">Zgodovina meritev</p>
        <h2>Zgodovinski trend NO₂</h2>
        <div className="state-block">
          <h2>Ni podatkov</h2>
          <p>Za izbrano regijo ni zgodovinskih meritev NO₂.</p>
        </div>
      </section>
    )
  }

  const measurements = history.measurements

  if (measurements.length === 1) {
    const singleMeasurement = measurements[0]
    const date = new Date(singleMeasurement.measurement_end_time)
    const formattedDate = new Intl.DateTimeFormat('sl-SI', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(date)

    return (
      <section className="card trend-chart-card">
        <p className="section-kicker">Zgodovina meritev</p>
        <h2>Zgodovinski trend NO₂</h2>
        <div className="state-block">
          <h2>Zaenkrat samo ena meritev</h2>
          <p>
            Za regijo <strong>{regionName || history.region_name}</strong> obstaja samo ena
            veljavna meritev NO₂. Za prikaz trenda potrebujemo več zgodovinskih meritev.
          </p>
          <div className="info-tile">
            <span>Edina meritev</span>
            <strong>
              {singleMeasurement.value_mean !== null ? singleMeasurement.value_mean.toFixed(2) : 'Ni podatka'}{' '}
              {singleMeasurement.unit}
            </strong>
            <em>{formattedDate}</em>
          </div>
        </div>
      </section>
    )
  }

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

  const displayExponent = getNo2DisplayExponent(chartData)
  const axisLabel = `NO₂\u00A0(×10${toSuperscript(displayExponent)} mol/m²)`
  const yDomain = getZoomedNo2Domain(chartData)

  return (
    <section className="card trend-chart-card">
      <p className="section-kicker">Zgodovina meritev</p>
      <h2>Zgodovinski trend NO₂</h2>
      <p className="muted-text">
        Prikaz zgodovinskih vrednosti NO₂ za regijo {regionName || history.region_name}. Podatki
        temeljijo na obdelanih Sentinel-5P produktih.
      </p>
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
