function LatestMeasurementCard({
  measurement,
  selectedRegion,
  isLoading,
  error,
  hasRegion,
  isTestRegion,
}) {
  if (!hasRegion) {
    return (
      <article className="card metric-card">
        <EmptyState title="Ni izbrane regije" text="Izberite regijo za prikaz zadnje meritve." />
      </article>
    )
  }

  if (isLoading) {
    return (
      <article className="card metric-card">
        <LoadingState title="Nalagam zadnjo meritev NO₂" />
      </article>
    )
  }

  if (error) {
    return (
      <article className="card metric-card">
        <ErrorState title="Napaka pri nalaganju meritve" text={error} />
      </article>
    )
  }

  if (!measurement) {
    return (
      <article className="card metric-card">
        <EmptyState
          title="Za izbrano regijo ni podatkov"
          text="API za to regijo trenutno ne vrača zadnje meritve."
        />
      </article>
    )
  }

  const status = getQualityStatus(measurement.quality_status)

  return (
    <article className="card metric-card">
      <div className="card-heading">
        <div>
          <p className="section-kicker">Zadnja meritev</p>
          <div className="title-with-badge">
            <h2>{measurement.region_name || selectedRegion?.region_name || 'Izbrana regija'}</h2>
            {isTestRegion ? <span className="test-region-badge">testno območje</span> : null}
          </div>
        </div>
        <span className={`quality-badge ${status.className}`}>{status.label}</span>
      </div>

      <div className="metric-value-block">
        <span className="metric-value">{formatNo2Value(measurement.value_mean)}</span>
        <span className="metric-unit">{measurement.unit || 'mol/m²'}</span>
      </div>

      <div className="metric-meta-grid">
        <InfoTile label="Indikator" value={formatIndicatorCode(measurement.indicator_code)} />
        <InfoTile label="Meritev" value={formatDateTime(measurement.measurement_end_time)} />
        <InfoTile label="Vir" value={measurement.data_source_name || 'Ni podatka'} />
        <InfoTile label="Veljavnih pikslov" value={formatInteger(measurement.pixel_count_valid)} />
        <InfoTile label="QA prag" value={formatNumber(measurement.qa_threshold)} />
        <InfoTile
          label="Produkt"
          value={formatProductLabel(measurement.source_product_name)}
          detail={measurement.source_product_name}
          wide
        />
      </div>
    </article>
  )
}

function InfoTile({ label, value, detail = '', wide = false }) {
  return (
    <div className={`info-tile ${wide ? 'info-tile-wide' : ''}`} title={detail || ''}>
      <span>{label}</span>
      <strong>{value ?? 'Ni podatka'}</strong>
      {detail ? <em>{detail}</em> : null}
    </div>
  )
}

function LoadingState({ title }) {
  return (
    <div className="state-block">
      <div className="loading-line loading-line-title" />
      <div className="loading-line" />
      <p>{title}</p>
    </div>
  )
}

function EmptyState({ title, text }) {
  return (
    <div className="state-block">
      <h2>{title}</h2>
      <p>{text}</p>
    </div>
  )
}

function ErrorState({ title, text }) {
  return (
    <div className="state-block state-error">
      <h2>{title}</h2>
      <p>{text}</p>
    </div>
  )
}

function getQualityStatus(status) {
  if (status === 'valid') {
    return { label: 'Veljavno', className: 'quality-valid' }
  }

  if (status === 'no_valid_pixels') {
    return { label: 'Ni podatkov', className: 'quality-empty' }
  }

  if (status === 'processing_error') {
    return { label: 'Napaka', className: 'quality-error' }
  }

  return { label: status || 'Neznano', className: 'quality-empty' }
}

function formatIndicatorCode(value) {
  if (!value) {
    return 'NO₂'
  }

  return String(value).replace(/NO2/g, 'NO₂')
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

function formatNo2Value(value) {
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

  const exponent = Math.floor(Math.log10(Math.abs(numberValue)))
  const mantissa = numberValue / 10 ** exponent
  return `${mantissa.toFixed(2)} × 10${toSuperscript(exponent)}`
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
    .map(character => map[character] || character)
    .join('')
}

function formatNumber(value) {
  if (value === null || value === undefined || value === '') {
    return 'Ni podatka'
  }

  const numberValue = Number(value)

  if (!Number.isFinite(numberValue)) {
    return String(value)
  }

  return numberValue.toLocaleString('sl-SI', {
    maximumSignificantDigits: 6,
  })
}

function formatInteger(value) {
  if (value === null || value === undefined || value === '') {
    return 'Ni podatka'
  }

  const numberValue = Number(value)

  if (!Number.isFinite(numberValue)) {
    return String(value)
  }

  return numberValue.toLocaleString('sl-SI', {
    maximumFractionDigits: 0,
  })
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

export default LatestMeasurementCard
