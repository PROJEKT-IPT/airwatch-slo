import { useEffect, useMemo, useRef, useState } from 'react'

import { useLanguage } from '../i18n'

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

function MeasurementDatePicker({
  availableDates,
  selectedDate,
  onDateChange,
  isLoading = false,
  error = '',
}) {
  const { t, locale } = useLanguage()
  const [open, setOpen] = useState(false)
  const [visibleMonth, setVisibleMonth] = useState(() =>
    getInitialMonth(selectedDate, normalizeAvailableDates(availableDates).map(item => item.date)),
  )
  const containerRef = useRef(null)
  const normalizedDates = useMemo(() => normalizeAvailableDates(availableDates), [availableDates])
  const availableDateValues = useMemo(() => normalizedDates.map(item => item.date), [normalizedDates])
  const availableSet = useMemo(() => new Set(availableDateValues), [availableDateValues])
  const missingRegionsByDate = useMemo(
    () => new Map(normalizedDates.map(item => [item.date, item.missingRegionCount]).filter(([, count]) => count > 0)),
    [normalizedDates],
  )

  useEffect(() => {
    setVisibleMonth(getInitialMonth(selectedDate, availableDateValues))
  }, [availableDateValues, selectedDate])

  useEffect(() => {
    if (!open) return undefined

    function onPointerDown(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) setOpen(false)
    }

    function onKeyDown(event) {
      if (event.key === 'Escape') setOpen(false)
    }

    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  const monthDays = useMemo(() => buildMonthDays(visibleMonth), [visibleMonth])
  const monthLabel = new Intl.DateTimeFormat(locale, {
    month: 'long',
    timeZone: 'UTC',
    year: 'numeric',
  }).format(new Date(Date.UTC(visibleMonth.year, visibleMonth.month - 1, 1)))

  function selectDate(date) {
    if (!availableSet.has(date)) return
    onDateChange(date)
    setOpen(false)
  }

  function clearDate() {
    onDateChange(null)
    setOpen(false)
  }

  function shiftMonth(delta) {
    const next = new Date(Date.UTC(visibleMonth.year, visibleMonth.month - 1 + delta, 1))
    setVisibleMonth({ year: next.getUTCFullYear(), month: next.getUTCMonth() + 1 })
  }

  const hasDates = normalizedDates.length > 0

  return (
    <div className="measurement-date-picker" ref={containerRef}>
      <button
        type="button"
        className={`measurement-date-trigger${selectedDate ? ' measurement-date-trigger--active' : ''}`}
        aria-label={t('measurementDatePickerLabel')}
        aria-expanded={open}
        aria-haspopup="dialog"
        disabled={isLoading || !hasDates}
        title={t('measurementDatePickerLabel')}
        onClick={() => setOpen(value => !value)}
      >
        <CalendarIcon />
      </button>

      {open ? (
        <div className="measurement-calendar-popover" role="dialog" aria-label={t('measurementDatePickerTitle')}>
          <div className="measurement-calendar-header">
            <button type="button" aria-label={t('previousMonth')} onClick={() => shiftMonth(-1)}>
              <ChevronLeftIcon />
            </button>
            <strong>{monthLabel}</strong>
            <button type="button" aria-label={t('nextMonth')} onClick={() => shiftMonth(1)}>
              <ChevronRightIcon />
            </button>
          </div>

          <div className="measurement-calendar-grid" role="grid">
            {WEEKDAYS.map(day => (
              <span key={day} className="measurement-calendar-weekday">
                {t(`weekday${day}`)}
              </span>
            ))}
            {monthDays.map((day, index) => {
              if (!day) return <span key={`empty-${index}`} className="measurement-calendar-empty" />

              const isAvailable = availableSet.has(day.date)
              const isSelected = day.date === selectedDate
              const missingRegionCount = missingRegionsByDate.get(day.date) || 0
              const hasMissingRegions = missingRegionCount > 0
              return (
                <button
                  key={day.date}
                  type="button"
                  className={`measurement-calendar-day${isAvailable ? ' measurement-calendar-day--available' : ''}${hasMissingRegions ? ' measurement-calendar-day--missing-regions' : ''}${isSelected ? ' measurement-calendar-day--selected' : ''}`}
                  disabled={!isAvailable}
                  aria-pressed={isSelected}
                  onClick={() => selectDate(day.date)}
                >
                  <span>{day.day}</span>
                  {hasMissingRegions ? (
                    <span className="measurement-calendar-missing-dot" aria-hidden="true" />
                  ) : null}
                </button>
              )
            })}
          </div>

          <div className="measurement-calendar-footer">
            <button type="button" className="measurement-calendar-latest" onClick={clearDate}>
              {t('latestAvailableDate')}
            </button>
            {error ? <span role="alert">{error}</span> : null}
          </div>
        </div>
      ) : null}
    </div>
  )
}

function getInitialMonth(selectedDate, availableDates) {
  const date = selectedDate || availableDates[0] || new Date().toISOString().slice(0, 10)
  const [year, month] = date.split('-').map(Number)
  return {
    year: Number.isFinite(year) ? year : new Date().getUTCFullYear(),
    month: Number.isFinite(month) ? month : new Date().getUTCMonth() + 1,
  }
}

function normalizeAvailableDates(availableDates) {
  if (!Array.isArray(availableDates)) return []

  return availableDates
    .map(item => {
      if (typeof item === 'string') {
        return { date: item.slice(0, 10), missingRegionCount: 0 }
      }

      const date = String(item?.measurement_date || item?.date || '').slice(0, 10)
      const validRegionCount = getNumber(item?.valid_region_count ?? item?.validRegionCount)
      const totalRegionCount = getNumber(item?.total_region_count ?? item?.totalRegionCount)
      const hasMissingRegions = Boolean(item?.has_missing_regions || item?.hasMissingRegions)
      const missingRegionCount = validRegionCount !== null && totalRegionCount !== null
        ? Math.max(0, totalRegionCount - validRegionCount)
        : Number(hasMissingRegions)

      return {
        date,
        missingRegionCount,
      }
    })
    .filter(item => /^\d{4}-\d{2}-\d{2}$/.test(item.date))
}

function getNumber(value) {
  const number = Number(value)
  return Number.isFinite(number) ? number : null
}

function buildMonthDays({ year, month }) {
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate()
  const firstDay = new Date(Date.UTC(year, month - 1, 1)).getUTCDay()
  const mondayOffset = (firstDay + 6) % 7
  const cells = Array.from({ length: mondayOffset }, () => null)

  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push({ day, date: `${year}-${pad2(month)}-${pad2(day)}` })
  }

  while (cells.length % 7 !== 0) cells.push(null)
  return cells
}

function pad2(value) {
  return String(value).padStart(2, '0')
}

function CalendarIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M8 2v4" />
      <path d="M16 2v4" />
      <rect width="18" height="18" x="3" y="4" rx="2" />
      <path d="M3 10h18" />
    </svg>
  )
}

function ChevronLeftIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m15 18-6-6 6-6" />
    </svg>
  )
}

function ChevronRightIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m9 18 6-6-6-6" />
    </svg>
  )
}

export default MeasurementDatePicker
