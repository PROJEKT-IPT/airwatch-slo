function RegionSelect({
  regions,
  selectedRegionCode,
  onRegionChange,
  isLoading,
  error,
  isTestRegion,
}) {
  const hasRegions = regions.length > 0

  return (
    <div className="region-select">
      <label htmlFor="region-select">Regija</label>
      <select
        id="region-select"
        value={selectedRegionCode}
        onChange={event => onRegionChange(event.target.value)}
        disabled={isLoading || !hasRegions}
      >
        <option value="">
          {isLoading ? 'Nalagam regije ...' : 'Izberite regijo'}
        </option>
        {regions.map(region => (
          <option key={region.region_code} value={region.region_code}>
            {region.region_name}
            {isTestRegion?.(region) ? ' (testno območje)' : ''}
          </option>
        ))}
      </select>
      {error ? <p className="field-message field-message-error">{error}</p> : null}
      {!isLoading && !error && !hasRegions ? (
        <p className="field-message">API trenutno ne vrača nobene regije.</p>
      ) : null}
    </div>
  )
}

export default RegionSelect
