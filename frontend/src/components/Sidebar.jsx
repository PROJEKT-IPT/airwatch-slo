const navigationItems = [
  { label: 'Pregled', active: true },
  { label: 'Regije' },
  { label: 'Zgodovinski trend', soon: true },
  { label: 'Primerjava regij', soon: true },
  { label: 'Podatki & izvoz', soon: true },
  { label: 'O projektu' },
]

function Sidebar() {
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
            className={`nav-item ${item.active ? 'nav-item-active' : ''}`}
            disabled={!item.active}
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
