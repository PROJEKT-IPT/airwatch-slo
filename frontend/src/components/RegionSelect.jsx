import { useEffect, useRef, useState } from 'react'

import { useLanguage } from '../i18n'
import { formatNo2Value } from '../utils/format'

function dotClass(status) {
  if (status === 'valid') return 'rp-dot rp-dot--valid'
  if (status === 'no_valid_pixels') return 'rp-dot rp-dot--empty'
  if (status === 'processing_error') return 'rp-dot rp-dot--error'
  return 'rp-dot'
}

function RegionSelect({ regions, selectedRegionCode, onRegionChange, isLoading, error, embedded = false, dropUp = false }) {
  const { t, locale } = useLanguage()
  const hasRegions = regions.length > 0
  const [open, setOpen] = useState(false)
  const containerRef = useRef(null)

  const selected = regions.find(region => region.region_code === selectedRegionCode) || null

  // Close on outside click or Esc.
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

  function selectRegion(code) {
    onRegionChange(code)
    setOpen(false)
  }

  return (
    <div
      className={`region-picker${embedded ? ' region-picker--embedded' : ''}${dropUp ? ' region-picker--up' : ''}`}
      ref={containerRef}
    >
      <span className="region-picker-label" id="rp-label">{t('regionLabel')}</span>

      <button
        type="button"
        className="region-picker-trigger"
        id="rp-trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls="rp-popover"
        aria-labelledby="rp-label rp-value"
        disabled={isLoading || !hasRegions}
        onClick={() => setOpen(value => !value)}
      >
        <span className="region-picker-value" id="rp-value">
          {selected ? (
            <>
              <span className={dotClass(selected.quality_status)} aria-hidden="true" />
              <strong>{selected.region_name}</strong>
              <em>{selected.region_code}</em>
            </>
          ) : (
            <span className="region-picker-placeholder">
              {isLoading ? t('loadingRegions') : t('chooseRegion')}
            </span>
          )}
        </span>
        <svg className="region-picker-chevron" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      {open ? (
        <div className="region-picker-popover" id="rp-popover" role="dialog" aria-label={t('pickerTitle')}>
          <p className="rp-title">{t('pickerTitle')}</p>
          {regions.length === 0 ? (
            <p className="rp-empty">{t('regionsUnavailable')}</p>
          ) : (
            <ul className="rp-list" role="listbox" aria-label={t('regionLabel')}>
              {regions.map(region => {
                const value = region.quality_status === 'valid' ? formatNo2Value(region.value_mean, locale) : ''
                const isSelected = region.region_code === selectedRegionCode
                return (
                  <li key={region.region_code}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={isSelected}
                      className={`rp-option${isSelected ? ' rp-option-selected' : ''}`}
                      onClick={() => selectRegion(region.region_code)}
                    >
                      <span className={dotClass(region.quality_status)} aria-hidden="true" />
                      <span className="rp-name">{region.region_name}</span>
                      <span className="rp-code">{region.region_code}</span>
                      <span className="rp-value">{value}</span>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      ) : null}

      {isLoading ? (
        <div className="inline-state" role="status" aria-live="polite">
          <span className="inline-spinner" aria-hidden="true" />
          <p className="field-message">{t('loadingRegions')}</p>
        </div>
      ) : null}
      {error ? (
        <div className="inline-state inline-state-error" role="alert">
          <p className="field-message field-message-error">{error}</p>
        </div>
      ) : null}
      {!isLoading && !error && !hasRegions ? (
        <p className="field-message">{t('regionsUnavailable')}</p>
      ) : null}
    </div>
  )
}

export default RegionSelect
