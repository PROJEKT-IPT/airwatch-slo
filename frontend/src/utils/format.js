// Render a tiny NO₂ value as a compact "mantissa x 10^exponent" string,
// e.g. 0.000027 -> "2,7 x 10^-5". `fallback` is returned for empty input.
export function formatNo2Value(value, locale, fallback = '') {
  if (value === null || value === undefined || value === '') return fallback

  const numberValue = Number(value)
  if (!Number.isFinite(numberValue)) return String(value)
  if (numberValue === 0) return '0'

  const exponent = Math.floor(Math.log10(Math.abs(numberValue)))
  const mantissa = numberValue / 10 ** exponent
  return `${mantissa.toLocaleString(locale, { maximumFractionDigits: 2 })} x 10^${exponent}`
}

// Columns exported for the "all regions" CSV (stable, machine-readable keys).
const REGION_CSV_COLUMNS = [
  'region_code',
  'region_name',
  'value_mean',
  'unit',
  'pixel_count_valid',
  'quality_status',
  'measurement_end_time',
]

function csvCell(value) {
  if (value === null || value === undefined) return ''
  const text = String(value)
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text
}

export function buildRegionsCsv(regions = []) {
  const header = REGION_CSV_COLUMNS.join(',')
  const rows = regions.map(region => REGION_CSV_COLUMNS.map(column => csvCell(region?.[column])).join(','))
  return [header, ...rows].join('\n')
}

export function regionsCsvDataUrl(regions = []) {
  if (!regions.length) return ''
  return `data:text/csv;charset=utf-8,${encodeURIComponent(buildRegionsCsv(regions))}`
}
