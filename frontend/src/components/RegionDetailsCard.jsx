function RegionDetailsCard({
  measurement,
  selectedRegion,
  isLoading,
  error,
  hasRegion,
  csvExportUrl,
}) {
  const regionName = measurement?.region_name || selectedRegion?.region_name || 'Izbrana regija'
  const regionCode = measurement?.region_code || selectedRegion?.region_code || ''
  const qualityStatus = getQualityStatus(measurement?.quality_status)
  const missingDataState = measurement ? getMissingDataState(measurement) : null
  const isExportDisabled = !measurement || isLoading || Boolean(error) || !csvExportUrl

  return (
    <section className="card detail-card" id="details-section">
      <div className="card-heading">
        <div>
          <p className="section-kicker">Podatki in izvor regije</p>
          <h2>{hasRegion ? regionName : 'Regija ni izbrana'}</h2>
          {regionCode ? <p className="muted-text region-code-line">Koda regije: {regionCode}</p> : null}
        </div>
        <div className="detail-card-actions">
          {measurement ? (
            <span className={`quality-badge ${qualityStatus.className}`}>
              {qualityStatus.label}
            </span>
          ) : null}
          {/*
            The download is driven by the backend's
            `Content-Disposition: attachment` header. We intentionally omit the
            native `download` attribute: the export is cross-origin (frontend
            domain != backend domain), so browsers ignore it anyway.
          */}
          <a
            className={`export-button${isExportDisabled ? ' export-button-disabled' : ''}`}
            href={isExportDisabled ? undefined : csvExportUrl}
            aria-disabled={isExportDisabled}
            onClick={event => {
              if (isExportDisabled) {
                event.preventDefault()
              }
            }}
          >
            Izvozi CSV
          </a>
        </div>
      </div>

      {!hasRegion ? (
        <p className="muted-text">Izberite statistično regijo za prikaz zadnje meritve NO₂.</p>
      ) : isLoading ? (
        <div className="details-loading" role="status" aria-live="polite">
          <div className="loading-line loading-line-title" />
          <div className="loading-line" />
          <div className="loading-line" />
          <p className="muted-text">Nalaganje podatkov za izbrano regijo ...</p>
        </div>
      ) : error ? (
        <div className="details-error" role="alert">
          <h3>Podatkov ni mogoče naložiti</h3>
          <p className="error-text">{error}</p>
        </div>
      ) : !measurement ? (
        <div className="details-empty" role="status" aria-live="polite">
          <h3>Ni podatkov za izbrano regijo</h3>
          <p className="muted-text">
            Za izbrano regijo trenutno ni shranjene zadnje meritve NO₂.
          </p>
        </div>
      ) : missingDataState ? (
        <div className="details-empty" role="status" aria-live="polite">
          <h3>{missingDataState.title}</h3>
          <p className="muted-text">{missingDataState.text}</p>
          <dl className="details-list">
            <DetailRow label="Veljavnih pikslov" value={formatInteger(measurement.pixel_count_valid)} />
            <DetailRow label="QA prag" value={formatNumber(measurement.qa_threshold)} />
            <DetailRow label="Status kakovosti" value={formatQualityStatus(measurement.quality_status)} />
            <DetailRow label="Začetek meritve" value={formatDateTime(measurement.measurement_start_time)} />
            <DetailRow label="Konec meritve" value={formatDateTime(measurement.measurement_end_time)} />
            <DetailRow label="ID obdelave" value={formatInteger(measurement.processing_run_id)} />
            <DetailRow label="Izvor podatkov" value="Sentinel-5P / Copernicus" />
            <DetailRow
              label="Vir produkta"
              value={measurement.source_product_name || 'Ni podatka'}
            />
            <DetailRow label="ID produkta" value={measurement.source_product_id || 'Ni podatka'} />
          </dl>
          <p className="provenance-note">{getProvenanceNote(measurement)}</p>
        </div>
      ) : (
        <>
          <dl className="details-list">
            <DetailRow label="Zadnja NO₂ vrednost" value={formatNo2Value(measurement.value_mean)} />
            <DetailRow
              label="Min / max NO₂"
              value={`${formatNo2Value(measurement.value_min)} / ${formatNo2Value(measurement.value_max)}`}
            />
            <DetailRow label="Enota" value={measurement.unit || 'Ni podatka'} />
            <DetailRow label="Veljavnih pikslov" value={formatInteger(measurement.pixel_count_valid)} />
            <DetailRow label="QA prag" value={formatNumber(measurement.qa_threshold)} />
            <DetailRow label="Status kakovosti" value={formatQualityStatus(measurement.quality_status)} />
            <DetailRow label="Začetek meritve" value={formatDateTime(measurement.measurement_start_time)} />
            <DetailRow label="Konec meritve" value={formatDateTime(measurement.measurement_end_time)} />
            <DetailRow label="ID obdelave" value={formatInteger(measurement.processing_run_id)} />
            <DetailRow label="Izvor podatkov" value="Sentinel-5P / Copernicus" />
            <DetailRow
              label="Vir produkta"
              value={measurement.source_product_name || 'Ni podatka'}
            />
            <DetailRow label="ID produkta" value={measurement.source_product_id || 'Ni podatka'} />
          </dl>
          <p className="provenance-note">{getProvenanceNote(measurement)}</p>
        </>
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
  return 'Neznano'
}

function getQualityStatus(status) {
  if (status === 'valid') {
    return { label: 'Veljavno', className: 'quality-valid' }
  }
  if (status === 'no_valid_pixels') {
    return { label: 'Ni podatkov', className: 'quality-empty' }
  }
  if (status === 'processing_error') {
    return { label: 'Napaka obdelave', className: 'quality-error' }
  }
  return { label: 'Neznano', className: 'quality-empty' }
}

function getProvenanceNote(measurement) {
  if (measurement.quality_status === 'no_valid_pixels') {
    return 'Sentinel-5P produkt je bil obdelan, vendar regionalna NO₂ vrednost ni bila izračunana, ker ni bilo dovolj veljavnih pikslov po kakovostnem filtru. Zgornji podatki ohranjajo sledljivost do izvornega produkta in zapisa obdelave.'
  }

  if (measurement.quality_status === 'processing_error') {
    return 'Obdelava izbrane meritve ni bila uspešna, zato zanesljiva regionalna NO₂ vrednost ni bila zapisana. Zgornji podatki ohranjajo sledljivost do izvornega produkta in zapisa obdelave.'
  }

  return 'Podatek je sledljiv do izvornega Sentinel-5P produkta; čas meritve se nanaša na satelitski prelet, ID obdelave pa na interni processing run zapis.'
}

function getMissingDataState(measurement) {
  if (measurement.quality_status === 'no_valid_pixels') {
    return {
      title: 'Ni veljavnih podatkov za izbrano regijo',
      text:
        'Za izbrani Sentinel-5P produkt v tej regiji ni bilo dovolj veljavnih NO₂ pikslov po kakovostnem filtru. Vrednosti zato ne prikazujemo kot regionalno meritev.',
    }
  }

  if (measurement.quality_status === 'processing_error') {
    return {
      title: 'Napaka pri obdelavi meritve',
      text:
        'Podatkovni tok je za to meritev vrnil napako, zato rezultat ni primeren za prikaz kot zanesljiva vrednost. Vrednosti zato niso prikazane.',
    }
  }

  if (
    measurement.pixel_count_valid === 0 ||
    measurement.value_mean === null ||
    measurement.value_mean === undefined
  ) {
    return {
      title: 'NO₂ vrednost ni na voljo',
      text:
        'Za izbrano regijo ni dovolj veljavnih podatkov za izračun zadnje regionalne vrednosti.',
    }
  }

  return null
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

export default RegionDetailsCard
