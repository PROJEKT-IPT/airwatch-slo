function RegionDetailsCard({ measurement, selectedRegion, isLoading, error, hasRegion }) {
  const regionName = measurement?.region_name || selectedRegion?.region_name || 'Izbrana regija'
  const qualityStatus = getQualityStatus(measurement?.quality_status)

  return (
    <section className="card detail-card">
      <div className="card-heading">
        <div>
          <p className="section-kicker">Izbrana regija</p>
          <h2>{hasRegion ? regionName : 'Regija ni izbrana'}</h2>
        </div>
        {measurement ? (
          <span className={`quality-badge ${qualityStatus.className}`}>
            {qualityStatus.label}
          </span>
        ) : null}
      </div>

      {!hasRegion ? (
        <p className="muted-text">Izberite regijo za prikaz zadnje meritve NO₂.</p>
      ) : isLoading ? (
        <div className="details-loading" role="status" aria-live="polite">
          <div className="loading-line loading-line-title" />
          <div className="loading-line" />
          <div className="loading-line" />
          <p className="muted-text">Nalagam podatke za izbrano regijo ...</p>
        </div>
      ) : error ? (
        <div className="details-error" role="alert">
          <h3>Podatkov ni mogoče naložiti</h3>
          <p className="error-text">{error}</p>
        </div>
      ) : !measurement ? (
        <p className="muted-text">Za izbrano regijo ni zadnje meritve.</p>
      ) : (
        <dl className="details-list">
          <DetailRow label="Zadnja NO₂ vrednost" value={formatNo2Value(measurement.value_mean)} />
          <DetailRow
            label="Min / max NO₂"
            value={`${formatNo2Value(measurement.value_min)} / ${formatNo2Value(measurement.value_max)}`}
          />
          <DetailRow label="Enota" value={measurement.unit || 'Ni podatka'} />
          <DetailRow label="Veljavnih pikslov" value={formatInteger(measurement.pixel_count_valid)} />
          <DetailRow label="Status kakovosti" value={formatQualityStatus(measurement.quality_status)} />
          <DetailRow label="Čas meritve" value={formatDateTime(measurement.measurement_end_time)} />
        </dl>
      )}
    </section>
  )
}

function DetailRow({ label, value }) {
  return (
    <div className="detail-row">
      <dt>{label}</dt>
      <dd>{value ?? 'Ni podatka'}</dd>
    </div>
  )
}

function formatQualityStatus(status) {
  if (status === 'valid') {
    return 'Veljavno'
  }
  if (status === 'no_valid_pixels') {
    return 'Ni veljavnih pikslov'
  }
  if (status === 'processing_error') {
    return 'Napaka obdelave'
  }
  return status || 'Ni podatka'
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

function formatNo2Value(value) {
  if (value === null || value === undefined || value === '') {
    return 'Ni podatka'
  }

  const numberValue = Number(value)

  if (!Number.isFinite(numberValue)) {
    return String(value)
  }

  return numberValue.toExponential(3).replace('e', ' × 10^')
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

export default RegionDetailsCard
