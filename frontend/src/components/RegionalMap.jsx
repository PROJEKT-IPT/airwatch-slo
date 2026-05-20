import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { useEffect, useMemo, useRef } from 'react'

function RegionalMap({
  regions,
  geometries,
  selectedRegionCode,
  onRegionSelect,
  isLoading,
  error,
}) {
  const mapElementRef = useRef(null)
  const mapRef = useRef(null)
  const baseLayerRef = useRef(null)
  const geoJsonLayerRef = useRef(null)
  const selectedRegionRef = useRef(selectedRegionCode)
  const mapRegions = useMemo(() => buildMapRegions(regions, geometries), [regions, geometries])
  const selectedRegion = mapRegions.find(region => region.region_code === selectedRegionCode)

  useEffect(() => {
    selectedRegionRef.current = selectedRegionCode

    if (!geoJsonLayerRef.current) {
      return
    }

    geoJsonLayerRef.current.eachLayer(layer => {
      layer.setStyle(getRegionStyle(layer.feature?.properties, selectedRegionCode))
    })
  }, [selectedRegionCode])

  useEffect(() => {
    if (isLoading || error || mapRegions.length === 0 || !mapElementRef.current) {
      return undefined
    }

    if (!mapRef.current) {
      mapRef.current = L.map(mapElementRef.current, {
        attributionControl: true,
        doubleClickZoom: false,
        dragging: true,
        keyboard: true,
        scrollWheelZoom: false,
        zoomControl: true,
      })
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

    geoJsonLayerRef.current = L.geoJSON(buildFeatureCollection(mapRegions), {
      style: feature => getRegionStyle(feature.properties, selectedRegionRef.current),
      onEachFeature: (feature, layer) => {
        const { region_code: regionCode, region_name: regionName } = feature.properties

        layer.bindTooltip(regionName, {
          direction: 'top',
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
              color: '#2f3a55',
              weight: 2,
            })
          },
        })
      },
    }).addTo(map)

    const bounds = geoJsonLayerRef.current.getBounds()
    if (bounds.isValid()) {
      map.fitBounds(bounds, { padding: [18, 18] })
    }

    setTimeout(() => {
      map.invalidateSize()
    }, 0)

    return undefined
  }, [error, isLoading, mapRegions, onRegionSelect])

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
    <section className="card map-card">
      <div className="card-heading">
        <div>
          <p className="section-kicker">Prostorski pregled</p>
          <h2>Zemljevid statističnih regij</h2>
        </div>
        <span className="map-tag">Leaflet</span>
      </div>

      <div className="regional-map" aria-label="Zemljevid slovenskih statističnih regij">
        {isLoading ? (
          <div className="map-state" role="status" aria-live="polite">
            <div className="loading-line loading-line-title" />
            <div className="loading-line" />
            <p>Nalaganje prostorskega pregleda regij ...</p>
          </div>
        ) : error ? (
          <div className="map-state map-state-error" role="alert">
            <h3>Regij ni mogoče prikazati</h3>
            <p>{error}</p>
          </div>
        ) : mapRegions.length === 0 ? (
          <div className="map-state">
            <h3>Geometrije regij trenutno niso na voljo</h3>
            <p>Regionalne meje morda še niso bile naložene v bazo.</p>
          </div>
        ) : (
          <>
            <div
              ref={mapElementRef}
              className="regional-leaflet-map"
              role="application"
              aria-label="Interaktivni Leaflet zemljevid slovenskih statističnih regij"
            />
            <div className="map-region-controls" aria-label="Izbira regije na zemljevidu">
              {mapRegions.map(region => (
                <button
                  key={region.region_code}
                  type="button"
                  aria-pressed={region.region_code === selectedRegionCode}
                  onClick={() => onRegionSelect(region.region_code)}
                >
                  {`Izberi regijo na zemljevidu ${region.region_name}`}
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      <div className="map-footer">
        <p className="map-hint">
          Klik na regijo izbere isto regijo kot spustni seznam. Barva prikazuje status kakovosti
          zadnje razpoložljive meritve.
        </p>
        {selectedRegion ? (
          <p className="map-selected-region" aria-live="polite">
            <span>Izbrano</span>
            <strong>{selectedRegion.region_name}</strong>
            <em>{selectedRegion.region_code}</em>
          </p>
        ) : null}
      </div>
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

function buildFeatureCollection(regions) {
  return {
    type: 'FeatureCollection',
    features: regions.map(region => ({
      type: 'Feature',
      geometry: region.geometry,
      properties: {
        region_code: region.region_code,
        region_name: region.region_name,
        quality_status: region.quality_status,
      },
    })),
  }
}

function hasGeometry(geometry) {
  if (!geometry) {
    return false
  }

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
    fillColor: isSelected ? '#2f3a55' : qualityFillColor(properties?.quality_status),
    fillOpacity: isSelected ? 0.92 : 0.78,
    lineCap: 'round',
    lineJoin: 'round',
    opacity: 1,
    weight: isSelected ? 2.25 : 1.15,
  }
}

function qualityFillColor(status) {
  if (status === 'valid') {
    return '#8ed2a4'
  }

  if (status === 'no_valid_pixels') {
    return '#cfd6dc'
  }

  if (status === 'processing_error') {
    return '#f0a58b'
  }

  return '#9fa9ba'
}

export default RegionalMap
