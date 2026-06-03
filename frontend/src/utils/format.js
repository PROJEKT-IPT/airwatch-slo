// Shared formatting helpers (kept in one place to avoid duplication).

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
