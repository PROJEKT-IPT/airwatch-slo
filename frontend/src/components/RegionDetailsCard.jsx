function RegionDetailsCard({ measurement, isLoading, error, hasRegion }) {
  return (
    <section className="card detail-card">
      <div className="card-heading">
        <div>
          <p className="section-kicker">Podrobnosti regije</p>
          <h2>Merilni razpon</h2>
        </div>
      </div>

      {!hasRegion ? (
        <p className="muted-text">Izberite regijo za prikaz podrobnosti.</p>
      ) : isLoading ? (
        <p className="muted-text">Nalagam podrobnosti ...</p>
      ) : error ? (
        <p className="error-text">{error}</p>
      ) : !measurement ? (
        <p className="muted-text">Za izbrano regijo ni zadnje meritve.</p>
      ) : (
        <dl className="details-list">
          <DetailRow label="Najnižja vrednost NO₂" value={formatNo2Value(measurement.value_min)} />
          <DetailRow label="Najvišja vrednost NO₂" value={formatNo2Value(measurement.value_max)} />
          <DetailRow label="Veljavnih pikslov" value={formatInteger(measurement.pixel_count_valid)} />
          <DetailRow label="QA prag" value={formatNumber(measurement.qa_threshold)} />
          <DetailRow label="Status kakovosti" value={formatQualityStatus(measurement.quality_status)} />
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

export default RegionDetailsCard
