import L from 'leaflet'

function bindMapControl(element) {
  if (!element) return
  L.DomEvent.disableClickPropagation(element)
  L.DomEvent.disableScrollPropagation(element)
}

function MapZoomSlider({ label, max, min, onChange, value }) {
  const safeMin = Number.isFinite(min) ? Math.ceil(min) : 0
  const safeMax = Number.isFinite(max) ? Math.floor(max) : 18
  const safeValue = Number.isFinite(value) ? Math.round(value) : safeMin

  if (safeMax <= safeMin) return null

  return (
    <label className="map-zoom-slider" ref={bindMapControl}>
      <span className="sr-only">{label}</span>
      <input
        type="range"
        min={safeMin}
        max={safeMax}
        step="1"
        value={Math.min(Math.max(safeValue, safeMin), safeMax)}
        aria-label={label}
        onChange={event => onChange(Number(event.target.value))}
      />
    </label>
  )
}

export default MapZoomSlider
