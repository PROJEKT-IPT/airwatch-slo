import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { useEffect, useMemo, useRef } from 'react'

import { useLanguage } from '../i18n'

// Softer, environmental ramp: light yellow -> amber -> coral -> muted red.
const SEQUENTIAL_COLORS = ['#eef3c8', '#e3e08a', '#e8c65a', '#e3a23e', '#dd7f4f', '#cb5f4b', '#a8453d']
const MISSING_COLOR = '#cfd6dc'
const LEGEND_STEP_COUNT = 7

// Major Slovenian cities for orientation (decoration only — not measurements).
const MAJOR_CITIES = [
  { name: 'Ljubljana', lat: 46.0569, lng: 14.5058 },
  { name: 'Maribor', lat: 46.5547, lng: 15.6459 },
  { name: 'Celje', lat: 46.2309, lng: 15.2604 },
  { name: 'Kranj', lat: 46.2389, lng: 14.3556 },
  { name: 'Koper', lat: 45.5481, lng: 13.7302 },
  { name: 'Novo mesto', lat: 45.801, lng: 15.171 },
  { name: 'Velenje', lat: 46.3592, lng: 15.1107 },
  { name: 'Nova Gorica', lat: 45.956, lng: 13.6483 },
  { name: 'Murska Sobota', lat: 46.6625, lng: 16.1664 },
  { name: 'Ptuj', lat: 46.4199, lng: 15.87 },
]

// Click/keyboard/hover wiring for one region polygon. Kept at module level so
// the map-building effect stays simple. No text on hover — only a highlight.
function bindRegionInteractions(feature, layer, { onRegionSelect, selectedRegionRef }) {
  const regionCode = feature.properties.region_code

  layer.on({
    click: () => onRegionSelect(regionCode),
    keypress: event => {
      const key = event.originalEvent?.key
      if (key === 'Enter' || key === ' ') onRegionSelect(regionCode)
    },
    mouseout: event => event.target.setStyle(getRegionStyle(feature.properties, selectedRegionRef.current)),
    mouseover: event => event.target.setStyle({ color: '#16291d', fillOpacity: 0.95, weight: 2.4 }),
  })
}

// Create the Leaflet map + base tile layer once; return the map instance.
function ensureLeafletMap(element, mapRef, baseLayerRef) {
  if (!mapRef.current) {
    mapRef.current = L.map(element, {
      attributionControl: true,
      doubleClickZoom: true,
      dragging: true,
      keyboard: true,
      scrollWheelZoom: true,
      zoomControl: true,
    })
    // Keep the attribution clear of the floating panel (bottom-right).
    if (mapRef.current.attributionControl) {
      mapRef.current.attributionControl.setPosition('topright')
    }
  }

  const map = mapRef.current
  if (!baseLayerRef.current) {
    baseLayerRef.current = L.tileLayer(
      'https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png',
      {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
        className: 'regional-map-base-layer',
        maxZoom: 18,
        opacity: 0.42,
      },
    ).addTo(map)
  }
  return map
}

// Add a "reset to full Slovenia" control once; it re-fits the stored bounds.
function ensureResetControl(map, resetControlRef, boundsRef, label) {
  if (resetControlRef.current) {
    resetControlRef.current.getContainer()?.setAttribute('title', label)
    return
  }

  const control = L.control({ position: 'topleft' })
  control.onAdd = () => {
    const button = L.DomUtil.create('button', 'map-reset-btn')
    button.type = 'button'
    button.title = label
    button.setAttribute('aria-label', label)
    button.innerHTML =
      '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/></svg>'
    L.DomEvent.disableClickPropagation(button)
    L.DomEvent.on(button, 'click', event => {
      L.DomEvent.preventDefault(event)
      if (boundsRef.current?.isValid()) {
        map.fitBounds(boundsRef.current, getResponsiveFitBoundsOptions(map.getContainer()))
      }
    })
    return button
  }
  control.addTo(map)
  resetControlRef.current = control
}

// Small div-icon for a city: a dot plus an always-on name label.
function buildCityIcon(name) {
  return L.divIcon({
    className: 'city-marker-icon',
    html:
      '<span class="city-dot" aria-hidden="true"></span>' +
      `<span class="city-label">${escapeHtml(name)}</span>`,
    iconAnchor: [4, 4],
    iconSize: null,
  })
}

// Add small, non-interactive markers for the major cities so clicks still
// reach the region polygon underneath. Created once and kept on top.
function ensureCityMarkers(map, cityLayerRef) {
  if (cityLayerRef.current) return

  cityLayerRef.current = L.layerGroup(
    MAJOR_CITIES.map(city =>
      L.marker([city.lat, city.lng], {
        icon: buildCityIcon(city.name),
        interactive: false,
        keyboard: false,
      }),
    ),
  ).addTo(map)
}

// (Re)build the region polygons layer and fit the map to it on first render.
function renderRegionLayer(map, refs, params) {
  const { geoJsonLayerRef, fittedGeometryKeyRef, selectedRegionRef, boundsRef, resetControlRef, cityLayerRef } = refs
  const { mapRegions, mapScale, mapGeometryKey, onRegionSelect, t } = params

  if (geoJsonLayerRef.current) {
    geoJsonLayerRef.current.removeFrom(map)
  }

  geoJsonLayerRef.current = L.geoJSON(
    buildFeatureCollection(mapRegions, { maxMicromol: mapScale.max, minMicromol: mapScale.min }),
    {
      style: feature => getRegionStyle(feature.properties, selectedRegionRef.current),
      onEachFeature: (feature, layer) =>
        bindRegionInteractions(feature, layer, { onRegionSelect, selectedRegionRef }),
    },
  ).addTo(map)

  geoJsonLayerRef.current.eachLayer(layer => emphasizeIfSelected(layer, selectedRegionRef.current))
  ensureCityMarkers(map, cityLayerRef)

  const bounds = geoJsonLayerRef.current.getBounds()
  if (bounds.isValid()) {
    boundsRef.current = bounds
    ensureResetControl(map, resetControlRef, boundsRef, t('mapResetView'))
    if (fittedGeometryKeyRef.current !== mapGeometryKey) {
      map.fitBounds(bounds, getResponsiveFitBoundsOptions(map.getContainer()))
      fittedGeometryKeyRef.current = mapGeometryKey
    }
  }
}

// Apply the selected emphasis (glow class + bring to front) to one layer.
function emphasizeIfSelected(layer, selectedRegionCode) {
  const isSelected = layer.feature?.properties?.region_code === selectedRegionCode
  layer.setStyle(getRegionStyle(layer.feature?.properties, selectedRegionCode))
  const element = layer.getElement?.()
  if (element) element.classList.toggle('region-selected', isSelected)
  if (isSelected) layer.bringToFront()
}

// Loading / error / empty placeholder shown in place of the Leaflet map.
function MapStateMessage({ isLoading, error, t }) {
  if (isLoading) {
    return (
      <div className="map-state" role="status" aria-live="polite">
        <div className="loading-line loading-line-title" />
        <div className="loading-line" />
        <p>{t('loadingMap')}</p>
      </div>
    )
  }
  if (error) {
    return (
      <div className="map-state map-state-error" role="alert">
        <h3>{t('mapErrorTitle')}</h3>
        <p>{error}</p>
      </div>
    )
  }
  return (
    <div className="map-state">
      <h3>{t('noGeometriesTitle')}</h3>
      <p>{t('noGeometriesText')}</p>
    </div>
  )
}

function RegionalMap({
  regions,
  geometries,
  selectedRegionCode,
  onRegionSelect,
  isLoading,
  error,
  fullScreen = false,
  overlay = null,
}) {
  const { t } = useLanguage()
  const mapElementRef = useRef(null)
  const mapRef = useRef(null)
  const baseLayerRef = useRef(null)
  const geoJsonLayerRef = useRef(null)
  const fittedGeometryKeyRef = useRef(null)
  const boundsRef = useRef(null)
  const resetControlRef = useRef(null)
  const cityLayerRef = useRef(null)
  const selectedRegionRef = useRef(selectedRegionCode)
  const mapRegions = useMemo(() => buildMapRegions(regions, geometries), [regions, geometries])
  const mapGeometryKey = useMemo(() => buildMapGeometryKey(mapRegions), [mapRegions])
  const mapScale = useMemo(() => buildMapScale(mapRegions), [mapRegions])

  useEffect(() => {
    selectedRegionRef.current = selectedRegionCode

    if (!geoJsonLayerRef.current) return

    geoJsonLayerRef.current.eachLayer(layer => emphasizeIfSelected(layer, selectedRegionCode))
  }, [selectedRegionCode])

  useEffect(() => {
    if (isLoading || error || mapRegions.length === 0 || !mapElementRef.current) {
      return undefined
    }

    const map = ensureLeafletMap(mapElementRef.current, mapRef, baseLayerRef)
    renderRegionLayer(
      map,
      { geoJsonLayerRef, fittedGeometryKeyRef, selectedRegionRef, boundsRef, resetControlRef, cityLayerRef },
      { mapRegions, mapScale, mapGeometryKey, onRegionSelect, t },
    )
    setTimeout(() => {
      map.invalidateSize()
      // Re-apply the selected emphasis once the SVG paths are in the DOM
      // (getElement() can be null immediately after the layer is added).
      geoJsonLayerRef.current?.eachLayer(layer => emphasizeIfSelected(layer, selectedRegionRef.current))
    }, 0)

    return undefined
  }, [error, isLoading, mapGeometryKey, mapRegions, mapScale, onRegionSelect, t])

  useEffect(
    () => () => {
      if (mapRef.current) {
        mapRef.current.remove()
        mapRef.current = null
        resetControlRef.current = null
        cityLayerRef.current = null
      }
    },
    [],
  )

  return (
    <section className={`card map-card${fullScreen ? ' map-card--full' : ''}`}>
      {!fullScreen ? (
        <div className="card-heading">
          <div>
            <p className="section-kicker">{t('spatialOverview')}</p>
            <h2>{t('mapTitle')}</h2>
          </div>
          <span className="map-tag">Leaflet</span>
        </div>
      ) : null}

      <div className={`regional-map${fullScreen ? ' regional-map--full' : ''}`} aria-label={t('mapAria')}>
        {!isLoading && !error && mapRegions.length > 0 ? (
          <>
            <div
              ref={mapElementRef}
              className="regional-leaflet-map"
              role="application"
              aria-label={t('interactiveMapAria')}
            />
            <div className="map-region-controls" aria-label={t('mapControlsAria')}>
              {mapRegions.map(region => (
                <button
                  key={region.region_code}
                  type="button"
                  aria-pressed={region.region_code === selectedRegionCode}
                  onClick={() => onRegionSelect(region.region_code)}
                >
                  {t('selectMapRegion', { region: region.region_name })}
                </button>
              ))}
            </div>
          </>
        ) : (
          <MapStateMessage isLoading={isLoading} error={error} t={t} />
        )}
      </div>

      {!isLoading && !error && mapRegions.length > 0 ? (
        <MapLegend fullScreen={fullScreen} mapScale={mapScale} t={t} />
      ) : null}

      {fullScreen && overlay ? <div className="map-overlay-panel">{overlay}</div> : null}
    </section>
  )
}

// NO₂ value gradient legend (relative scale across the shown regions).
function MapLegend({ fullScreen, mapScale, t }) {
  return (
    <div className={`map-legend${fullScreen ? ' map-legend--float' : ''}`} aria-label={t('mapLegendAria')}>
      <div className="map-legend-heading">
        <span>{t('mapModeValue')}</span>
        <strong>{t('mapLegendRelativeScale')}</strong>
      </div>
      <div className="map-gradient-legend" aria-hidden="true">
        {SEQUENTIAL_COLORS.map((color, index) => (
          <span key={`${color}-${index}`} style={{ backgroundColor: color }} />
        ))}
      </div>
      <div className="map-legend-values" aria-hidden="true">
        <div className="map-legend-thresholds map-legend-thresholds--dynamic">
          {mapScale.absoluteLabels.map((label, index) => (
            <span key={`${label}-${index}`}>{label}</span>
          ))}
        </div>
        <span className="map-legend-unit">{getMicromolUnit()}</span>
      </div>
      <p className="map-legend-hint">{t('mapLegendValueHint')}</p>
      <div className="map-legend-missing">
        <span className="map-legend-swatch map-legend-swatch--missing" aria-hidden="true" />
        <span>{t('noValidValue')}</span>
      </div>
    </div>
  )
}

function buildMapRegions(regions, geometries) {
  const summariesByCode = new Map(regions.map(region => [region.region_code, region]))

  return geometries
    .map(regionGeometry => ({
      ...regionGeometry,
      ...summariesByCode.get(regionGeometry.region_code),
    }))
    .filter(region => region.region_code && hasGeometry(region.geometry))
}

function buildMapGeometryKey(regions) {
  return regions
    .map(region => `${region.region_code}:${getGeometryCoordinateSignature(region.geometry)}`)
    .sort()
    .join('|')
}

function getGeometryCoordinateSignature(geometry) {
  const bounds = getGeometryCoordinateBounds(geometry?.coordinates)
  if (!bounds) return 'empty'

  return [bounds.minLng, bounds.minLat, bounds.maxLng, bounds.maxLat, bounds.count]
    .map(value => (typeof value === 'number' ? value.toFixed(4) : value))
    .join(',')
}

function getGeometryCoordinateBounds(coordinates) {
  const bounds = {
    count: 0,
    maxLat: -Infinity,
    maxLng: -Infinity,
    minLat: Infinity,
    minLng: Infinity,
  }

  collectCoordinateBounds(coordinates, bounds)
  return bounds.count > 0 ? bounds : null
}

function collectCoordinateBounds(value, bounds) {
  if (!Array.isArray(value)) return

  if (value.length >= 2 && Number.isFinite(Number(value[0])) && Number.isFinite(Number(value[1]))) {
    const lng = Number(value[0])
    const lat = Number(value[1])
    bounds.count += 1
    bounds.maxLat = Math.max(bounds.maxLat, lat)
    bounds.maxLng = Math.max(bounds.maxLng, lng)
    bounds.minLat = Math.min(bounds.minLat, lat)
    bounds.minLng = Math.min(bounds.minLng, lng)
    return
  }

  value.forEach(item => collectCoordinateBounds(item, bounds))
}

function getResponsiveFitBoundsOptions(mapElement) {
  const rect = mapElement?.getBoundingClientRect()
  const width = rect?.width || 360
  const height = rect?.height || 260
  const shortSide = Math.min(width, height)
  const padding = Math.round(Math.min(Math.max(shortSide * 0.065, 8), 34))

  return { padding: [padding, padding] }
}

function buildFeatureCollection(regions, mapOptions) {
  const { maxMicromol, minMicromol } = mapOptions

  return {
    type: 'FeatureCollection',
    features: regions.map(region => ({
      type: 'Feature',
      geometry: region.geometry,
      properties: {
        region_code: region.region_code,
        region_name: region.region_name,
        quality_status: region.quality_status,
        value_mean: region.value_mean,
        max_micromol: maxMicromol,
        min_micromol: minMicromol,
        pixel_count_valid: region.pixel_count_valid,
        unit: region.unit,
      },
    })),
  }
}

function hasGeometry(geometry) {
  if (!geometry) return false

  if (geometry.type === 'Polygon') {
    return (geometry.coordinates || []).some(ring => ring.length >= 3)
  }

  if (geometry.type === 'MultiPolygon') {
    return (geometry.coordinates || []).some(polygon => polygon.some(ring => ring.length >= 3))
  }

  return false
}

function getRegionStyle(properties, selectedRegionCode) {
  const isSelected = properties?.region_code === selectedRegionCode

  return {
    color: isSelected ? '#16291d' : 'rgba(47, 58, 85, 0.42)',
    fillColor: getFillColor(properties),
    fillOpacity: isSelected ? 0.95 : 0.74,
    lineCap: 'round',
    lineJoin: 'round',
    opacity: 1,
    weight: isSelected ? 4 : 1.1,
  }
}

function buildMapScale(regions) {
  const values = regions
    .filter(region => region.quality_status === 'valid')
    .map(region => molToMicromol(region.value_mean))
    .filter(Number.isFinite)

  if (values.length === 0) {
    return {
      absoluteLabels: Array.from({ length: LEGEND_STEP_COUNT }, () => '0.0'),
      max: null,
      min: null,
    }
  }

  const min = Math.min(...values)
  const max = Math.max(...values)
  return { absoluteLabels: buildLegendLabels(min, max), max, min }
}

function getFillColor(properties) {
  return absoluteFillColor(properties?.value_mean, properties?.min_micromol, properties?.max_micromol)
}

function absoluteFillColor(value, minMicromol, maxMicromol) {
  const micromolValue = molToMicromol(value)
  const minValue = Number(minMicromol)
  const maxValue = Number(maxMicromol)
  if (!Number.isFinite(micromolValue) || !Number.isFinite(minValue) || !Number.isFinite(maxValue)) {
    return MISSING_COLOR
  }

  if (maxValue === minValue) return SEQUENTIAL_COLORS[Math.floor(SEQUENTIAL_COLORS.length / 2)]
  return getColorFromScale((micromolValue - minValue) / (maxValue - minValue), SEQUENTIAL_COLORS)
}

function getColorFromScale(ratio, colors) {
  const safeRatio = Math.min(Math.max(Number(ratio), 0), 1)
  const index = Math.min(Math.floor(safeRatio * colors.length), colors.length - 1)
  return colors[index]
}

function molToMicromol(value) {
  const numberValue = Number(value)
  return Number.isFinite(numberValue) ? numberValue * 1_000_000 : NaN
}

function buildLegendLabels(min, max) {
  if (!Number.isFinite(min) || !Number.isFinite(max)) {
    return Array.from({ length: LEGEND_STEP_COUNT }, () => '0.0')
  }

  if (min === max) {
    return Array.from({ length: LEGEND_STEP_COUNT }, () => formatLegendNumber(min))
  }

  const step = (max - min) / (LEGEND_STEP_COUNT - 1)
  return Array.from({ length: LEGEND_STEP_COUNT }, (_, index) => formatLegendNumber(min + step * index))
}

function formatLegendNumber(value) {
  const rounded = Math.abs(value) < 0.05 ? 0 : value
  return rounded.toFixed(1)
}

function getMicromolUnit() {
  return 'µmol/m²'
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}

export default RegionalMap
