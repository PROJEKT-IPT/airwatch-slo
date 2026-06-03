import { useEffect, useMemo, useState } from 'react'

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

function SatellitePositionMap({ position }) {
  const x = ((position.longitude + 180) / 360) * 100
  const y = ((90 - position.latitude) / 180) * 100

  return (
    <div className="satellite-map" aria-hidden="true">
      <svg viewBox="0 0 100 50" role="img">
        <defs>
          <linearGradient id="satellite-map-water" x1="0" x2="1" y1="0" y2="1">
            <stop offset="0" stopColor="#dcefe8" />
            <stop offset="1" stopColor="#edf5ec" />
          </linearGradient>
        </defs>
        <rect width="100" height="50" rx="2" fill="url(#satellite-map-water)" />
        <path
          d="M7 15c8-7 20-8 31-4 8 3 15 1 23-2 10-4 22-2 32 5v5c-11-4-20-3-30 1-8 3-16 4-25 1C27 17 16 18 7 24z"
          fill="#b9d8bf"
          opacity="0.9"
        />
        <path
          d="M11 32c12-4 24-3 36 1 8 3 15 2 23-1 8-4 16-3 22 1v7c-8-4-17-4-26 0-9 3-18 4-29 0-10-4-19-4-26 0z"
          fill="#a8cfae"
          opacity="0.82"
        />
        {[25, 50, 75].map(lineX => (
          <line key={`x-${lineX}`} x1={lineX} x2={lineX} y1="0" y2="50" className="satellite-map-grid" />
        ))}
        {[12.5, 25, 37.5].map(lineY => (
          <line key={`y-${lineY}`} x1="0" x2="100" y1={lineY} y2={lineY} className="satellite-map-grid" />
        ))}
        <circle cx={x} cy={y} r="2.8" className="satellite-map-pulse" />
        <circle cx={x} cy={y} r="1.25" className="satellite-map-dot" />
      </svg>
    </div>
  )
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
        <div className="satellite-position-copy">
          <p className="section-kicker">Sentinel-5P live orbit</p>
          <h2>{t('satLiveTitle')}</h2>
          <p className="muted-text">{t('satLiveText')}</p>
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
            {t('satLiveSource', { time: formatUtcTime(now, locale), epoch: tleEpochLabel })}
          </p>
        </div>
        <SatellitePositionMap position={position} />
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
