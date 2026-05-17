function MapPlaceholder({ regions, selectedRegionCode, isLoading, error }) {
  return (
    <section className="card map-card">
      <div className="card-heading">
        <div>
          <p className="section-kicker">Prostorski pregled</p>
          <h2>NO₂ po statističnih regijah</h2>
        </div>
        <span className="map-tag">MVP</span>
      </div>

      <div className="map-placeholder" aria-label="Prikaz regij">
        {isLoading ? (
          <div className="map-state" role="status" aria-live="polite">
            <div className="loading-line loading-line-title" />
            <div className="loading-line" />
            <p>Nalaganje prostorskega pregleda regij ...</p>
          </div>
        ) : error ? (
          <div className="map-state map-state-error" role="alert">
            <h3>Regij ni mogoče prikazati</h3>
            <p>{error}</p>
          </div>
        ) : regions.length === 0 ? (
          <div className="map-state">
            <h3>Regijski podatki trenutno niso na voljo</h3>
            <p>Regionalne meritve morda še niso bile naložene v bazo.</p>
          </div>
        ) : (
          <div className="region-blocks">
            {regions.map(region => {
              const isActive = region.region_code === selectedRegionCode
              const qualityClassName = qualityClass(region.quality_status)
              return (
                <div
                  key={region.region_code}
                  className={`region-block ${qualityClassName} ${
                    isActive ? 'region-block-active' : ''
                  }`}
                  title={`${region.region_name} — ${qualityLabel(region.quality_status)}`}
                >
                  {region.region_code}
                </div>
              )
            })}
          </div>
        )}
      </div>

      <p className="map-hint">
        Interaktivni zemljevid bo uporabljal slovenske statistične regije NUTS3.
        Barvni odtenek polja označuje status kakovosti zadnje meritve. Klik za
        izbiro regije bo dodan, ko bo zemljevid implementiran.
      </p>
    </section>
  )
}

function qualityClass(status) {
  if (status === 'valid') {
    return 'region-block-valid'
  }

  if (status === 'no_valid_pixels') {
    return 'region-block-empty'
  }

  if (status === 'processing_error') {
    return 'region-block-error'
  }

  return ''
}

function qualityLabel(status) {
  if (status === 'valid') {
    return 'veljavna meritev'
  }

  if (status === 'no_valid_pixels') {
    return 'ni veljavnih pikslov'
  }

  if (status === 'processing_error') {
    return 'napaka obdelave'
  }

  return 'status neznan'
}

export default MapPlaceholder
