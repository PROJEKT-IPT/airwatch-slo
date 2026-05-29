function MethodologyCard() {
  return (
    <section className="card methodology-card">
      <p className="section-kicker">Kako brati rezultat</p>
      <h2>Kakovost in metodologija</h2>
      <p>
        Prikazana vrednost je zadnja razpoložljiva obdelana meritev NO₂ za
        izbrano statistično regijo, izračunana iz satelitskih produktov
        Sentinel-5P (TROPOMI) v enoti mol/m². Prikaz ni v realnem času.
      </p>
      <ul className="methodology-list">
        <li>
          Vrednost je satelitska regionalna ocena; en piksel pokriva približno
          3,5 × 5,5 km, zato podatkov ni smiselno brati kot ulične koncentracije.
        </li>
        <li>
          Uporabljen je kakovostni filter <code>qa_value &gt;= 0.75</code>;
          piksli pod pragom niso vključeni v izračun.
        </li>
        <li>
          Regionalna agregacija zmanjša vpliv posameznih pikslov in omogoča
          stabilnejšo primerjavo med regijami.
        </li>
        <li>
          Če regija nima dovolj veljavnih pikslov (npr. zaradi oblačnosti),
          aplikacija prikaže stanje brez podatkov in vrednosti ne izračuna.
        </li>
      </ul>
    </section>
  )
}

export default MethodologyCard
