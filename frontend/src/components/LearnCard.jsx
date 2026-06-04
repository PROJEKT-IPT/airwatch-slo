import { useLanguage } from '../i18n'

// Simplified, plain-language view for the pedagogical/educational audience:
// what we show, how to read the map, a worked example, and the caveats.
function LearnCard() {
  const { t } = useLanguage()

  return (
    <div className="dashboard-view methodology-view">
      <section className="card methodology-card">
        <p className="section-kicker">{t('learnKicker')}</p>
        <h2>{t('learnWhatTitle')}</h2>
        <p className="muted-text">{t('learnWhatText')}</p>
      </section>

      <div className="methodology-grid">
        <section className="card methodology-card">
          <h2>{t('learnReadTitle')}</h2>
          <p className="muted-text">{t('learnReadText')}</p>
        </section>

        <section className="card methodology-card">
          <h2>{t('learnExampleTitle')}</h2>
          <p className="muted-text">{t('learnExampleText')}</p>
        </section>
      </div>

      <section className="card methodology-card">
        <h2>{t('learnLimitsTitle')}</h2>
        <p className="muted-text">{t('learnLimitsText')}</p>
      </section>
    </div>
  )
}

export default LearnCard
