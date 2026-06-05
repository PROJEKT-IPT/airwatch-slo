// Render a tiny NO2 value as a compact "mantissa x 10 exponent" string,
// e.g. 0.000027 -> "2,7 x 10⁻⁵". `fallback` is returned for empty input.
export function formatNo2Value(value, locale, fallback = '') {
  if (value === null || value === undefined || value === '') return fallback

  const numberValue = Number(value)
  if (!Number.isFinite(numberValue)) return String(value)
  if (numberValue === 0) return '0'

  const exponent = Math.floor(Math.log10(Math.abs(numberValue)))
  const mantissa = numberValue / 10 ** exponent
  return `${mantissa.toLocaleString(locale, { maximumFractionDigits: 2 })} × 10${toSuperscript(exponent)}`
}

function toSuperscript(value) {
  const superscriptDigits = {
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
    .map((character) => superscriptDigits[character] || character)
    .join('')
}
