function DataProvenanceCard({ measurement, selectedRegion, isLoading, error, hasRegion }) {
  if (!hasRegion) {
    return null
  }

  const regionName =
    measurement?.region_name || selectedRegion?.region_name || 'Izbrana regija'

  if (isLoading) {
    return (
      <section className="card provenance-card">
        <Heading regionName={regionName} />
        <div className="provenance-state" role="status" aria-live="polite">
          <div className="loading-line loading-line-title" />
          <div className="loading-line" />
          <p className="muted-text">Nalaganje izvora in sledljivosti podatka ...</p>
        </div>
      </section>
    )
  }

  if (error) {
    return (
      <section className="card provenance-card">
        <Heading regionName={regionName} />
        <div className="provenance-state state-error" role="alert">
          <p className="error-text">{error}</p>
        </div>
      </section>
    )
  }

  return (
    <section className="card provenance-card">
      <Heading regionName={regionName} />
      <dl className="provenance-grid">
        <ProvenanceRow label="Izvor podatkov" value="Sentinel-5P / Copernicus" />
        <ProvenanceRow
          label="Izvorni produkt"
          value={formatProductLabel(measurement?.source_product_name)}
          detail={measurement?.source_product_name}
        />
        <ProvenanceRow
          label="ID produkta"
          value={measurement?.source_product_id || 'Ni podatka'}
        />
        <ProvenanceRow
          label="ID obdelave"
          value={formatInteger(measurement?.processing_run_id)}
        />
        <ProvenanceRow
          label="Čas začetka meritve"
          value={formatDateTime(measurement?.measurement_start_time)}
        />
        <ProvenanceRow
          label="Čas konca meritve"
          value={formatDateTime(measurement?.measurement_end_time)}
        />
        <ProvenanceRow label="QA prag" value={formatNumber(measurement?.qa_threshold)} />
        <ProvenanceRow
          label="Status kakovosti"
          value={formatQualityStatus(measurement?.quality_status)}
        />
        <ProvenanceRow
          label="Število veljavnih pikslov"
          value={formatInteger(measurement?.pixel_count_valid)}
        />
      </dl>
      <p className="provenance-note">{getProvenanceNote(measurement)}</p>
    </section>
  )
}

function Heading({ regionName }) {
  return (
    <div className="card-heading">
      <div>
        <p className="section-kicker">Izvor in sledljivost podatka</p>
        <h2>{regionName}</h2>
      </div>
    </div>
  )
}

function ProvenanceRow({ label, value, detail }) {
  return (
    <div className="provenance-row">
      <dt>{label}</dt>
      <dd>{value ?? 'Ni podatka'}</dd>
      {detail ? <span className="row-detail">{detail}</span> : null}
    </div>
  )
}

function getProvenanceNote(measurement) {
  if (!measurement) {
    return (
      'Za izbrano regijo trenutno ni shranjene meritve. Ko bo na voljo, bo prikazan tudi izvorni Sentinel-5P produkt in zapis obdelave.'
    )
  }

  if (measurement.quality_status === 'no_valid_pixels') {
    return (
      'Sentinel-5P produkt je bil obdelan, vendar regionalna NO₂ vrednost ni bila izračunana, ker ni bilo dovolj veljavnih pikslov po kakovostnem filtru. Spodnji podatki ohranjajo sledljivost do izvornega produkta in zapisa obdelave.'
    )
  }

  if (measurement.quality_status === 'processing_error') {
    return (
      'Obdelava izbrane meritve ni bila uspešna, zato zanesljiva regionalna NO₂ vrednost ni bila zapisana. Spodnji podatki ohranjajo sledljivost do izvornega Sentinel-5P produkta in zapisa obdelave.'
    )
  }

  return (
    'Podatek je sledljiv do izvornega Sentinel-5P produkta. Čas meritve se nanaša na satelitski prelet oziroma časovno okno produkta. ID obdelave omogoča povezavo z internim processing run zapisom.'
  )
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

  if (!status) {
    return 'Ni podatka'
  }

  return 'Neznano'
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

export default DataProvenanceCard
