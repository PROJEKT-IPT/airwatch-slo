import { supportedLanguages, useLanguage } from '../i18n'

function Sidebar({ activeView = 'dashboard', onViewChange }) {
  const { language, setLanguage, t } = useLanguage()
  const navigationItems = [
    { id: 'dashboard', label: t('navOverview') },
    { label: t('navTrend'), target: 'trend-section' },
    { label: t('navComparison'), target: 'comparison-section' },
    { label: t('navDataExport'), target: 'details-section' },
  ]

  function handleClick(item) {
    if (item.id) {
      onViewChange?.(item.id)
      return
    }

    if (item.target) {
      // Section links live on the dashboard view; switch to it first, then
      // scroll once the dashboard has had a chance to render.
      onViewChange?.('dashboard')
      requestAnimationFrame(() => {
        const element = document.getElementById(item.target)
        element?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      })
    }
  }

  return (
    <aside className="sidebar">
      <div className="brand-block">
        <div className="brand-mark">AW</div>
        <div>
          <h1>AirWatch SLO</h1>
          <p>{t('brandSubtitle')}</p>
        </div>
      </div>

      <div className="language-switcher" aria-label={t('languageToggleLabel')}>
        {supportedLanguages.map(option => (
          <button
            key={option.code}
            type="button"
            className={language === option.code ? 'language-option language-option-active' : 'language-option'}
            aria-pressed={language === option.code}
            onClick={() => setLanguage(option.code)}
          >
            {option.label}
          </button>
        ))}
      </div>

      <nav className="sidebar-nav" aria-label={t('navMain')}>
        {navigationItems.map(item => (
          <button
            key={item.label}
            type="button"
            className={`nav-item ${item.id && item.id === activeView ? 'nav-item-active' : ''}`}
            disabled={item.disabled}
            aria-current={item.id && item.id === activeView ? 'page' : undefined}
            onClick={() => handleClick(item)}
          >
            <span>{item.label}</span>
          </button>
        ))}
      </nav>
    </aside>
  )
}

export default Sidebar
