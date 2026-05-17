function DataQualityCard() {
  return (
    <section className="card quality-info-card">
      <p className="section-kicker">Kakovost in interpretacija podatkov</p>
      <h2>Kako brati rezultat</h2>
      <p>
        Prikazana vrednost je zadnja razpoložljiva veljavna meritev NO₂ za
        izbrano statistično regijo. Podatki temeljijo na obdelanih Sentinel-5P
        produktih z uporabljenim pragom kakovosti <code>qa_value &gt;= 0.75</code>.
        Prikaz ne predstavlja meritev v realnem času.
      </p>
      <ul className="quality-notes">
        <li>
          Vrednosti so satelitske regionalne ocene NO₂, ne meritve na ravni
          ulice.
        </li>
        <li>
          Oblačnost in drugi pogoji opazovanja lahko zmanjšajo število
          veljavnih pikslov v posameznem Sentinel-5P produktu.
        </li>
        <li>
          Če za regijo ni dovolj veljavnih pikslov, aplikacija prikaže stanje
          brez podatkov in ne izračuna regionalne NO₂ vrednosti.
        </li>
        <li>
          Vsak zapis ima zabeležen čas meritve, izvorni Sentinel-5P produkt in
          status kakovosti, ki ga je smiselno upoštevati pri interpretaciji.
        </li>
      </ul>
    </section>
  )
}

export default DataQualityCard
