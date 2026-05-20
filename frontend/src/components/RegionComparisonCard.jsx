function RegionComparisonCard({
  regions,
  selectedRegionCode,
  onRegionSelect,
  isLoading,
  error,
}) {
  const rows = buildComparisonRows(regions)
  const validRows = rows.filter(row => row.hasValue)
  const maxValue = validRows.reduce(
    (largest, row) => Math.max(largest, row.valueMean),
    0,
  )

  return (
    <section className="card comparison-card" aria-labelledby="region-comparison-title">
      <div className="card-heading">
        <div>
          <p className="section-kicker">Primerjava regij</p>
          <h2 id="region-comparison-title">NO2 po statističnih regijah</h2>
        </div>
        <span className="comparison-count">{formatCount(validRows.length, rows.length)}</span>
      </div>

      {isLoading ? (
        <ComparisonLoadingState />
      ) : error ? (
        <div className="comparison-state state-error" role="alert">
          <p>{error}</p>
        </div>
      ) : rows.length === 0 ? (
        <div className="comparison-state">
          <p>
            Regijski podatki trenutno niso na voljo. Primerjava bo prikazana,
            ko bodo meritve naložene iz API-ja.
          </p>
        </div>
      ) : (
        <>
          <div className="comparison-summary" aria-label="Povzetek primerjave regij">
            <SummaryTile label="Najvišja vrednost" value={formatRegionValue(validRows[0])} />
            <SummaryTile
              label="Najnižja vrednost"
              value={formatRegionValue(validRows[validRows.length - 1])}
            />
            <SummaryTile label="Brez veljavnih pikslov" value={formatNoDataCount(rows)} />
          </div>

          <div className="comparison-list" role="list" aria-label="Primerjava zadnjih meritev">
            {rows.map((row, index) => (
              <ComparisonRow
                key={row.regionCode}
                row={row}
                rank={row.hasValue ? index + 1 : null}
                maxValue={maxValue}
                isSelected={row.regionCode === selectedRegionCode}
                onRegionSelect={onRegionSelect}
              />
            ))}
          </div>
        </>
      )}
    </section>
  )
}

function ComparisonRow({ row, rank, maxValue, isSelected, onRegionSelect }) {
  const barWidth = row.hasValue && maxValue > 0 ? `${Math.max((row.valueMean / maxValue) * 100, 4)}%` : '0%'
  const buttonLabel = `Izberi regijo ${row.regionName}`

  return (
    <button
      className={`comparison-row ${isSelected ? 'comparison-row-selected' : ''}`}
      type="button"
      onClick={() => onRegionSelect(row.regionCode)}
      aria-label={buttonLabel}
      aria-current={isSelected ? 'true' : undefined}
    >
      <span className="comparison-rank">{rank ? `#${rank}` : '-'}</span>
      <span className="comparison-region">
        <strong>{row.regionName}</strong>
        <em>{row.regionCode}</em>
      </span>
      <span className="comparison-bar-track" aria-hidden="true">
        <span className={row.hasValue ? 'comparison-bar' : 'comparison-bar-empty'} style={{ width: barWidth }} />
      </span>
      <span className="comparison-value">
        {row.hasValue ? (
          <>
            <strong>{formatNo2Value(row.valueMean)}</strong>
            <em>{row.unit || 'mol/m²'}</em>
          </>
        ) : (
          <>
            <strong>Ni podatka</strong>
            <em>{formatQualityStatus(row.qualityStatus)}</em>
          </>
        )}
      </span>
    </button>
  )
}

function SummaryTile({ label, value }) {
  return (
    <div className="comparison-summary-tile">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  )
}

function ComparisonLoadingState() {
  return (
    <div className="comparison-state" role="status" aria-live="polite">
      <div className="loading-line loading-line-title" />
      <div className="loading-line" />
      <p>Nalaganje primerjave regij ...</p>
    </div>
  )
}

function buildComparisonRows(regions) {
  return [...regions]
    .map(region => ({
      regionCode: region.region_code,
      regionName: region.region_name,
      valueMean: Number(region.value_mean),
      qualityStatus: region.quality_status,
      unit: region.unit,
      hasValue:
        region.quality_status === 'valid' &&
        region.value_mean !== null &&
        region.value_mean !== undefined &&
        Number.isFinite(Number(region.value_mean)),
    }))
    .sort((left, right) => {
      if (left.hasValue && right.hasValue) {
        return right.valueMean - left.valueMean
      }

      if (left.hasValue) return -1
      if (right.hasValue) return 1
      return left.regionName.localeCompare(right.regionName, 'sl')
    })
}

function formatRegionValue(row) {
  if (!row) {
    return 'Ni podatka'
  }

  return `${row.regionName}: ${formatNo2Value(row.valueMean)}`
}

function formatNoDataCount(rows) {
  const count = rows.filter(row => !row.hasValue).length
  return count.toLocaleString('sl-SI')
}

function formatCount(validCount, totalCount) {
  if (totalCount === 0) {
    return 'Ni regij'
  }

  return `${validCount}/${totalCount} z vrednostjo`
}

function formatQualityStatus(status) {
  if (status === 'no_valid_pixels') {
    return 'Ni veljavnih pikslov'
  }

  if (status === 'processing_error') {
    return 'Napaka obdelave'
  }

  return 'Ni veljavne vrednosti'
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

export default RegionComparisonCard
