import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { useEffect, useMemo, useRef, useState } from 'react'

import { useLanguage } from '../i18n'
import MapZoomSlider from './MapZoomSlider'

// Softer, environmental ramp: light yellow -> amber -> coral -> muted red.
const SEQUENTIAL_COLORS = ['#eef3c8', '#e3e08a', '#e8c65a', '#e3a23e', '#dd7f4f', '#cb5f4b', '#a8453d']
// Diverging ramp for the "deviation from the average" mode: blue below the
// regional mean -> neutral -> red above it.
const DEVIATION_COLORS = ['#2166ac', '#67a9cf', '#d1e5f0', '#f7f7f7', '#fddbc7', '#ef8a62', '#b2182b']
const MISSING_COLOR = '#cfd6dc'
const LEGEND_STEP_COUNT = 7

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
    mouseover: event => event.target.setStyle({ color: '#16291d', fillOpacity: 0.78, weight: 3.2 }),
  })
}

const CARTO_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'

// Create the Leaflet map, a real (labelled) base map, and a labels-on-top pane
// once; return the map instance. The labels pane sits above the choropleth fill
// (z-index 450) but below our region-capital markers (markerPane, z-index 600),
// so town names stay readable while the capitals stay on top.
function ensureLeafletMap(element, mapRef, baseLayerRef) {
  if (!mapRef.current) {
    mapRef.current = L.map(element, {
      attributionControl: false,
      doubleClickZoom: true,
      dragging: true,
      keyboard: true,
      scrollWheelZoom: true,
      zoomControl: false,
    })
    const labelsPane = mapRef.current.createPane('regionLabels')
    labelsPane.style.zIndex = 450
    labelsPane.style.pointerEvents = 'none'
  }

  const map = mapRef.current
  if (!baseLayerRef.current) {
    baseLayerRef.current = L.tileLayer(
      'https://{s}.basemaps.cartocdn.com/rastertiles/voyager_nolabels/{z}/{x}/{y}{r}.png',
      { attribution: CARTO_ATTRIBUTION, className: 'regional-map-base-layer', maxZoom: 18 },
    ).addTo(map)
    // Place/road labels drawn on top of the coloured regions.
    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager_only_labels/{z}/{x}/{y}{r}.png', {
      maxZoom: 18,
      pane: 'regionLabels',
    }).addTo(map)
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

// (Re)build the region polygons layer and fit the map to it on first render.
function renderRegionLayer(map, refs, params) {
  const { geoJsonLayerRef, fittedGeometryKeyRef, selectedRegionRef, boundsRef, resetControlRef } = refs
  const { mapRegions, mapScale, mapGeometryKey, onRegionSelect, showDeviations, t } = params

  if (geoJsonLayerRef.current) {
    geoJsonLayerRef.current.removeFrom(map)
  }

  geoJsonLayerRef.current = L.geoJSON(
    buildFeatureCollection(mapRegions, {
      averageMicromol: mapScale.average,
      maxAbsDeviationMicromol: mapScale.maxAbsDeviation,
      maxMicromol: mapScale.max,
      minMicromol: mapScale.min,
      showDeviations,
    }),
    {
      style: feature => getRegionStyle(feature.properties, selectedRegionRef.current),
      onEachFeature: (feature, layer) =>
        bindRegionInteractions(feature, layer, { onRegionSelect, selectedRegionRef }),
    },
  ).addTo(map)

  geoJsonLayerRef.current.eachLayer(layer => emphasizeIfSelected(layer, selectedRegionRef.current))

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
  const selectedRegionRef = useRef(selectedRegionCode)
  const [showDeviations, setShowDeviations] = useState(false)
  const [zoomState, setZoomState] = useState({ max: 18, min: 0, ready: false, value: 0 })
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
      { geoJsonLayerRef, fittedGeometryKeyRef, selectedRegionRef, boundsRef, resetControlRef },
      { mapRegions, mapScale, mapGeometryKey, onRegionSelect, showDeviations, t },
    )

    const syncZoomState = () => setZoomState(readLeafletZoomState(map))
    syncZoomState()
    map.on('zoomend zoomlevelschange', syncZoomState)

    setTimeout(() => {
      map.invalidateSize()
      // Re-apply the selected emphasis once the SVG paths are in the DOM
      // (getElement() can be null immediately after the layer is added).
      geoJsonLayerRef.current?.eachLayer(layer => emphasizeIfSelected(layer, selectedRegionRef.current))
      syncZoomState()
    }, 0)

    return () => {
      map.off('zoomend zoomlevelschange', syncZoomState)
    }
  }, [error, isLoading, mapGeometryKey, mapRegions, mapScale, onRegionSelect, showDeviations, t])

  function handleZoomChange(nextZoom) {
    setZoomState(currentState => ({ ...currentState, value: nextZoom }))
    mapRef.current?.setZoom(nextZoom)
  }

  useEffect(
    () => () => {
      if (mapRef.current) {
        mapRef.current.remove()
        mapRef.current = null
        resetControlRef.current = null
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
            {zoomState.ready ? (
              <MapZoomSlider
                label={t('mapZoomLabel')}
                max={zoomState.max}
                min={zoomState.min}
                value={zoomState.value}
                onChange={handleZoomChange}
              />
            ) : null}
          </>
        ) : (
          <MapStateMessage isLoading={isLoading} error={error} t={t} />
        )}
      </div>

      {!isLoading && !error && mapRegions.length > 0 ? (
        <MapLegend
          fullScreen={fullScreen}
          mapScale={mapScale}
          showDeviations={showDeviations}
          onToggle={() => setShowDeviations(value => !value)}
          t={t}
        />
      ) : null}

      {fullScreen && overlay ? <div className="map-overlay-panel">{overlay}</div> : null}
    </section>
  )
}

// Color legend with a switch between absolute NO₂ values and deviation from the
// regional average (relative scale across the shown regions).
function MapLegend({ fullScreen, mapScale, showDeviations, onToggle, t }) {
  const view = getLegendView(showDeviations, mapScale, t)

  return (
    <div className={`map-legend${fullScreen ? ' map-legend--float' : ''}`} aria-label={t('mapLegendAria')}>
      <div className="map-legend-controls">
        <button type="button" className="map-mode-toggle" aria-pressed={showDeviations} onClick={onToggle}>
          {showDeviations ? t('showValues') : t('showDeviations')}
        </button>
      </div>
      <div className="map-legend-heading">
        <span>{view.metric}</span>
        <strong>{view.scale}</strong>
      </div>
      <div className={`map-gradient-legend ${view.gradientClass}`} aria-hidden="true">
        {view.colors.map((color, index) => (
          <span key={`${color}-${index}`} style={{ backgroundColor: color }} />
        ))}
      </div>
      <div className="map-legend-values" aria-hidden="true">
        <div className="map-legend-thresholds map-legend-thresholds--dynamic">
          {view.labels.map((label, index) => (
            <span key={`${label}-${index}`}>{label}</span>
          ))}
        </div>
        <span className="map-legend-unit">{getMicromolUnit()}</span>
      </div>
      <p className="map-legend-hint">{view.hint}</p>
      <div className="map-legend-missing">
        <span className="map-legend-swatch map-legend-swatch--missing" aria-hidden="true" />
        <span>{t('noValidValue')}</span>
      </div>
    </div>
  )
}

// Mode-dependent legend content, kept out of the component to stay flat.
function getLegendView(showDeviations, mapScale, t) {
  if (showDeviations) {
    return {
      colors: DEVIATION_COLORS,
      gradientClass: 'map-gradient-legend--deviation',
      hint: t('mapLegendDeviationHint'),
      labels: mapScale.deviationLabels,
      metric: t('mapLegendDeviationMetric'),
      scale: t('mapLegendDeviationScale', { mean: formatAverageLabel(mapScale.average) }),
    }
  }

  return {
    colors: SEQUENTIAL_COLORS,
    gradientClass: 'map-gradient-legend--absolute',
    hint: t('mapLegendValueHint'),
    labels: mapScale.absoluteLabels,
    metric: t('mapModeValue'),
    scale: t('mapLegendRelativeScale'),
  }
}

function readLeafletZoomState(map) {
  return {
    max: normalizeZoomLimit(map.getMaxZoom(), 18),
    min: normalizeZoomLimit(map.getMinZoom(), 0),
    ready: true,
    value: normalizeZoomLimit(map.getZoom(), 0),
  }
}

function normalizeZoomLimit(value, fallback) {
  return Number.isFinite(value) ? value : fallback
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
  const { averageMicromol, maxAbsDeviationMicromol, maxMicromol, minMicromol, showDeviations } = mapOptions

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
        color_mode: showDeviations ? 'deviation' : 'absolute',
        max_micromol: maxMicromol,
        min_micromol: minMicromol,
        average_micromol: averageMicromol,
        deviation_micromol: getDeviationMicromol(region.value_mean, averageMicromol),
        max_abs_deviation_micromol: maxAbsDeviationMicromol,
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
    color: isSelected ? '#16291d' : '#2f3a4f',
    fillColor: getFillColor(properties),
    fillOpacity: isSelected ? 0.82 : 0.6,
    lineCap: 'round',
    lineJoin: 'round',
    opacity: 1,
    weight: isSelected ? 4.5 : 2.4,
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
      average: null,
      deviationLabels: Array.from({ length: LEGEND_STEP_COUNT }, () => '0.0'),
      max: null,
      maxAbsDeviation: null,
      min: null,
    }
  }

  const average = values.reduce((sum, value) => sum + value, 0) / values.length
  const maxAbsDeviation = Math.max(...values.map(value => Math.abs(value - average))) || 0
  const min = Math.min(...values)
  const max = Math.max(...values)

  return {
    absoluteLabels: buildLegendLabels(min, max),
    average,
    deviationLabels: buildLegendLabels(-maxAbsDeviation, maxAbsDeviation, { forceSign: true }),
    max,
    maxAbsDeviation,
    min,
  }
}

function getDeviationMicromol(value, averageMicromol) {
  const micromolValue = molToMicromol(value)
  const averageValue = Number(averageMicromol)
  if (!Number.isFinite(micromolValue) || !Number.isFinite(averageValue)) return null
  return micromolValue - averageValue
}

function getFillColor(properties) {
  if (properties?.color_mode === 'deviation') {
    return deviationFillColor(properties?.deviation_micromol, properties?.max_abs_deviation_micromol)
  }
  return absoluteFillColor(properties?.value_mean, properties?.min_micromol, properties?.max_micromol)
}

function deviationFillColor(deviationMicromol, maxAbsDeviationMicromol) {
  const deviationValue = Number(deviationMicromol)
  const maxAbsValue = Number(maxAbsDeviationMicromol)
  if (!Number.isFinite(deviationValue) || !Number.isFinite(maxAbsValue)) return MISSING_COLOR
  if (maxAbsValue === 0) return DEVIATION_COLORS[Math.floor(DEVIATION_COLORS.length / 2)]
  return getColorFromScale((deviationValue + maxAbsValue) / (2 * maxAbsValue), DEVIATION_COLORS)
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

function buildLegendLabels(min, max, { forceSign = false } = {}) {
  if (!Number.isFinite(min) || !Number.isFinite(max)) {
    return Array.from({ length: LEGEND_STEP_COUNT }, () => '0.0')
  }

  if (min === max) {
    return Array.from({ length: LEGEND_STEP_COUNT }, () => formatLegendNumber(min, forceSign))
  }

  const step = (max - min) / (LEGEND_STEP_COUNT - 1)
  return Array.from({ length: LEGEND_STEP_COUNT }, (_, index) => formatLegendNumber(min + step * index, forceSign))
}

function formatLegendNumber(value, forceSign = false) {
  const rounded = Math.abs(value) < 0.05 ? 0 : value
  const text = rounded.toFixed(1)
  return forceSign && rounded > 0 ? `+${text}` : text
}

function formatAverageLabel(average) {
  return Number.isFinite(Number(average)) ? Number(average).toFixed(1) : '0.0'
}

function getMicromolUnit() {
  return 'µmol/m²'
}

export default RegionalMap
