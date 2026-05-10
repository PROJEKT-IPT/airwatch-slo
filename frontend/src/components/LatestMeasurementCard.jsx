function LatestMeasurementCard({ measurement, isLoading, error }) {
  if (isLoading) {
    return <p style={styles.status}>Loading latest NO2 measurement...</p>
  }

  if (error) {
    return <p style={styles.error}>{error}</p>
  }

  if (!measurement) {
    return <p style={styles.status}>No data available for the selected region.</p>
  }

  const sourceProductName = measurement.source_product_name || measurement.product_name || 'Not available'
  const dataSourceName = measurement.data_source_name || 'Not available'

  return (
    <article style={styles.card}>
      <div style={styles.header}>
        <div>
          <h2 style={styles.region}>{measurement.region_name}</h2>
          <p style={styles.indicator}>{measurement.indicator_code}</p>
        </div>
        <span style={styles.badge}>{measurement.quality_status}</span>
      </div>

      <div style={styles.meanBlock}>
        <span style={styles.meanValue}>{formatNumber(measurement.value_mean)}</span>
        <span style={styles.unit}>{measurement.unit}</span>
      </div>

      <dl style={styles.grid}>
        <MeasurementItem label="Min" value={formatNumber(measurement.value_min)} />
        <MeasurementItem label="Max" value={formatNumber(measurement.value_max)} />
        <MeasurementItem label="Valid pixels" value={measurement.pixel_count_valid} />
        <MeasurementItem label="QA threshold" value={formatNumber(measurement.qa_threshold)} />
        <MeasurementItem label="Start time" value={formatDateTime(measurement.measurement_start_time)} />
        <MeasurementItem label="End time" value={formatDateTime(measurement.measurement_end_time)} />
      </dl>

      <div style={styles.meta}>
        <p style={styles.metaLine}>Source product: {sourceProductName}</p>
        <p style={styles.metaLine}>Data source: {dataSourceName}</p>
      </div>
    </article>
  )
}

function MeasurementItem({ label, value }) {
  return (
    <div style={styles.item}>
      <dt style={styles.itemLabel}>{label}</dt>
      <dd style={styles.itemValue}>{value ?? 'Not available'}</dd>
    </div>
  )
}

function formatNumber(value) {
  if (value === null || value === undefined || value === '') {
    return 'Not available'
  }

  const numberValue = Number(value)

  if (Number.isNaN(numberValue)) {
    return value
  }

  return numberValue.toLocaleString(undefined, {
    maximumSignificantDigits: 6,
  })
}

function formatDateTime(value) {
  if (!value) {
    return 'Not available'
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return value
  }

  return date.toLocaleString()
}

const styles = {
  card: {
    marginTop: '1.5rem',
    padding: '1.25rem',
    border: '1px solid #d6dee6',
    borderRadius: '8px',
    background: '#ffffff',
    textAlign: 'left',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: '1rem',
    alignItems: 'flex-start',
  },
  region: {
    margin: 0,
    fontSize: '1.2rem',
  },
  indicator: {
    margin: '0.25rem 0 0',
    color: '#53616f',
  },
  badge: {
    padding: '0.25rem 0.5rem',
    borderRadius: '6px',
    background: '#e7f5ec',
    color: '#176b3a',
    fontSize: '0.85rem',
    fontWeight: 600,
    textTransform: 'capitalize',
  },
  meanBlock: {
    margin: '1.25rem 0',
    display: 'flex',
    alignItems: 'baseline',
    gap: '0.5rem',
  },
  meanValue: {
    fontSize: '2rem',
    fontWeight: 700,
  },
  unit: {
    color: '#53616f',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(12rem, 1fr))',
    gap: '0.75rem',
    margin: 0,
  },
  item: {
    padding: '0.75rem',
    borderRadius: '6px',
    background: '#f4f7f9',
  },
  itemLabel: {
    color: '#53616f',
    fontSize: '0.85rem',
  },
  itemValue: {
    margin: '0.25rem 0 0',
    fontWeight: 600,
    overflowWrap: 'anywhere',
  },
  meta: {
    marginTop: '1rem',
    color: '#53616f',
    fontSize: '0.9rem',
  },
  metaLine: {
    margin: '0.25rem 0',
    overflowWrap: 'anywhere',
  },
  status: {
    marginTop: '1.5rem',
    color: '#53616f',
  },
  error: {
    marginTop: '1.5rem',
    color: '#b42318',
  },
}

export default LatestMeasurementCard
