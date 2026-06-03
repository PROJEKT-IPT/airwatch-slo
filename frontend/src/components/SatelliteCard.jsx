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
  line1: '1 42969U 17064A   26151.84911293  .00000060  00000-0  49523-4 0  9993',
  line2: '2 42969  98.7922  94.0973 0001025  79.7791 280.3501 14.19515890447242',
}

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

function SatellitePositionMap({ ariaLabel, now, position }) {
  const mapElementRef = useRef(null)
  const mapRef = useRef(null)
  const markerRef = useRef(null)
  const groundTrackRef = useRef([])
  const positionRef = useRef(position)

  const groundTrackSegments = useMemo(() => buildGroundTrackSegments(now), [now])

  useEffect(() => {
    positionRef.current = position
  }, [position])

  useEffect(() => {
    if (!mapElementRef.current || mapRef.current) return undefined
    const initialPosition = positionRef.current

    const map = L.map(mapElementRef.current, {
      attributionControl: true,
      boxZoom: false,
      doubleClickZoom: false,
      dragging: false,
      keyboard: false,
      minZoom: 1,
      scrollWheelZoom: false,
      tap: false,
      touchZoom: false,
      worldCopyJump: true,
      zoomControl: false,
    })

    map.setView([initialPosition.latitude, initialPosition.longitude], getSatelliteMapZoom(mapElementRef.current), {
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

    markerRef.current = L.marker([initialPosition.latitude, initialPosition.longitude], {
      icon: L.divIcon({
        className: 'satellite-marker',
        html: '<span aria-hidden="true"></span>',
        iconAnchor: [5, 5],
        iconSize: [10, 10],
      }),
      keyboard: false,
    }).addTo(map)

    mapRef.current = map

    setTimeout(() => {
      map.invalidateSize()
    }, 0)

    const resizeObserver =
      typeof ResizeObserver === 'undefined'
        ? null
        : new ResizeObserver(() => {
            const currentPosition = positionRef.current
            map.invalidateSize()
            map.setZoom(getSatelliteMapZoom(mapElementRef.current), { animate: false })
            map.setView([currentPosition.latitude, currentPosition.longitude], undefined, {
              animate: false,
            })
          })
    resizeObserver?.observe(mapElementRef.current)

    map.on('zoomend', () => {
      const currentPosition = positionRef.current
      map.panTo([currentPosition.latitude, currentPosition.longitude], { animate: false })
    })

    mapRef.current.resizeObserver = resizeObserver

    return undefined
  }, [])

  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    map.panTo([position.latitude, position.longitude], {
      animate: true,
      duration: 0.75,
      easeLinearity: 0.4,
    })
    markerRef.current?.setLatLng([position.latitude, position.longitude])

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
  }, [groundTrackSegments, position.latitude, position.longitude])

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

  const position = useMemo(() => calculateSatellitePosition(now), [now])
  const tleEpochLabel = formatUtcTime(position.epoch, locale)

  return (
    <section className="dashboard-view satellite-view" aria-label={t('navSatellite')}>
      <section className="card satellite-position-card">
        <SatellitePositionMap ariaLabel={t('satMapAria')} now={now} position={position} />
        <div className="satellite-position-copy">
          <h2>{t('satLiveTitle')}</h2>
          <p className="muted-text">{t('satLiveText')}</p>
          <p className="muted-text satellite-live-how">{t('satLiveHowText')}</p>
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
