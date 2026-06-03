import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

import { useLanguage } from '../i18n'
import { formatNo2Value } from '../utils/format'

// Low -> high concentration ramp (green to orange), consistent with the map.
const BAR_COLORS = ['#2f9e63', '#5cae53', '#94c247', '#d6c63f', '#e3a93b', '#e2843c', '#d2603a']

function colorForRatio(ratio) {
  const safe = Number.isFinite(ratio) ? Math.max(0, Math.min(1, ratio)) : 0
  return BAR_COLORS[Math.min(Math.floor(safe * BAR_COLORS.length), BAR_COLORS.length - 1)]
}

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

  // Values are tiny (mol/m²); show them in µmol/m² to match the map legend.
  const chartData = validRows.map(row => ({ ...row, displayValue: row.valueMean * 1e6 }))
  const displayValues = chartData.map(row => row.displayValue)
  const minValue = displayValues.length ? Math.min(...displayValues) : 0
  const maxValue = displayValues.length ? Math.max(...displayValues) : 0
  const axisMax = niceCeil(maxValue)
  const chartHeight = Math.max(200, chartData.length * 48 + 36)

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

          <div className="comparison-chart">
            <ResponsiveContainer width="100%" height={chartHeight}>
              <BarChart
                layout="vertical"
                data={chartData}
                margin={{ top: 6, right: 20, bottom: 28, left: 8 }}
                barCategoryGap="28%"
              >
                <CartesianGrid horizontal={false} stroke="rgba(29, 61, 41, 0.1)" />
                <XAxis
                  type="number"
                  domain={[0, axisMax]}
                  tickCount={5}
                  tickLine={false}
                  axisLine={{ stroke: 'rgba(29, 61, 41, 0.2)' }}
                  tick={{ fontSize: 12, fill: '#5e6b61' }}
                  tickFormatter={value => value.toLocaleString(locale)}
                >
                </XAxis>
                <YAxis
                  type="category"
                  dataKey="regionName"
                  width={150}
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 12, fill: '#1d3d29', fontWeight: 700 }}
                />
                <Tooltip
                  cursor={{ fill: 'rgba(29, 61, 41, 0.06)' }}
                  content={<ChartTooltip locale={locale} />}
                />
                <Bar
                  dataKey="displayValue"
                  radius={[0, 6, 6, 0]}
                  isAnimationActive={false}
                  cursor="pointer"
                  onClick={(_, index) => onRegionSelect(chartData[index]?.regionCode)}
                >
                  {chartData.map(row => (
                    <Cell
                      key={row.regionCode}
                      fill={colorForRatio(maxValue === minValue ? 0.5 : (row.displayValue - minValue) / (maxValue - minValue))}
                      stroke={row.regionCode === selectedRegionCode ? '#16291d' : 'transparent'}
                      strokeWidth={row.regionCode === selectedRegionCode ? 2 : 0}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <p className="comparison-axis-unit">{getMicromolUnit()}</p>
          </div>

          {/* Accessible region selection (keyboard + assistive tech); the chart
              above is the visual representation. */}
          <div className="comparison-controls" aria-label={t('comparisonListAria')}>
            {rows.map(row => (
              <button
                key={row.regionCode}
                type="button"
                aria-pressed={row.regionCode === selectedRegionCode}
                onClick={() => onRegionSelect(row.regionCode)}
              >
                {t('selectRegion', { region: row.regionName })}
              </button>
            ))}
          </div>
        </>
      )}
    </section>
  )
}

function ChartTooltip({ active, payload, locale }) {
  if (!active || !payload || payload.length === 0) return null
  const row = payload[0].payload
  return (
    <div className="comparison-tooltip">
      <strong>{row.regionName}</strong>
      <span>
        {row.displayValue.toLocaleString(locale, { maximumFractionDigits: 1 })} {getMicromolUnit()}
      </span>
    </div>
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

function niceCeil(value) {
  if (!Number.isFinite(value) || value <= 0) return 1
  const magnitude = 10 ** Math.floor(Math.log10(value))
  return Math.ceil(value / magnitude) * magnitude
}

function getMicromolUnit() {
  return 'µmol/m²'
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
  return `${row.regionName}: ${formatNo2Value(row.valueMean, locale, t('noData'))}`
}

function formatNoDataCount(rows, locale) {
  const count = rows.filter(row => !row.hasValue).length
  return count.toLocaleString(locale)
}

function formatCount(validCount, totalCount, t) {
  if (totalCount === 0) return t('noRegions')
  return t('withValue', { valid: validCount, total: totalCount })
}

export default RegionComparisonCard
