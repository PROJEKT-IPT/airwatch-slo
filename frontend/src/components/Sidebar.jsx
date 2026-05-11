const navigationItems = [
  { id: 'dashboard', label: 'Pregled' },
  { id: 'admin', label: 'Admin/debug' },
  { id: 'regions', label: 'Regije', disabled: true },
  { label: 'Zgodovinski trend', soon: true },
  { label: 'Primerjava regij', soon: true },
  { label: 'Podatki & izvoz', soon: true },
  { label: 'O projektu', disabled: true },
]

function Sidebar({ activeView = 'dashboard', onViewChange }) {
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
            className={`nav-item ${item.id === activeView ? 'nav-item-active' : ''}`}
            disabled={item.soon || item.disabled}
            onClick={() => {
              if (item.id) {
                onViewChange?.(item.id)
              }
            }}
          >
            <span>{item.label}</span>
            {item.soon ? <span className="nav-soon">kmalu</span> : null}
          </button>
        ))}
      </nav>
    </aside>
  )
}

export default Sidebar
