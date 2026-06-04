import { Fragment, useEffect, useState } from 'react'

import { supportedLanguages, useLanguage } from '../i18n'

const ACCESSIBILITY_STORAGE_KEY = 'airwatch-accessibility'

const defaultAccessibilitySettings = {
  largeText: false,
  highContrast: false,
  reduceMotion: false,
}

function readAccessibilitySettings() {
  if (typeof window === 'undefined') {
    return defaultAccessibilitySettings
  }

  try {
    const storedSettings = JSON.parse(window.localStorage.getItem(ACCESSIBILITY_STORAGE_KEY))
    return {
      ...defaultAccessibilitySettings,
      ...Object.fromEntries(
        Object.entries(storedSettings || {}).filter(([, value]) => typeof value === 'boolean'),
      ),
    }
  } catch {
    return defaultAccessibilitySettings
  }
}

function Icon({ name }) {
  const props = {
    width: 20,
    height: 20,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.8,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    'aria-hidden': true,
  }
  switch (name) {
    case 'overview':
      return (
        <svg {...props}>
          <path d="M3 10.5 12 3l9 7.5" />
          <path d="M5 9.5V21h14V9.5" />
          <path d="M9.5 21v-6h5v6" />
        </svg>
      )
    case 'trend':
      return (
        <svg {...props}>
          <path d="M3 17l5-5 4 3 6-7" />
          <circle cx="3" cy="17" r="1" />
          <circle cx="8" cy="12" r="1" />
          <circle cx="12" cy="15" r="1" />
          <circle cx="18" cy="8" r="1" />
        </svg>
      )
    case 'comparison':
      return (
        <svg {...props}>
          <path d="M5 20V10" />
          <path d="M12 20V4" />
          <path d="M19 20v-7" />
        </svg>
      )
    case 'data':
      return (
        <svg {...props}>
          <path d="M12 3v12" />
          <path d="M8 11l4 4 4-4" />
          <path d="M4 21h16" />
        </svg>
      )
    case 'methodology':
      return (
        <svg {...props}>
          <path d="M3 5.5A2.5 2.5 0 0 1 5.5 3H11v16H5.5A2.5 2.5 0 0 0 3 21.5z" />
          <path d="M21 5.5A2.5 2.5 0 0 0 18.5 3H13v16h5.5A2.5 2.5 0 0 1 21 21.5z" />
        </svg>
      )
    case 'satellite':
      return (
        <svg {...props}>
          <path stroke="none" d="M0 0h24v24H0z" fill="none" />
          <path d="M3.707 6.293l2.586 -2.586a1 1 0 0 1 1.414 0l5.586 5.586a1 1 0 0 1 0 1.414l-2.586 2.586a1 1 0 0 1 -1.414 0l-5.586 -5.586a1 1 0 0 1 0 -1.414" />
          <path d="M6 10l-3 3l3 3l3 -3" />
          <path d="M10 6l3 -3l3 3l-3 3" />
          <path d="M12 12l1.5 1.5" />
          <path d="M14.5 17a2.5 2.5 0 0 0 2.5 -2.5" />
          <path d="M15 21a6 6 0 0 0 6 -6" />
        </svg>
      )
    case 'about':
      return (
        <svg {...props}>
          <circle cx="12" cy="12" r="9" />
          <path d="M12 11v5" />
          <path d="M12 8h.01" />
        </svg>
      )
    case 'collapse':
      return (
        <svg {...props}>
          <path d="M11 7l-5 5 5 5" />
          <path d="M18 7l-5 5 5 5" />
        </svg>
      )
    case 'chevron':
      return (
        <svg {...props}>
          <path d="M6 9l6 6 6-6" />
        </svg>
      )
    default:
      return null
  }
}

// Localized date for the discreet "data updated" footer line (empty if absent).
function formatUpdatedDate(value, locale) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeZone: 'UTC' }).format(date)
}

function Sidebar({ activeView = 'overview', onViewChange, collapsed = false, onToggleCollapse, dataUpdatedAt = null }) {
  const { language, setLanguage, t, locale } = useLanguage()
  const [accessibilitySettings, setAccessibilitySettings] = useState(readAccessibilitySettings)
  const [accessibilityOpen, setAccessibilityOpen] = useState(false)
  const [mobileSettingsOpen, setMobileSettingsOpen] = useState(false)

  useEffect(() => {
    const root = document.documentElement

    root.classList.toggle('a11y-large-text', accessibilitySettings.largeText)
    root.classList.toggle('a11y-high-contrast', accessibilitySettings.highContrast)
    root.classList.toggle('a11y-reduce-motion', accessibilitySettings.reduceMotion)
    window.localStorage.setItem(ACCESSIBILITY_STORAGE_KEY, JSON.stringify(accessibilitySettings))
  }, [accessibilitySettings])

  useEffect(() => {
    function closeOnEscape(event) {
      if (event.key === 'Escape') {
        setMobileSettingsOpen(false)
      }
    }

    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [])

  const navigationItems = [
    { id: 'satellite', icon: 'satellite', label: t('navSatellite') },
    { id: 'overview', icon: 'overview', label: t('navOverview') },
    { id: 'trend', icon: 'trend', label: t('navTrend') },
    { id: 'comparison', icon: 'comparison', label: t('navComparison') },
    { id: 'data', icon: 'data', label: t('navDataExport') },
    { id: 'learn', icon: 'methodology', label: t('navLearn') },
  ]

  function navClass(id) {
    return `nav-item ${id === activeView ? 'nav-item-active' : ''}`
  }

  function toggleAccessibilitySetting(setting) {
    setAccessibilitySettings(currentSettings => ({
      ...currentSettings,
      [setting]: !currentSettings[setting],
    }))
  }

  function renderAccessibilityOptions() {
    return (
      <>
        <label className="accessibility-option">
          <input
            type="checkbox"
            checked={accessibilitySettings.largeText}
            onChange={() => toggleAccessibilitySetting('largeText')}
          />
          <span>{t('accessibilityLargeText')}</span>
        </label>
        <label className="accessibility-option">
          <input
            type="checkbox"
            checked={accessibilitySettings.highContrast}
            onChange={() => toggleAccessibilitySetting('highContrast')}
          />
          <span>{t('accessibilityHighContrast')}</span>
        </label>
        <label className="accessibility-option">
          <input
            type="checkbox"
            checked={accessibilitySettings.reduceMotion}
            onChange={() => toggleAccessibilitySetting('reduceMotion')}
          />
          <span>{t('accessibilityReduceMotion')}</span>
        </label>
      </>
    )
  }

  return (
    <aside className={`sidebar${collapsed ? ' sidebar--collapsed' : ''}`}>
      <div className="brand-block">
        <button
          type="button"
          className="brand-mark brand-settings-trigger"
          aria-label={t('brandMenuLabel')}
          aria-haspopup="menu"
          aria-expanded={mobileSettingsOpen}
          aria-controls="mobile-brand-popover"
          onClick={() => {
            setMobileSettingsOpen(open => {
              const nextOpen = !open
              if (nextOpen) {
                setAccessibilityOpen(false)
              }
              return nextOpen
            })
          }}
        >
          <img src="/logo_airwatch.png" alt="AirWatch SLO" width="46" height="46" />
        </button>
        <div className="brand-text">
          <h1>AirWatch SLO</h1>
          <p>{t('brandSubtitle')}</p>
        </div>
      </div>

      <div className="mobile-brand-popover" id="mobile-brand-popover" hidden={!mobileSettingsOpen}>
        <div className="mobile-language-switcher" role="group" aria-label={t('languageToggleLabel')}>
          {supportedLanguages.map((option, index) => (
            <Fragment key={option.code}>
              {index > 0 ? <span className="language-sep" aria-hidden="true" /> : null}
              <button
                type="button"
                className={language === option.code ? 'language-option language-option-active' : 'language-option'}
                aria-pressed={language === option.code}
                onClick={() => setLanguage(option.code)}
              >
                {option.label}
              </button>
            </Fragment>
          ))}
        </div>
        <section className="mobile-accessibility-panel" aria-label={t('accessibilityTitle')}>
          <button
            type="button"
            className="accessibility-toggle mobile-accessibility-toggle"
            aria-expanded={accessibilityOpen}
            aria-controls="mobile-accessibility-options"
            onClick={() => setAccessibilityOpen(open => !open)}
          >
            <span>{t('accessibilityTitle')}</span>
            <span className="accessibility-chevron" aria-hidden="true">
              <Icon name="chevron" />
            </span>
          </button>
          <div className="mobile-accessibility-options" id="mobile-accessibility-options" hidden={!accessibilityOpen}>
            {renderAccessibilityOptions()}
          </div>
        </section>
        <button
          type="button"
          className={`nav-item mobile-about-button ${activeView === 'about' ? 'nav-item-active' : ''}`}
          aria-current={activeView === 'about' ? 'page' : undefined}
          onClick={() => {
            setMobileSettingsOpen(false)
            onViewChange?.('about')
          }}
        >
          <span className="nav-icon">
            <Icon name="about" />
          </span>
          <span className="nav-label">{t('navAbout')}</span>
        </button>
        <button
          type="button"
          className={`nav-item mobile-about-button ${activeView === 'data' ? 'nav-item-active' : ''}`}
          aria-current={activeView === 'data' ? 'page' : undefined}
          onClick={() => {
            setMobileSettingsOpen(false)
            onViewChange?.('data')
          }}
        >
          <span className="nav-icon">
            <Icon name="data" />
          </span>
          <span className="nav-label">{t('mobileNavDataExport')}</span>
        </button>
      </div>

      <div className="sidebar-divider" />

      <div className="language-switcher" role="group" aria-label={t('languageToggleLabel')}>
        {supportedLanguages.map((option, index) => (
          <Fragment key={option.code}>
            {index > 0 ? <span className="language-sep" aria-hidden="true" /> : null}
            <button
              type="button"
              className={language === option.code ? 'language-option language-option-active' : 'language-option'}
              aria-pressed={language === option.code}
              onClick={() => setLanguage(option.code)}
            >
              {option.label}
            </button>
          </Fragment>
        ))}
      </div>

      <section className="accessibility-panel" aria-label={t('accessibilityTitle')}>
        <button
          type="button"
          className="accessibility-toggle"
          aria-expanded={accessibilityOpen}
          aria-controls="accessibility-options"
          onClick={() => setAccessibilityOpen(open => !open)}
        >
          <span>{t('accessibilityTitle')}</span>
          <span className="accessibility-chevron" aria-hidden="true">
            <Icon name="chevron" />
          </span>
        </button>
        <div className="accessibility-options" id="accessibility-options" hidden={!accessibilityOpen}>
          {renderAccessibilityOptions()}
        </div>
      </section>

      <nav className="sidebar-nav" aria-label={t('navMain')}>
        {navigationItems.map(item => (
          <button
            key={item.id}
            type="button"
            className={navClass(item.id)}
            data-view={item.id}
            aria-current={item.id === activeView ? 'page' : undefined}
            title={collapsed ? item.label : undefined}
            onClick={() => onViewChange?.(item.id)}
          >
            <span className="nav-icon">
              <Icon name={item.icon} />
            </span>
            <span className="nav-label">{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div className="sidebar-divider" />
        {formatUpdatedDate(dataUpdatedAt, locale) ? (
          <p className="sidebar-data-updated" title={t('dataUpdatedHint')}>
            <span className="sidebar-data-updated-label">{t('dataUpdated')}</span>
            <span>{formatUpdatedDate(dataUpdatedAt, locale)}</span>
          </p>
        ) : null}
        <button
          type="button"
          className={`nav-item nav-footer-item ${activeView === 'about' ? 'nav-item-active' : ''}`}
          data-view="about"
          aria-current={activeView === 'about' ? 'page' : undefined}
          title={collapsed ? t('navAbout') : undefined}
          onClick={() => onViewChange?.('about')}
        >
          <span className="nav-icon">
            <Icon name="about" />
          </span>
          <span className="nav-label">{t('navAbout')}</span>
        </button>
        <button
          type="button"
          className="nav-item nav-footer-item sidebar-collapse-toggle"
          aria-label={collapsed ? t('expandSidebar') : t('collapseSidebar')}
          aria-expanded={!collapsed}
          title={collapsed ? t('expandSidebar') : t('collapseSidebar')}
          onClick={() => onToggleCollapse?.()}
        >
          <span className="nav-icon">
            <Icon name="collapse" />
          </span>
          <span className="nav-label">{t('collapseSidebar')}</span>
        </button>
      </div>
    </aside>
  )
}

export default Sidebar
