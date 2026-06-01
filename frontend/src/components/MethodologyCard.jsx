import { useLanguage } from '../i18n'

function MethodologyCard() {
  const { t } = useLanguage()

  return (
    <section className="card methodology-card">
      <p className="section-kicker">{t('methodology')}</p>
      <h2>{t('howToRead')}</h2>
      <p className="muted-text">{t('methodologyText1')}</p>
      <p className="muted-text">
        {t('methodologyText2').split('qa_value >= 0.75')[0]}
        <code>qa_value &gt;= 0.75</code>
        {t('methodologyText2').split('qa_value >= 0.75')[1]}
      </p>
    </section>
  )
}

export default MethodologyCard
