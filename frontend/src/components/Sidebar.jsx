import { supportedLanguages, useLanguage } from '../i18n'

function Sidebar({ activeView = 'dashboard', onViewChange }) {
  const { language, setLanguage, t } = useLanguage()
  // Each item switches the main content area to a focused view (no scrolling).
  const navigationItems = [
    { id: 'overview', label: t('navOverview') },
    { id: 'trend', label: t('navTrend') },
    { id: 'comparison', label: t('navComparison') },
    { id: 'data', label: t('navDataExport') },
    { id: 'methodology', label: t('navMethodology') },
  ]

  function handleClick(item) {
    onViewChange?.(item.id)
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
