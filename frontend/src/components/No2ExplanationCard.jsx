function No2ExplanationCard() {
  return (
    <section className="card no2-explainer-card">
      <p className="section-kicker">Kaj je NO₂</p>
      <h2>Razumevanje satelitske NO₂ meritve</h2>
      <p>
        NO₂ v tej aplikaciji predstavlja troposferski stolpec, izmerjen s
        satelitskim instrumentom TROPOMI (Sentinel-5P). Vrednost je izražena v
        enoti mol/m² in povzema povprečje veljavnih pikslov, dodeljenih izbrani
        statistični regiji.
      </p>
      <ul className="no2-explainer-list">
        <li>
          Piksel TROPOMI pokriva približno 3.5 × 5.5 km, zato podatkov ni
          smiselno razlagati kot ulične ali mikrolokalne koncentracije.
        </li>
        <li>
          Regionalna agregacija zmanjša vpliv posameznih pikslov in omogoča
          stabilnejšo primerjavo med regijami.
        </li>
        <li>
          Filtriramo s pragom <code>qa_value &gt;= 0.75</code>; piksli pod pragom
          niso vključeni v izračun.
        </li>
        <li>
          Manjkajoči podatki so lahko posledica oblačnosti, nizke kakovosti
          opazovanja, zamika produkta ali napake v obdelavi.
        </li>
      </ul>
    </section>
  )
}

export default No2ExplanationCard
