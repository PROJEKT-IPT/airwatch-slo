function DataQualityCard() {
  return (
    <section className="card quality-info-card">
      <p className="section-kicker">Kakovost podatkov</p>
      <h2>Kako brati rezultat</h2>
      <p>
        Obdelava uporablja prag kakovosti QA &gt;= 0.75. Vrednosti so satelitske
        regionalne ocene NO₂ iz Sentinel-5P in niso ulične meritve kakovosti zraka.
      </p>
      <ul className="quality-notes">
        <li>Oblačnost in pogoji opazovanja lahko zmanjšajo število veljavnih pikslov.</li>
        <li>Regionalni rezultat je namenjen pregledu širših vzorcev.</li>
        <li>Za interpretacijo je pomemben tudi status kakovosti meritve.</li>
      </ul>
    </section>
  )
}

export default DataQualityCard
