import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { useEffect, useMemo, useRef, useState } from 'react'

import { useLanguage } from '../i18n'

// Key facts shown as compact tiles in the hero (label + value pairs from i18n).
const FACTS = [
  ['satFactInstrumentLabel', 'satFactInstrumentValue'],
  ['satFactLaunchLabel', 'satFactLaunchValue'],
  ['satFactOrbitLabel', 'satFactOrbitValue'],
  ['satFactResolutionLabel', 'satFactResolutionValue'],
]

// Pollutants/gases TROPOMI can retrieve. NO₂ is highlighted as our focus;
// the rest are shown for context. Formulas are language-neutral.
const GASES = ['NO₂', 'O₃', 'SO₂', 'CO', 'CH₄', 'HCHO']

const SENTINEL_5P_TLE = {
  line1: '1 42969U 17064A   26154.45710015  .00000070  00000+0  54088-4 0  9994',
  line2: '2 42969  98.7922  96.6865 0001019  80.8558 279.2733 14.19516465447611',
}

// Sentinel-5P is our satellite; the rest (other Copernicus Sentinels + the ISS)
// are shown for orientation only. All TLEs are public orbital elements and the
// plotted positions are approximate, not real-time tracking. To refresh, replace
// the TLE lines from celestrak.org (gp.php?CATNR=<id>).
const SATELLITES = [
  { id: 's5p', name: 'Sentinel-5P', primary: true, tle: SENTINEL_5P_TLE },
  {
    id: 's1a',
    name: 'Sentinel-1A',
    tle: {
      line1: '1 39634U 14016A   26154.51607291  .00000265  00000+0  65894-4 0  9994',
      line2: '2 39634  98.1774 162.2481 0001428  82.4571 277.6791 14.59201047648021',
    },
  },
  {
    id: 's2a',
    name: 'Sentinel-2A',
    tle: {
      line1: '1 40697U 15028A   26154.50839958  .00000142  00000+0  70764-4 0  9991',
      line2: '2 40697  98.5687 229.5536 0001066  86.9112 273.2193 14.30819840571775',
    },
  },
  {
    id: 's3a',
    name: 'Sentinel-3A',
    tle: {
      line1: '1 41335U 16011A   26154.47111058  .00000144  00000+0  77339-4 0  9991',
      line2: '2 41335  98.6252 222.0511 0001305 106.0370 254.0954 14.26736025536109',
    },
  },
  {
    id: 'iss',
    name: 'ISS',
    tle: {
      line1: '1 25544U 98067A   26154.51601963  .00009210  00000+0  17156-3 0  9993',
      line2: '2 25544  51.6330   7.7762 0007101 128.3162 231.8466 15.49582842569638',
    },
  },
]

const EARTH_RADIUS_KM = 6378.137
const EARTH_MU = 398600.4418
const TWO_PI = Math.PI * 2

function toRadians(value) {
  return (value * Math.PI) / 180
}

function toDegrees(value) {
  return (value * 180) / Math.PI
}

function normalizeLongitude(value) {
  return ((((value + 180) % 360) + 360) % 360) - 180
}

function parseTleEpoch(line1) {
  const epoch = line1.slice(18, 32).trim()
  const year = Number(epoch.slice(0, 2))
  const dayOfYear = Number(epoch.slice(2))
  const fullYear = year < 57 ? 2000 + year : 1900 + year
  const start = Date.UTC(fullYear, 0, 1, 0, 0, 0, 0)
  return new Date(start + (dayOfYear - 1) * 24 * 60 * 60 * 1000)
}

function parseTle(tle) {
  return {
    epoch: parseTleEpoch(tle.line1),
    inclination: toRadians(Number(tle.line2.slice(8, 16))),
    raan: toRadians(Number(tle.line2.slice(17, 25))),
    eccentricity: Number(`0.${tle.line2.slice(26, 33).trim()}`),
    argumentOfPerigee: toRadians(Number(tle.line2.slice(34, 42))),
    meanAnomaly: toRadians(Number(tle.line2.slice(43, 51))),
    meanMotion: Number(tle.line2.slice(52, 63)),
  }
}

function solveKepler(meanAnomaly, eccentricity) {
  let eccentricAnomaly = meanAnomaly
  for (let index = 0; index < 8; index += 1) {
    eccentricAnomaly -=
      (eccentricAnomaly - eccentricity * Math.sin(eccentricAnomaly) - meanAnomaly) /
      (1 - eccentricity * Math.cos(eccentricAnomaly))
  }
  return eccentricAnomaly
}

function gmst(date) {
  const julianDate = date.getTime() / 86400000 + 2440587.5
  const daysSinceJ2000 = julianDate - 2451545.0
  return toRadians(normalizeLongitude(280.46061837 + 360.98564736629 * daysSinceJ2000))
}

function calculateSatellitePosition(date, tle = SENTINEL_5P_TLE) {
  const elements = parseTle(tle)
  const elapsedSeconds = (date.getTime() - elements.epoch.getTime()) / 1000
  const meanMotionRad = (elements.meanMotion * TWO_PI) / 86400
  const semiMajorAxis = Math.cbrt(EARTH_MU / meanMotionRad ** 2)
  const meanAnomaly = (elements.meanAnomaly + meanMotionRad * elapsedSeconds) % TWO_PI
  const eccentricAnomaly = solveKepler(meanAnomaly, elements.eccentricity)
  const trueAnomaly =
    Math.atan2(
      Math.sqrt(1 - elements.eccentricity ** 2) * Math.sin(eccentricAnomaly),
      Math.cos(eccentricAnomaly) - elements.eccentricity,
    )
  const radius = semiMajorAxis * (1 - elements.eccentricity * Math.cos(eccentricAnomaly))
  const argument = elements.argumentOfPerigee + trueAnomaly

  const cosRaan = Math.cos(elements.raan)
  const sinRaan = Math.sin(elements.raan)
  const cosInclination = Math.cos(elements.inclination)
  const sinInclination = Math.sin(elements.inclination)
  const cosArgument = Math.cos(argument)
  const sinArgument = Math.sin(argument)

  const eciX = radius * (cosRaan * cosArgument - sinRaan * sinArgument * cosInclination)
  const eciY = radius * (sinRaan * cosArgument + cosRaan * sinArgument * cosInclination)
  const eciZ = radius * (sinArgument * sinInclination)

  const theta = gmst(date)
  const ecefX = Math.cos(theta) * eciX + Math.sin(theta) * eciY
  const ecefY = -Math.sin(theta) * eciX + Math.cos(theta) * eciY
  const ecefZ = eciZ

  const longitude = normalizeLongitude(toDegrees(Math.atan2(ecefY, ecefX)))
  const latitude = toDegrees(Math.atan2(ecefZ, Math.sqrt(ecefX ** 2 + ecefY ** 2)))

  return {
    latitude,
    longitude,
    altitude: radius - EARTH_RADIUS_KM,
    velocity: Math.sqrt(EARTH_MU * (2 / radius - 1 / semiMajorAxis)),
    epoch: elements.epoch,
  }
}

function formatCoordinate(value, positiveSuffix, negativeSuffix) {
  const suffix = value >= 0 ? positiveSuffix : negativeSuffix
  return `${Math.abs(value).toFixed(2)}° ${suffix}`
}

function formatUtcTime(date, locale) {
  return new Intl.DateTimeFormat(locale, {
    dateStyle: 'short',
    timeStyle: 'medium',
    timeZone: 'UTC',
  }).format(date)
}

function formatLocalTime(date, locale) {
  return new Intl.DateTimeFormat(locale, {
    dateStyle: 'short',
    timeStyle: 'medium',
  }).format(date)
}

// Small div-icon for a satellite: a dot plus an always-on name label.
function buildSatelliteIcon(satellite) {
  const variant = satellite.primary ? 'satellite-marker--primary' : 'satellite-marker--other'
  return L.divIcon({
    className: `satellite-marker ${variant}`,
    html: `<span class="satellite-marker-dot" aria-hidden="true"></span><span class="satellite-marker-label">${satellite.name}</span>`,
    iconAnchor: [6, 6],
    iconSize: null,
  })
}

function getPrimary(satellites) {
  return satellites.find(satellite => satellite.primary) || satellites[0]
}

function SatellitePositionMap({ ariaLabel, now, satellites }) {
  const mapElementRef = useRef(null)
  const mapRef = useRef(null)
  const markersRef = useRef(new Map())
  const groundTrackRef = useRef([])
  const satellitesRef = useRef(satellites)

  const groundTrackSegments = useMemo(() => buildGroundTrackSegments(now), [now])

  useEffect(() => {
    satellitesRef.current = satellites
  }, [satellites])

  useEffect(() => {
    if (!mapElementRef.current || mapRef.current) return undefined
    const initial = getPrimary(satellitesRef.current)

    // Fully interactive: scroll/drag/zoom enabled so the user can explore.
    const map = L.map(mapElementRef.current, {
      attributionControl: true,
      maxZoom: 6,
      minZoom: 1,
      worldCopyJump: true,
      zoomControl: true,
    })

    map.setView([initial.position.latitude, initial.position.longitude], getSatelliteMapZoom(mapElementRef.current), {
      animate: false,
    })
    map.attributionControl.setPosition('bottomright')

    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
      className: 'satellite-map-base-layer',
      maxZoom: 8,
      minZoom: 1,
    }).addTo(map)

    satellitesRef.current.forEach(satellite => {
      const marker = L.marker([satellite.position.latitude, satellite.position.longitude], {
        icon: buildSatelliteIcon(satellite),
        interactive: false,
        keyboard: false,
        zIndexOffset: satellite.primary ? 1000 : 0,
      }).addTo(map)
      markersRef.current.set(satellite.id, marker)
    })

    mapRef.current = map

    setTimeout(() => {
      map.invalidateSize()
    }, 0)

    const resizeObserver =
      typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(() => map.invalidateSize())
    resizeObserver?.observe(mapElementRef.current)
    mapRef.current.resizeObserver = resizeObserver

    return undefined
  }, [])

  // Move the markers + redraw the primary ground track as time advances, but
  // never re-center: that would fight the user's own pan/zoom.
  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    satellites.forEach(satellite => {
      markersRef.current.get(satellite.id)?.setLatLng([satellite.position.latitude, satellite.position.longitude])
    })

    groundTrackRef.current.forEach(layer => layer.removeFrom(map))
    groundTrackRef.current = groundTrackSegments.map(segment =>
      L.polyline(segment.points, {
        className:
          segment.phase === 'future'
            ? 'satellite-orbit-track satellite-orbit-track--future'
            : 'satellite-orbit-track',
        color: '#173d46',
        dashArray: segment.phase === 'future' ? '18 12' : null,
        lineCap: segment.phase === 'future' ? 'butt' : 'round',
        lineJoin: 'round',
        opacity: segment.opacity,
        smoothFactor: 0.35,
        weight: segment.weight,
      }).addTo(map),
    )
  }, [groundTrackSegments, satellites])

  useEffect(
    () => () => {
      if (mapRef.current) {
        mapRef.current.resizeObserver?.disconnect()
        mapRef.current.remove()
        mapRef.current = null
      }
    },
    [],
  )

  return (
    <div
      ref={mapElementRef}
      className="satellite-map satellite-leaflet-map"
      role="application"
      aria-label={ariaLabel}
    />
  )
}

function buildGroundTrackSegments(now) {
  const minutesBefore = 72
  const minutesAfter = 36
  const stepMinutes = 0.35
  const points = []

  for (let offset = -minutesBefore; offset <= minutesAfter; offset += stepMinutes) {
    const pointDate = new Date(now.getTime() + offset * 60 * 1000)
    const point = calculateSatellitePosition(pointDate)
    points.push({
      offset,
      latLng: [point.latitude, point.longitude],
    })
  }

  return buildSmoothTrackSegments(points)
}

function buildSmoothTrackSegments(points) {
  const maxAbsOffset = Math.max(...points.map(point => Math.abs(point.offset)), 1)
  const segments = []
  const paths = splitAntimeridianPaths(points).map(path => smoothTrackPath(path))

  paths.forEach(path => {
    for (let index = 0; index < path.length - 1; index += 5) {
      const chunk = path.slice(index, index + 7)
      if (chunk.length < 2) continue

      const midpointOffset = chunk[Math.floor(chunk.length / 2)].offset
      const distanceFromSatellite = Math.min(Math.abs(midpointOffset) / maxAbsOffset, 1)
      const opacity = 0.05 + (1 - distanceFromSatellite) ** 1.45 * 0.6
      const weight = 0.68 + (1 - distanceFromSatellite) * 0.88

      segments.push({
        opacity,
        phase: midpointOffset > 0 ? 'future' : 'past',
        points: chunk.map(point => point.latLng),
        weight,
      })
    }
  })

  return segments
}

function splitAntimeridianPaths(points) {
  return points.reduce((paths, point, index) => {
    const previousPoint = points[index - 1]
    const crossesAntimeridian =
      previousPoint && Math.abs(point.latLng[1] - previousPoint.latLng[1]) > 180

    if (crossesAntimeridian || paths.length === 0) {
      paths.push([point])
    } else {
      paths[paths.length - 1].push(point)
    }

    return paths
  }, [])
}

function smoothTrackPath(points) {
  if (points.length < 4) return points

  const smoothedPoints = []

  for (let index = 0; index < points.length - 1; index += 1) {
    const previousPoint = points[Math.max(0, index - 1)]
    const currentPoint = points[index]
    const nextPoint = points[index + 1]
    const afterNextPoint = points[Math.min(points.length - 1, index + 2)]

    for (let step = 0; step < 4; step += 1) {
      const amount = step / 4
      smoothedPoints.push({
        latLng: [
          catmullRom(
            previousPoint.latLng[0],
            currentPoint.latLng[0],
            nextPoint.latLng[0],
            afterNextPoint.latLng[0],
            amount,
          ),
          catmullRom(
            previousPoint.latLng[1],
            currentPoint.latLng[1],
            nextPoint.latLng[1],
            afterNextPoint.latLng[1],
            amount,
          ),
        ],
        offset: catmullRom(previousPoint.offset, currentPoint.offset, nextPoint.offset, afterNextPoint.offset, amount),
      })
    }
  }

  smoothedPoints.push(points[points.length - 1])
  return smoothedPoints
}

function catmullRom(previousValue, currentValue, nextValue, afterNextValue, amount) {
  const amountSquared = amount * amount
  const amountCubed = amountSquared * amount

  return (
    0.5 *
    ((2 * currentValue) +
      (-previousValue + nextValue) * amount +
      (2 * previousValue - 5 * currentValue + 4 * nextValue - afterNextValue) * amountSquared +
      (-previousValue + 3 * currentValue - 3 * nextValue + afterNextValue) * amountCubed)
  )
}

function getSatelliteMapZoom(mapElement) {
  const width = mapElement?.clientWidth || 560
  const height = mapElement?.clientHeight || 380
  const referenceWidth = 560
  const referenceHeight = 380
  const referenceZoom = 1.95
  const viewportScale = Math.min(width / referenceWidth, height / referenceHeight)
  const responsiveZoom = referenceZoom + Math.log2(Math.max(viewportScale, 0.1))

  return Math.min(Math.max(responsiveZoom, 1.05), 2.15)
}

function SatelliteCard() {
  const { locale, t } = useLanguage()
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const intervalId = window.setInterval(() => setNow(new Date()), 15000)
    return () => window.clearInterval(intervalId)
  }, [])

  const satellites = useMemo(
    () => SATELLITES.map(satellite => ({ ...satellite, position: calculateSatellitePosition(now, satellite.tle) })),
    [now],
  )
  const position = useMemo(() => getPrimary(satellites).position, [satellites])
  const tleEpochLabel = formatUtcTime(position.epoch, locale)

  return (
    <section className="dashboard-view satellite-view" aria-label={t('navSatellite')}>
      <section className="card satellite-position-card">
        <SatellitePositionMap ariaLabel={t('satMapAria')} now={now} satellites={satellites} />
        <div className="satellite-position-copy">
          <h2>{t('satLiveTitle')}</h2>
          <p className="muted-text">{t('satLiveText')}</p>
          <p className="muted-text satellite-live-how">{t('satLiveHowText')}</p>
          <p className="muted-text satellite-other-note">{t('satOtherSats')}</p>
          <div className="satellite-position-grid" aria-label={t('satLiveTitle')}>
            <div className="info-tile">
              <span>{t('satLatitude')}</span>
              <strong>{formatCoordinate(position.latitude, 'N', 'S')}</strong>
            </div>
            <div className="info-tile">
              <span>{t('satLongitude')}</span>
              <strong>{formatCoordinate(position.longitude, 'E', 'W')}</strong>
            </div>
            <div className="info-tile">
              <span>{t('satAltitude')}</span>
              <strong>{position.altitude.toFixed(0)} km</strong>
            </div>
            <div className="info-tile">
              <span>{t('satVelocity')}</span>
              <strong>{position.velocity.toFixed(2)} km/s</strong>
            </div>
          </div>
          <p className="provenance-note">
            {t('satLiveSource', { time: formatLocalTime(now, locale), epoch: tleEpochLabel })}
          </p>
        </div>
      </section>

      <section className="card satellite-hero">
        <div>
          <p className="section-kicker">Copernicus Sentinel-5P</p>
          <h2>{t('satWhatTitle')}</h2>
          <p className="muted-text satellite-intro">{t('satIntro')}</p>
        </div>
        <div className="satellite-facts">
          {FACTS.map(([labelKey, valueKey]) => (
            <div className="info-tile" key={labelKey}>
              <span>{t(labelKey)}</span>
              <strong>{t(valueKey)}</strong>
            </div>
          ))}
        </div>
      </section>

      <div className="satellite-grid">
        <section className="card">
          <h2>{t('satWhereTitle')}</h2>
          <p className="muted-text">{t('satWhereText')}</p>
        </section>

        <section className="card">
          <h2>{t('satTropomiTitle')}</h2>
          <p className="muted-text">{t('satTropomiText')}</p>
          <p className="muted-text satellite-focus">{t('satTropomiNo2')}</p>
        </section>

        <section className="card">
          <h2>{t('satDataTitle')}</h2>
          <p className="muted-text">{t('satDataText')}</p>
          <div className="satellite-chips">
            {GASES.map(gas => (
              <span key={gas} className={`region-chip${gas === 'NO₂' ? ' quality-valid' : ''}`}>
                {gas}
              </span>
            ))}
            <span className="region-chip">{t('satAerosolsClouds')}</span>
          </div>
          <p className="muted-text satellite-focus">{t('satDataFocus')}</p>
        </section>
      </div>

      <section className="card">
        <h2>{t('satProcessTitle')}</h2>
        <p className="muted-text">{t('satProcessText')}</p>
        <p className="provenance-note">{t('satNotRealTime')}</p>
      </section>
    </section>
  )
}

export default SatelliteCard
