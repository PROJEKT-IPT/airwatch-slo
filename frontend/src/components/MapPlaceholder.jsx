function MapPlaceholder({ regions, selectedRegionCode, isLoading, error }) {
  return (
    <section className="card map-card">
      <div className="card-heading">
        <div>
          <p className="section-kicker">Prostorski pregled</p>
          <h2>NO₂ po regijah</h2>
        </div>
        <span className="map-tag">MVP</span>
      </div>

      <div className="map-placeholder" aria-label="Prikaz regij">
        {isLoading ? (
          <div className="map-state" role="status" aria-live="polite">
            <div className="loading-line loading-line-title" />
            <div className="loading-line" />
            <p>Nalagam prostorski pregled regij ...</p>
          </div>
        ) : error ? (
          <div className="map-state map-state-error" role="alert">
            <h3>Regij ni mogoče prikazati</h3>
            <p>{error}</p>
          </div>
        ) : regions.length === 0 ? (
          <div className="map-state">
            <h3>Regije niso na voljo</h3>
            <p>API trenutno ne vrača nobene regije za prikaz.</p>
          </div>
        ) : (
          <div className="region-blocks">
            {regions.map(region => (
              <div
                key={region.region_code}
                className={`region-block ${
                  region.region_code === selectedRegionCode ? 'region-block-active' : ''
                }`}
                title={region.region_name}
              >
                {region.region_code}
              </div>
            ))}
          </div>
        )}
      </div>

      <p className="map-hint">
        Interaktivni zemljevid bo uporabljal slovenske statistične regije NUTS3.
        Kliknite regijo za podrobnosti, ko bo zemljevid dodan.
      </p>
    </section>
  )
}

export default MapPlaceholder
