const navigationItems = [
  { id: 'dashboard', label: 'Pregled' },
  { id: 'admin', label: 'Admin/debug' },
  { label: 'Zgodovinski trend', target: 'trend-section' },
  { label: 'Primerjava regij', target: 'comparison-section' },
  { label: 'Podatki & izvoz', target: 'details-section' },
  { label: 'O projektu', disabled: true },
]

function Sidebar({ activeView = 'dashboard', onViewChange }) {
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
          <p>Satelitsko spremljanje kakovosti zraka nad Slovenijo</p>
        </div>
      </div>

      <nav className="sidebar-nav" aria-label="Glavna navigacija">
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
