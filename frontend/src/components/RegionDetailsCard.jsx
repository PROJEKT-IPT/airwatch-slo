import { useLanguage } from '../i18n'
import { formatNo2Value as formatNo2 } from '../utils/format'

function RegionDetailsCard({
  measurement,
  selectedRegion,
  isLoading,
  error,
  hasRegion,
  latestRegionCsvExportUrl = '',
  regionHistoryCsvExportUrl = '',
  allRegionsCsvExportUrl = '',
}) {
  const { t, locale } = useLanguage()
  const regionName = measurement?.region_name || selectedRegion?.region_name || t('selectedRegion')
  const regionCode = measurement?.region_code || selectedRegion?.region_code || ''
  const qualityStatus = getQualityStatus(measurement?.quality_status, t)
  const missingDataState = measurement ? getMissingDataState(measurement, t) : null
  const isRegionExportDisabled = !hasRegion || isLoading || Boolean(error)
  const isAllRegionsExportDisabled = !allRegionsCsvExportUrl
  const isPdfDisabled = !measurement || isLoading || Boolean(error)

  return (
    <section className="card detail-card" id="details-section">
      <div className="card-heading">
        <div>
          <p className="section-kicker">{t('detailsKicker')}</p>
          <h2>{hasRegion ? regionName : t('regionNotSelected')}</h2>
          {regionCode ? <p className="muted-text region-code-line">{t('regionCode')}: {regionCode}</p> : null}
        </div>
        <div className="detail-card-actions">
          {measurement ? (
            <span className={`quality-badge ${qualityStatus.className}`}>
              {qualityStatus.label}
            </span>
          ) : null}
          <ExportLink
            href={latestRegionCsvExportUrl}
            disabled={isRegionExportDisabled || !latestRegionCsvExportUrl}
            label={t('exportRegionLatestCsv')}
          />
          <ExportLink
            href={regionHistoryCsvExportUrl}
            disabled={isRegionExportDisabled || !regionHistoryCsvExportUrl}
            label={t('exportRegionHistoryCsv')}
          />
          <ExportLink
            href={allRegionsCsvExportUrl}
            disabled={isAllRegionsExportDisabled}
            label={t('exportCsv')}
          />
          <button
            type="button"
            className={`export-button${isPdfDisabled ? ' export-button-disabled' : ''}`}
            disabled={isPdfDisabled}
            onClick={() => {
              if (!isPdfDisabled && typeof window !== 'undefined') window.print()
            }}
          >
            {t('exportPdf')}
          </button>
        </div>
      </div>

      <DetailsBody
        hasRegion={hasRegion}
        isLoading={isLoading}
        error={error}
        measurement={measurement}
        missingDataState={missingDataState}
        t={t}
        locale={locale}
      />
    </section>
  )
}

function ExportLink({ href, disabled, label }) {
  return (
    <a
      className={`export-button${disabled ? ' export-button-disabled' : ''}`}
      href={disabled ? undefined : href}
      aria-disabled={disabled}
      onClick={event => {
        if (disabled) event.preventDefault()
      }}
    >
      {label}
    </a>
  )
}

function DetailsBody({ hasRegion, isLoading, error, measurement, missingDataState, t, locale }) {
  if (!hasRegion) {
    return <p className="muted-text">{t('selectRegionForDetails')}</p>
  }
  if (isLoading) {
    return (
      <div className="details-loading" role="status" aria-live="polite">
        <div className="loading-line loading-line-title" />
        <div className="loading-line" />
        <div className="loading-line" />
        <p className="muted-text">{t('loadingRegionData')}</p>
      </div>
    )
  }
  if (error) {
    return (
      <div className="details-error" role="alert">
        <h3>{t('detailsLoadErrorTitle')}</h3>
        <p className="error-text">{error}</p>
      </div>
    )
  }
  if (!measurement) {
    return (
      <div className="details-empty" role="status" aria-live="polite">
        <h3>{t('noRegionDataTitle')}</h3>
        <p className="muted-text">{t('noRegionDataText')}</p>
      </div>
    )
  }
  if (missingDataState) {
    return (
      <div className="details-empty" role="status" aria-live="polite">
        <h3>{missingDataState.title}</h3>
        <p className="muted-text">{missingDataState.text}</p>
        <MeasurementDetails measurement={measurement} t={t} locale={locale} includeValue={false} />
        <p className="provenance-note">{getProvenanceNote(measurement, t)}</p>
      </div>
    )
  }
  return (
    <>
      <MeasurementDetails measurement={measurement} t={t} locale={locale} includeValue />
      <p className="provenance-note">{getProvenanceNote(measurement, t)}</p>
    </>
  )
}

function MeasurementDetails({ measurement, t, locale, includeValue }) {
  return (
    <dl className="details-list">
      {includeValue ? (
        <>
          <DetailRow label={t('latestNo2Value')} value={formatNo2(measurement.value_mean, locale, t('noData'))} t={t} />
          <DetailRow
            label={t('minMaxNo2')}
            value={`${formatNo2(measurement.value_min, locale, t('noData'))} / ${formatNo2(measurement.value_max, locale, t('noData'))}`}
            t={t}
          />
          <DetailRow label={t('unit')} value={measurement.unit || t('noData')} t={t} />
        </>
      ) : null}
      <DetailRow label={t('validPixels')} value={formatInteger(measurement.pixel_count_valid, t, locale)} t={t} />
      <DetailRow label={t('qaThreshold')} value={formatNumber(measurement.qa_threshold, t, locale)} t={t} />
      <DetailRow label={t('qualityStatus')} value={getQualityStatus(measurement.quality_status, t).label} t={t} />
      <DetailRow label={t('measurementStart')} value={formatDateTime(measurement.measurement_start_time, t, locale)} t={t} />
      <DetailRow label={t('measurementEnd')} value={formatDateTime(measurement.measurement_end_time, t, locale)} t={t} />
      <DetailRow label={t('processingRunId')} value={measurement.processing_run_id} t={t} />
      <DetailRow label={t('productId')} value={measurement.source_product_id} t={t} />
      <DetailRow label={t('dataSource')} value="Sentinel-5P / Copernicus" t={t} />
      <DetailRow
        label={t('productSource')}
        value={shortenProduct(measurement.source_product_name, t)}
        title={measurement.source_product_name}
        t={t}
      />
    </dl>
  )
}

function DetailRow({ label, value, title, t }) {
  return (
    <div className="detail-row">
      <dt>{label}</dt>
      <dd title={title || undefined}>{value ?? t('noData')}</dd>
    </div>
  )
}

function shortenProduct(name, t) {
  if (!name) return t('noData')
  if (name.includes('S5P') && name.includes('NO2')) return 'Sentinel-5P OFFL L2 NO2'
  return name
}

function getQualityStatus(status, t) {
  if (status === 'valid') return { label: t('valid'), className: 'quality-valid' }
  if (status === 'no_valid_pixels') return { label: t('noDataStatus'), className: 'quality-empty' }
  if (status === 'processing_error') return { label: t('processingError'), className: 'quality-error' }
  return { label: t('unknown'), className: 'quality-empty' }
}

function getProvenanceNote(measurement, t) {
  if (measurement.quality_status === 'no_valid_pixels') return t('provenanceNoPixels')
  if (measurement.quality_status === 'processing_error') return t('provenanceProcessingError')
  return t('provenanceDefault')
}

function getMissingDataState(measurement, t) {
  if (measurement.quality_status === 'no_valid_pixels') {
    return { title: t('noValidDataTitle'), text: t('no2UnavailableText') }
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

export default RegionDetailsCard
