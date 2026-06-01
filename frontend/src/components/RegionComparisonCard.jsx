import { useLanguage } from '../i18n'

function RegionComparisonCard({
  regions,
  selectedRegionCode,
  onRegionSelect,
  isLoading,
  error,
}) {
  const { t, locale } = useLanguage()
  const rows = buildComparisonRows(regions)
  const validRows = rows.filter(row => row.hasValue)
  const maxValue = validRows.reduce(
    (largest, row) => Math.max(largest, row.valueMean),
    0,
  )

  return (
    <section className="card comparison-card" id="comparison-section" aria-labelledby="region-comparison-title">
      <div className="card-heading">
        <div>
          <p className="section-kicker">{t('navComparison')}</p>
          <h2 id="region-comparison-title">{t('comparisonTitle')}</h2>
        </div>
        <span className="comparison-count">{formatCount(validRows.length, rows.length, t)}</span>
      </div>

      {isLoading ? (
        <ComparisonLoadingState t={t} />
      ) : error ? (
        <div className="comparison-state state-error" role="alert">
          <p>{error}</p>
        </div>
      ) : rows.length === 0 ? (
        <div className="comparison-state">
          <p>{t('comparisonUnavailable')}</p>
        </div>
      ) : (
        <>
          <div className="comparison-summary" aria-label={t('comparisonSummaryAria')}>
            <SummaryTile label={t('highestValue')} value={formatRegionValue(validRows[0], t, locale)} />
            <SummaryTile
              label={t('lowestValue')}
              value={formatRegionValue(validRows[validRows.length - 1], t, locale)}
            />
            <SummaryTile label={t('withoutValidPixels')} value={formatNoDataCount(rows, locale)} />
          </div>

          <div className="comparison-list" role="list" aria-label={t('comparisonListAria')}>
            {rows.map((row, index) => (
              <ComparisonRow
                key={row.regionCode}
                row={row}
                rank={row.hasValue ? index + 1 : null}
                maxValue={maxValue}
                isSelected={row.regionCode === selectedRegionCode}
                onRegionSelect={onRegionSelect}
                t={t}
                locale={locale}
              />
            ))}
          </div>
        </>
      )}
    </section>
  )
}

function ComparisonRow({ row, rank, maxValue, isSelected, onRegionSelect, t, locale }) {
  const barWidth = row.hasValue && maxValue > 0 ? `${Math.max((row.valueMean / maxValue) * 100, 4)}%` : '0%'
  const buttonLabel = t('selectRegion', { region: row.regionName })

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
            <strong>{formatNo2Value(row.valueMean, t, locale)}</strong>
            <em>{row.unit || 'mol/m2'}</em>
          </>
        ) : (
          <>
            <strong>{t('noData')}</strong>
            <em>{formatQualityStatus(row.qualityStatus, t)}</em>
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

function ComparisonLoadingState({ t }) {
  return (
    <div className="comparison-state" role="status" aria-live="polite">
      <div className="loading-line loading-line-title" />
      <div className="loading-line" />
      <p>{t('loadingComparison')}</p>
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
      if (left.hasValue && right.hasValue) return right.valueMean - left.valueMean
      if (left.hasValue) return -1
      if (right.hasValue) return 1
      return left.regionName.localeCompare(right.regionName, 'sl')
    })
}

function formatRegionValue(row, t, locale) {
  if (!row) return t('noData')
  return `${row.regionName}: ${formatNo2Value(row.valueMean, t, locale)}`
}

function formatNoDataCount(rows, locale) {
  const count = rows.filter(row => !row.hasValue).length
  return count.toLocaleString(locale)
}

function formatCount(validCount, totalCount, t) {
  if (totalCount === 0) return t('noRegions')
  return t('withValue', { valid: validCount, total: totalCount })
}

function formatQualityStatus(status, t) {
  if (status === 'no_valid_pixels') return t('noValidPixels')
  if (status === 'processing_error') return t('processingError')
  return t('noValidValue')
}

function formatNo2Value(value, t, locale) {
  if (value === null || value === undefined || value === '') return t('noData')

  const numberValue = Number(value)
  if (!Number.isFinite(numberValue)) return String(value)
  if (numberValue === 0) return '0'

  const exponent = Math.floor(Math.log10(Math.abs(numberValue)))
  const mantissa = numberValue / 10 ** exponent
  return `${mantissa.toLocaleString(locale, { maximumFractionDigits: 2 })} x 10^${exponent}`
}

export default RegionComparisonCard
