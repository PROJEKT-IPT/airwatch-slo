import { useLanguage } from '../i18n'

function LatestMeasurementCard({
  measurement,
  selectedRegion,
  isLoading,
  error,
  hasRegion,
}) {
  const { t, locale } = useLanguage()

  if (!hasRegion) {
    return (
      <article className="card metric-card">
        <EmptyState title={t('noRegionSelected')} text={t('selectRegionForMeasurement')} />
      </article>
    )
  }

  if (isLoading) {
    return (
      <article className="card metric-card">
        <LoadingState title={t('loadingLatestMeasurement')} />
      </article>
    )
  }

  if (error) {
    return (
      <article className="card metric-card">
        <ErrorState title={t('measurementLoadErrorTitle')} text={error} />
      </article>
    )
  }

  if (!measurement) {
    return (
      <article className="card metric-card">
        <EmptyState title={t('noStoredMeasurementTitle')} text={t('noStoredMeasurementText')} />
      </article>
    )
  }

  const status = getQualityStatus(measurement.quality_status, t)
  const missingDataState = getMissingDataState(measurement, t)
  const regionName = measurement.region_name || selectedRegion?.region_name || t('selectedRegion')

  return (
    <article className="card metric-card">
      <div className="card-heading">
        <div>
          <p className="section-kicker">{t('latestValidMeasurement')}</p>
          <h2>{regionName}</h2>
        </div>
        <span className={`quality-badge ${status.className}`}>{status.label}</span>
      </div>

      {missingDataState ? (
        <UnavailableMeasurementState title={missingDataState.title} text={missingDataState.text} measurement={measurement} t={t} locale={locale} />
      ) : (
        <>
          <div className="metric-value-block">
            <span className="metric-value">{formatNo2Value(measurement.value_mean, t, locale)}</span>
            <span className="metric-unit">{measurement.unit || 'mol/m2'}</span>
          </div>

          <div className="metric-meta-grid">
            <InfoTile label={t('validPixels')} value={formatInteger(measurement.pixel_count_valid, t, locale)} t={t} />
            <InfoTile label={t('qaThreshold')} value={formatNumber(measurement.qa_threshold, t, locale)} t={t} />
            <InfoTile label={t('measurementTime')} value={formatDateTime(measurement.measurement_end_time, t, locale)} t={t} />
            <InfoTile
              label={t('productSource')}
              value={formatProductLabel(measurement.source_product_name, t)}
              detail={measurement.source_product_name}
              wide
              t={t}
            />
          </div>
        </>
      )}
    </article>
  )
}

function InfoTile({ label, value, detail = '', wide = false, t }) {
  return (
    <div className={`info-tile ${wide ? 'info-tile-wide' : ''}`} title={detail || ''}>
      <span>{label}</span>
      <strong>{value ?? t('noData')}</strong>
      {detail ? <em>{detail}</em> : null}
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

function UnavailableMeasurementState({ title, text, measurement, t, locale }) {
  return (
    <div className="measurement-unavailable" role="status" aria-live="polite">
      <h3>{title}</h3>
      <p>{text}</p>
      <div className="metric-meta-grid">
        <InfoTile label={t('validPixels')} value={formatInteger(measurement.pixel_count_valid, t, locale)} t={t} />
        <InfoTile label={t('qaThreshold')} value={formatNumber(measurement.qa_threshold, t, locale)} t={t} />
        <InfoTile label={t('measurementTime')} value={formatDateTime(measurement.measurement_end_time, t, locale)} t={t} />
        <InfoTile label={t('status')} value={formatQualityStatus(measurement.quality_status, t)} t={t} />
      </div>
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

function getQualityStatus(status, t) {
  if (status === 'valid') return { label: t('valid'), className: 'quality-valid' }
  if (status === 'no_valid_pixels') return { label: t('noDataStatus'), className: 'quality-empty' }
  if (status === 'processing_error') return { label: t('processingError'), className: 'quality-error' }
  return { label: t('unknown'), className: 'quality-empty' }
}

function formatQualityStatus(status, t) {
  if (status === 'valid') return t('valid')
  if (status === 'no_valid_pixels') return t('noValidPixels')
  if (status === 'processing_error') return t('processingError')
  return t('unknown')
}

function formatProductLabel(sourceProductName, t) {
  if (!sourceProductName) return t('noData')
  if (sourceProductName.includes('S5P') && sourceProductName.includes('NO2')) return 'Sentinel-5P OFFL L2 NO2'
  return sourceProductName
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

function formatNumber(value, t, locale) {
  if (value === null || value === undefined || value === '') return t('noData')

  const numberValue = Number(value)
  if (!Number.isFinite(numberValue)) return String(value)

  return numberValue.toLocaleString(locale, { maximumSignificantDigits: 6 })
}

function formatInteger(value, t, locale) {
  if (value === null || value === undefined || value === '') return t('noData')

  const numberValue = Number(value)
  if (!Number.isFinite(numberValue)) return String(value)

  return numberValue.toLocaleString(locale, { maximumFractionDigits: 0 })
}

function formatDateTime(value, t, locale) {
  if (!value) return t('noData')

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value

  return new Intl.DateTimeFormat(locale, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date)
}

export default LatestMeasurementCard
