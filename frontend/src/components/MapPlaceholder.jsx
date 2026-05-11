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
          <p>Nalagam regije ...</p>
        ) : error ? (
          <p>{error}</p>
        ) : regions.length === 0 ? (
          <p>Regije niso na voljo.</p>
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
