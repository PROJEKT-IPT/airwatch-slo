import { useLanguage } from '../i18n'

// Key facts shown as compact tiles in the hero (label + value pairs from i18n).
const FACTS = [
  ['satFactInstrumentLabel', 'satFactInstrumentValue'],
  ['satFactLaunchLabel', 'satFactLaunchValue'],
  ['satFactOrbitLabel', 'satFactOrbitValue'],
  ['satFactResolutionLabel', 'satFactResolutionValue'],
]

// Pollutants/gases TROPOMI can retrieve. NO₂ is highlighted as our focus;
// the rest are shown for context. Formulas are language-neutral.
const GASES = ['NO₂', 'O₃', 'SO₂', 'CO', 'CH₄', 'HCHO']

function SatelliteCard() {
  const { t } = useLanguage()

  return (
    <section className="dashboard-view satellite-view" aria-label={t('navSatellite')}>
      <section className="card satellite-hero">
        <p className="section-kicker">Copernicus Sentinel-5P</p>
        <h2>{t('satWhatTitle')}</h2>
        <p className="muted-text satellite-intro">{t('satIntro')}</p>
        <div className="satellite-facts">
          {FACTS.map(([labelKey, valueKey]) => (
            <div className="info-tile" key={labelKey}>
              <span>{t(labelKey)}</span>
              <strong>{t(valueKey)}</strong>
            </div>
          ))}
        </div>
      </section>

      <div className="satellite-grid">
        <section className="card">
          <h2>{t('satWhereTitle')}</h2>
          <p className="muted-text">{t('satWhereText')}</p>
        </section>

        <section className="card">
          <h2>{t('satDataTitle')}</h2>
          <p className="muted-text">{t('satDataText')}</p>
          <div className="satellite-chips">
            {GASES.map(gas => (
              <span key={gas} className={`region-chip${gas === 'NO₂' ? ' quality-valid' : ''}`}>
                {gas}
              </span>
            ))}
            <span className="region-chip">{t('satAerosolsClouds')}</span>
          </div>
          <p className="muted-text satellite-focus">{t('satDataFocus')}</p>
        </section>
      </div>

      <section className="card">
        <h2>{t('satProcessTitle')}</h2>
        <p className="muted-text">{t('satProcessText')}</p>
        <p className="provenance-note">{t('satNotRealTime')}</p>
      </section>
    </section>
  )
}

export default SatelliteCard
