import { useLanguage } from '../i18n'

function RegionSelect({
  regions,
  selectedRegionCode,
  onRegionChange,
  isLoading,
  error,
}) {
  const { t } = useLanguage()
  const hasRegions = regions.length > 0

  return (
    <div className="region-select">
      <label htmlFor="region-select">{t('regionLabel')}</label>
      <select
        id="region-select"
        value={selectedRegionCode}
        onChange={event => onRegionChange(event.target.value)}
        disabled={isLoading || !hasRegions}
      >
        <option value="">
          {isLoading ? t('loadingRegions') : t('chooseRegion')}
        </option>
        {regions.map(region => (
          <option key={region.region_code} value={region.region_code}>
            {region.region_name}
            {region.quality_status === 'no_valid_pixels' ? ` (${t('noValidPixelsSuffix')})` : ''}
          </option>
        ))}
      </select>
      {isLoading ? (
        <div className="inline-state" role="status" aria-live="polite">
          <span className="inline-spinner" aria-hidden="true" />
          <p className="field-message">{t('loadingRegions')}</p>
        </div>
      ) : null}
      {error ? (
        <div className="inline-state inline-state-error" role="alert">
          <p className="field-message field-message-error">{error}</p>
        </div>
      ) : null}
      {!isLoading && !error && !hasRegions ? (
        <p className="field-message">{t('regionsUnavailable')}</p>
      ) : null}
    </div>
  )
}

export default RegionSelect
