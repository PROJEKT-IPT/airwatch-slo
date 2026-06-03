import { useLanguage } from '../i18n'

function MethodologyCard() {
  const { t } = useLanguage()

  const steps = [
    t('methStep1'),
    t('methStep2'),
    t('methStep3'),
    t('methStep4'),
    t('methStep5'),
  ]

  return (
    <div className="dashboard-view methodology-view">
      <section className="card methodology-card">
        <p className="section-kicker">{t('methodology')}</p>
        <h2>{t('methAppTitle')}</h2>
        <p className="muted-text">{t('methAppText')}</p>
      </section>

      <div className="methodology-grid">
        <section className="card methodology-card">
          <h2>{t('methNo2Title')}</h2>
          <p className="muted-text">{t('methNo2Text')}</p>
          <p className="muted-text">{t('methNo2Effects')}</p>
        </section>

        <section className="card methodology-card">
          <h2>{t('methHowTitle')}</h2>
          <ol className="methodology-steps">
            {steps.map((step, index) => (
              <li key={index}>
                <span className="methodology-step-number">{index + 1}</span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
        </section>
      </div>

      <section className="card methodology-card">
        <h2>{t('howToRead')}</h2>
        <p className="muted-text">{t('methValueText')}</p>
        <p className="muted-text">
          {t('methodologyText2').split('qa_value >= 0.75')[0]}
          <code>qa_value &gt;= 0.75</code>
          {t('methodologyText2').split('qa_value >= 0.75')[1]}
        </p>
        <p className="muted-text">{t('methColorsText')}</p>
      </section>

      <section className="card methodology-card">
        <h2>{t('methLimitsTitle')}</h2>
        <p className="muted-text">{t('methLimitsText')}</p>
        <p className="muted-text">{t('methodologyText3')}</p>
      </section>
    </div>
  )
}

export default MethodologyCard
