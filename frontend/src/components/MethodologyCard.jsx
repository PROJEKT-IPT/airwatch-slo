function MethodologyCard() {
  return (
    <section className="card methodology-card">
      <p className="section-kicker">Metodologija</p>
      <h2>Kako brati rezultat</h2>
      <p className="muted-text">
        Vrednost je satelitska regionalna ocena NO₂ iz produktov Sentinel-5P
        (TROPOMI), agregirana po statistični regiji. En piksel pokriva približno
        3,5 × 5,5 km, zato podatkov ni smiselno brati kot ulične koncentracije.
        Prikaz ni v realnem času.
      </p>
      <p className="muted-text">
        Uporabljen je kakovostni filter <code>qa_value &gt;= 0.75</code>. Če
        regija nima dovolj veljavnih pikslov, jo prikažemo kot „ni podatkov“ in
        vrednosti ne izračunamo.
      </p>
    </section>
  )
}

export default MethodologyCard
