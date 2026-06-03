import { useLanguage } from '../i18n'

function LatestMeasurementCard({
  measurement,
  isLoading,
  error,
  hasRegion,
  concentrationLevel = null,
  regionSelect = null,
}) {
  const { t, locale } = useLanguage()

  function renderBody() {
    if (!hasRegion) {
      return <EmptyState title={t('noRegionSelected')} text={t('selectRegionForMeasurement')} />
    }
    if (isLoading) {
      return <LoadingState title={t('loadingLatestMeasurement')} />
    }
    if (error) {
      return <ErrorState title={t('measurementLoadErrorTitle')} text={error} />
    }
    if (!measurement) {
      return <EmptyState title={t('noStoredMeasurementTitle')} text={t('noStoredMeasurementText')} />
    }

    const missingDataState = getMissingDataState(measurement, t)
    if (missingDataState) {
      return (
        <div className="measurement-unavailable" role="status" aria-live="polite">
          <h3>{missingDataState.title}</h3>
          <p>{missingDataState.text}</p>
        </div>
      )
    }

    return (
      <>
        <p className="metric-active-tag">
          <span className="metric-active-dot" aria-hidden="true" />
          {t('activeOnMap')}
        </p>

        <div className="metric-summary-row">
          <div className="metric-value-block">
            <No2Value value={measurement.value_mean} t={t} locale={locale} />
            <span className="metric-unit">{measurement.unit || 'mol/m2'}</span>
          </div>
          {concentrationLevel ? <ConcentrationBadge level={concentrationLevel} t={t} /> : null}
        </div>

        <div className="context-divider" />

        <p className="metric-note">
          <span className="metric-note-icon" aria-hidden="true">i</span>
          {t('measurementNote')}
        </p>
      </>
    )
  }

  return (
    <article className="card metric-card">
      {regionSelect ? (
        <>
          <div className="metric-card-picker">{regionSelect}</div>
          <div className="context-divider" />
        </>
      ) : null}

      <div className="metric-card-body">{renderBody()}</div>
    </article>
  )
}

const CONCENTRATION = {
  low: { className: 'conc-dot--low', labelKey: 'concentrationLow' },
  moderate: { className: 'conc-dot--moderate', labelKey: 'concentrationModerate' },
  high: { className: 'conc-dot--high', labelKey: 'concentrationHigh' },
}

// Relative NO₂ level (vs. the other regions), shown beside the headline value.
function ConcentrationBadge({ level, t }) {
  const info = CONCENTRATION[level]
  if (!info) return null

  return (
    <div className="concentration-level">
      <span className={`conc-dot ${info.className}`} aria-hidden="true" />
      <strong>{t(info.labelKey)}</strong>
    </div>
  )
}

function LoadingState({ title }) {
  return (
    <div className="state-block">
      <div className="loading-line loading-line-title" />
      <div className="loading-line" />
      <p>{title}</p>
    </div>
  )
}

function EmptyState({ title, text }) {
  return (
    <div className="state-block">
      <h2>{title}</h2>
      <p>{text}</p>
    </div>
  )
}

function ErrorState({ title, text }) {
  return (
    <div className="state-block state-error">
      <h2>{title}</h2>
      <p>{text}</p>
    </div>
  )
}

function getMissingDataState(measurement, t) {
  if (measurement.quality_status === 'no_valid_pixels') {
    return { title: t('noValidDataTitle'), text: t('noValidDataText') }
  }

  if (measurement.quality_status === 'processing_error') {
    return { title: t('measurementProcessingErrorTitle'), text: t('measurementProcessingErrorText') }
  }

  if (
    measurement.pixel_count_valid === 0 ||
    measurement.value_mean === null ||
    measurement.value_mean === undefined
  ) {
    return { title: t('no2UnavailableTitle'), text: t('no2UnavailableText') }
  }

  return null
}

// Renders the headline NO₂ value with a real superscript exponent
// (e.g. 2,7 × 10⁻⁵) instead of an inline "x 10^-5" string.
function No2Value({ value, t, locale }) {
  if (value === null || value === undefined || value === '') {
    return <span className="metric-value">{t('noData')}</span>
  }

  const numberValue = Number(value)
  if (!Number.isFinite(numberValue)) {
    return <span className="metric-value">{String(value)}</span>
  }
  if (numberValue === 0) {
    return <span className="metric-value">0</span>
  }

  const exponent = Math.floor(Math.log10(Math.abs(numberValue)))
  const mantissa = numberValue / 10 ** exponent

  return (
    <span className="metric-value">
      {mantissa.toLocaleString(locale, { maximumFractionDigits: 2 })}
      <span className="metric-value-sci"> × 10</span>
      <sup className="metric-value-exp">{exponent}</sup>
    </span>
  )
}

export default LatestMeasurementCard
