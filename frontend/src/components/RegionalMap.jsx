import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { useEffect, useMemo, useRef, useState } from 'react'

import { useLanguage } from '../i18n'

const SEQUENTIAL_COLORS = ['#ffffb2', '#fed976', '#feb24c', '#fd8d3c', '#fc4e2a', '#e31a1c', '#b10026']
const DEVIATION_COLORS = ['#2166ac', '#67a9cf', '#d1e5f0', '#f7f7f7', '#fddbc7', '#ef8a62', '#b2182b']
const LEGEND_STEP_COUNT = 7

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
  const selectedRegionRef = useRef(selectedRegionCode)
  const translationRef = useRef(t)
  const [showDeviations, setShowDeviations] = useState(false)
  const mapRegions = useMemo(() => buildMapRegions(regions, geometries), [regions, geometries])
  const mapGeometryKey = useMemo(() => buildMapGeometryKey(mapRegions), [mapRegions])
  const mapScale = useMemo(() => buildMapScale(mapRegions), [mapRegions])

  useEffect(() => {
    selectedRegionRef.current = selectedRegionCode

    if (!geoJsonLayerRef.current) return

    geoJsonLayerRef.current.eachLayer(layer => {
      layer.setStyle(getRegionStyle(layer.feature?.properties, selectedRegionCode))
    })
  }, [selectedRegionCode])

  useEffect(() => {
    translationRef.current = t

    if (!geoJsonLayerRef.current) return

    geoJsonLayerRef.current.eachLayer(layer => {
      if (layer.getTooltip()) {
        layer.setTooltipContent(buildRegionTooltip(layer.feature?.properties, t))
      }
    })
  }, [t])

  useEffect(() => {
    if (isLoading || error || mapRegions.length === 0 || !mapElementRef.current) {
      return undefined
    }

    if (!mapRef.current) {
      mapRef.current = L.map(mapElementRef.current, {
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
      onEachFeature: (feature, layer) => {
        const { region_code: regionCode } = feature.properties

        layer.bindTooltip(buildRegionTooltip(feature.properties, translationRef.current), {
          direction: 'top',
          opacity: 1,
          sticky: true,
        })

        layer.on({
          click: () => onRegionSelect(regionCode),
          keypress: event => {
            const key = event.originalEvent?.key
            if (key === 'Enter' || key === ' ') {
              onRegionSelect(regionCode)
            }
          },
          mouseout: event => {
            event.target.setStyle(getRegionStyle(feature.properties, selectedRegionRef.current))
          },
          mouseover: event => {
            event.target.setStyle({
              color: '#26324d',
              fillOpacity: 0.94,
              weight: 2,
            })
          },
        })
      },
      },
    ).addTo(map)

    const bounds = geoJsonLayerRef.current.getBounds()
    if (bounds.isValid() && fittedGeometryKeyRef.current !== mapGeometryKey) {
      map.fitBounds(bounds, getResponsiveFitBoundsOptions(mapElementRef.current))
      fittedGeometryKeyRef.current = mapGeometryKey
    }

    setTimeout(() => {
      map.invalidateSize()
    }, 0)

    return undefined
  }, [error, isLoading, mapGeometryKey, mapRegions, mapScale.average, mapScale.max, mapScale.maxAbsDeviation, mapScale.min, onRegionSelect, showDeviations])

  useEffect(
    () => () => {
      if (mapRef.current) {
        mapRef.current.remove()
        mapRef.current = null
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
        {isLoading ? (
          <div className="map-state" role="status" aria-live="polite">
            <div className="loading-line loading-line-title" />
            <div className="loading-line" />
            <p>{t('loadingMap')}</p>
          </div>
        ) : error ? (
          <div className="map-state map-state-error" role="alert">
            <h3>{t('mapErrorTitle')}</h3>
            <p>{error}</p>
          </div>
        ) : mapRegions.length === 0 ? (
          <div className="map-state">
            <h3>{t('noGeometriesTitle')}</h3>
            <p>{t('noGeometriesText')}</p>
          </div>
        ) : (
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
        )}
      </div>

      {!isLoading && !error && mapRegions.length > 0 ? (
        <div className={`map-legend${fullScreen ? ' map-legend--float' : ''}`} aria-label={t('mapLegendAria')}>
          <div className="map-legend-controls">
            <button
              type="button"
              className="map-mode-toggle"
              aria-pressed={showDeviations}
              onClick={() => setShowDeviations(value => !value)}
            >
              {showDeviations ? t('showValues') : t('showDeviations')}
            </button>
          </div>
          <div className="map-legend-heading">
            <span>{showDeviations ? t('mapLegendDeviationMetric') : t('mapLegendAbsoluteMetric')}</span>
            <strong>
              {showDeviations
                ? t('mapLegendDeviationScale', {
                    mean: formatMicromolNumberFromMicromol(mapScale.average, t),
                  })
                : t('mapLegendDynamicScale')}
            </strong>
          </div>
          <div
            className={`map-gradient-legend ${showDeviations ? 'map-gradient-legend--deviation' : 'map-gradient-legend--absolute'}`}
            aria-hidden="true"
          >
            {(showDeviations ? DEVIATION_COLORS : SEQUENTIAL_COLORS).map((color, index) => (
              <span key={`${color}-${index}`} style={{ backgroundColor: color }} />
            ))}
          </div>
          <div className="map-legend-values" aria-hidden="true">
            <div className="map-legend-thresholds map-legend-thresholds--dynamic">
              {(showDeviations ? mapScale.deviationLabels : mapScale.absoluteLabels).map((label, index) => (
                <span key={`${label}-${index}`}>{label}</span>
              ))}
            </div>
            <span className="map-legend-unit">{getMicromolUnit()}</span>
          </div>
          <div className="map-legend-missing">
            <span className="map-legend-swatch map-legend-swatch--missing" aria-hidden="true" />
            <span>{t('noValidValue')}</span>
          </div>
        </div>
      ) : null}

      {fullScreen && overlay ? <div className="map-overlay-panel">{overlay}</div> : null}
    </section>
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

  return [
    bounds.minLng,
    bounds.minLat,
    bounds.maxLng,
    bounds.maxLat,
    bounds.count,
  ]
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

  if (
    value.length >= 2 &&
    Number.isFinite(Number(value[0])) &&
    Number.isFinite(Number(value[1]))
  ) {
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

  return {
    padding: [padding, padding],
  }
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
        average_micromol: averageMicromol,
        deviation_micromol: getDeviationMicromol(region.value_mean, averageMicromol),
        max_abs_deviation_micromol: maxAbsDeviationMicromol,
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
    return (geometry.coordinates || []).some(polygon =>
      polygon.some(ring => ring.length >= 3),
    )
  }

  return false
}

function getRegionStyle(properties, selectedRegionCode) {
  const isSelected = properties?.region_code === selectedRegionCode

  return {
    color: isSelected ? '#f5f6f3' : 'rgba(47, 58, 85, 0.48)',
    fillColor: getFillColor(properties),
    fillOpacity: isSelected ? 0.9 : 0.78,
    lineCap: 'round',
    lineJoin: 'round',
    opacity: 1,
    weight: isSelected ? 2.25 : 1.15,
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
  const deviations = values.map(value => value - average)
  const maxAbsDeviation = Math.max(...deviations.map(value => Math.abs(value))) || 0
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
  if (!Number.isFinite(micromolValue) || !Number.isFinite(averageValue)) {
    return null
  }

  return micromolValue - averageValue
}

function getFillColor(properties) {
  if (properties?.color_mode === 'deviation') {
    return deviationFillColor(properties?.deviation_micromol, properties?.max_abs_deviation_micromol)
  }

  return absoluteFillColor(properties?.value_mean, properties?.min_micromol, properties?.max_micromol)
}

function absoluteFillColor(value, minMicromol, maxMicromol) {
  const micromolValue = molToMicromol(value)
  const minValue = Number(minMicromol)
  const maxValue = Number(maxMicromol)
  if (!Number.isFinite(micromolValue) || !Number.isFinite(minValue) || !Number.isFinite(maxValue)) {
    return '#cfd6dc'
  }

  if (maxValue === minValue) return SEQUENTIAL_COLORS[Math.floor(SEQUENTIAL_COLORS.length / 2)]
  return getColorFromScale((micromolValue - minValue) / (maxValue - minValue), SEQUENTIAL_COLORS)
}

function deviationFillColor(deviationMicromol, maxAbsDeviationMicromol) {
  const deviationValue = Number(deviationMicromol)
  const maxAbsValue = Number(maxAbsDeviationMicromol)
  if (!Number.isFinite(deviationValue) || !Number.isFinite(maxAbsValue)) return '#cfd6dc'
  if (maxAbsValue === 0) return DEVIATION_COLORS[Math.floor(DEVIATION_COLORS.length / 2)]

  return getColorFromScale((deviationValue + maxAbsValue) / (2 * maxAbsValue), DEVIATION_COLORS)
}

function getColorFromScale(ratio, colors) {
  const safeRatio = Math.min(Math.max(Number(ratio), 0), 1)
  const index = Math.min(Math.floor(safeRatio * colors.length), colors.length - 1)
  return colors[index]
}

function buildRegionTooltip(properties, t) {
  const status = properties?.quality_status
  const value = formatMicromolValue(properties?.value_mean, t)
  const pixels = formatInteger(properties?.pixel_count_valid, t)
  const deviation = formatSignedMicromolValue(properties?.deviation_micromol, t)
  const shouldShowDeviation = properties?.color_mode === 'deviation'
  const statusLabel = formatQualityStatus(status, t)
  const dotClass = `map-tooltip-dot ${getTooltipDotClass(status)}`

  return `
    <div class="map-tooltip">
      <strong>${escapeHtml(properties?.region_name || t('selectedRegion'))}</strong>
      <span class="map-tooltip-row">${escapeHtml(t('latestNo2Value'))}: ${escapeHtml(value)}</span>
      ${
        shouldShowDeviation
          ? `<span class="map-tooltip-row">${escapeHtml(t('mapMeanDeviation'))}: ${escapeHtml(deviation)}</span>`
          : ''
      }
      <span class="map-tooltip-row">
        <span class="${dotClass}" aria-hidden="true"></span>
        ${escapeHtml(statusLabel)} &middot; ${escapeHtml(t('validPixels'))}: ${escapeHtml(pixels)}
      </span>
    </div>
  `
}

function getTooltipDotClass(status) {
  if (status === 'valid') return 'map-tooltip-dot--valid'
  if (status === 'no_valid_pixels') return 'map-tooltip-dot--empty'
  if (status === 'processing_error') return 'map-tooltip-dot--error'
  return 'map-tooltip-dot--unknown'
}

function formatQualityStatus(status, t) {
  if (status === 'valid') return t('valid')
  if (status === 'no_valid_pixels') return t('noValidPixels')
  if (status === 'processing_error') return t('processingError')
  return t('unknown')
}

function formatMicromolValue(value, t) {
  const formattedValue = formatMicromolNumber(value, t)
  if (formattedValue === t('noData')) return formattedValue
  return `${formattedValue} ${getMicromolUnit()}`
}

function formatMicromolNumber(value, t) {
  if (value === null || value === undefined || value === '') return t('noData')

  const numberValue = Number(value)
  if (!Number.isFinite(numberValue)) return String(value)
  return (numberValue * 1_000_000).toFixed(1)
}

function formatMicromolNumberFromMicromol(value, t) {
  const numberValue = Number(value)
  if (!Number.isFinite(numberValue)) return t('noData')
  return numberValue.toFixed(1)
}

function formatSignedMicromolValue(value, t) {
  const numberValue = Number(value)
  if (!Number.isFinite(numberValue)) return t('noData')
  const sign = numberValue > 0 ? '+' : ''
  return `${sign}${numberValue.toFixed(1)} ${getMicromolUnit()}`
}

function formatInteger(value, t) {
  const numberValue = Number(value)
  if (!Number.isFinite(numberValue)) return t('noData')
  return String(Math.trunc(numberValue))
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
  return Array.from({ length: LEGEND_STEP_COUNT }, (_, index) =>
    formatLegendNumber(min + step * index, forceSign),
  )
}

function formatLegendNumber(value, forceSign) {
  const rounded = Math.abs(value) < 0.05 ? 0 : value
  const sign = forceSign && rounded > 0 ? '+' : ''
  return `${sign}${rounded.toFixed(1)}`
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
