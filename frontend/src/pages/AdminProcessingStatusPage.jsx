import { useEffect, useState } from 'react'

import { getProcessingHistory, getProcessingStatus } from '../api/airwatchApi'
import { useLanguage } from '../i18n'

const HISTORY_LIMIT = 20

function AdminProcessingStatusPage() {
  const { t, locale } = useLanguage()
  const [status, setStatus] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [history, setHistory] = useState([])
  const [isHistoryLoading, setIsHistoryLoading] = useState(true)
  const [historyError, setHistoryError] = useState('')

  useEffect(() => {
    let isMounted = true

    async function loadProcessingData() {
      setIsLoading(true)
      setIsHistoryLoading(true)
      setError('')
      setHistoryError('')

      const [statusResult, historyResult] = await Promise.allSettled([
        getProcessingStatus(),
        getProcessingHistory({ limit: HISTORY_LIMIT }),
      ])

      if (!isMounted) return

      if (statusResult.status === 'fulfilled') {
        setStatus(statusResult.value)
      } else {
        setStatus(null)
        setError(t('processingStatusLoadError'))
      }

      if (historyResult.status === 'fulfilled') {
        setHistory(historyResult.value || [])
      } else {
        setHistory([])
        setHistoryError(t('processingHistoryLoadError'))
      }

      setIsLoading(false)
      setIsHistoryLoading(false)
    }

    loadProcessingData()
    return () => {
      isMounted = false
    }
  }, [t])

  const statusInfo = getRunStatusInfo(status?.run_status, t)
  const latestRunAt = status ? formatDateTime(getRunTimestamp(status), t, locale) : t('noData')
  const lastSuccessfulAt = status ? formatDateTime(status.last_successful_at, t, locale) : t('noData')
  const lastSuccessfulProduct = status?.last_successful_product_name || t('noData')

  return (
    <main className="dashboard-main admin-main">
      <header className="dashboard-header">
        <div>
          <p className="eyebrow">Admin/debug</p>
          <h1>{t('adminTitle')}</h1>
          <p className="dashboard-subtitle">{t('adminSubtitle')}</p>
        </div>
        {status ? (
          <div className={`header-status processing-header-status ${statusInfo.className}`}>
            <span className="status-dot" />
            <span>{statusInfo.label}</span>
          </div>
        ) : null}
      </header>

      <section className="admin-status-grid">
        <article className="card processing-status-card">
          <ProcessingStatusBody
            isLoading={isLoading}
            error={error}
            status={status}
            statusInfo={statusInfo}
            latestRunAt={latestRunAt}
            lastSuccessfulAt={lastSuccessfulAt}
            lastSuccessfulProduct={lastSuccessfulProduct}
            t={t}
            locale={locale}
          />
        </article>

        <article className="card processing-history-card">
          <div className="card-heading">
            <div>
              <p className="section-kicker">{t('processingHistory')}</p>
              <h2>{t('previousRuns')}</h2>
            </div>
            <span className="history-count">{t('latestCount', { count: HISTORY_LIMIT })}</span>
          </div>

          {isHistoryLoading ? (
            <LoadingState text={t('loadingProcessingHistory')} />
          ) : historyError ? (
            <ErrorState title={t('processingHistoryErrorTitle')} text={historyError} />
          ) : history.length === 0 ? (
            <EmptyState title={t('noProcessingHistoryTitle')} text={t('noProcessingHistoryText')} />
          ) : (
            <ProcessingHistoryList items={history} t={t} locale={locale} />
          )}
        </article>
      </section>
    </main>
  )
}

// State-dependent status card body; flat early-returns keep complexity low.
function ProcessingStatusBody({
  isLoading,
  error,
  status,
  statusInfo,
  latestRunAt,
  lastSuccessfulAt,
  lastSuccessfulProduct,
  t,
  locale,
}) {
  if (isLoading) return <LoadingState text={t('loadingProcessingStatus')} />
  if (error) return <ErrorState title={t('processingStatusErrorTitle')} text={error} />
  if (!status) {
    return <EmptyState title={t('noProcessingRecordsTitle')} text={t('noProcessingRecordsText')} />
  }

  return (
    <>
      <div className="card-heading">
        <div>
          <p className="section-kicker">{t('latestProcessing')}</p>
          <h2>{statusInfo.title}</h2>
        </div>
        <span className={`quality-badge ${statusInfo.className}`}>{statusInfo.label}</span>
      </div>

      <div className="admin-summary-grid">
        <InfoTile label={t('latestProcessingRun')} value={latestRunAt} detail={`Run ID: ${status.id_processing_run}`} />
        <InfoTile label={t('latestProduct')} value={status.source_product_name} detail={`${t('status')}: ${status.run_status}`} />
        <InfoTile label={t('latestSuccessfulUpdate')} value={lastSuccessfulAt} detail={`${t('product')}: ${lastSuccessfulProduct}`} />
      </div>

      <dl className="details-list">
        <DetailRow label="Run ID" value={status.id_processing_run} t={t} />
        <DetailRow label={t('status')} value={status.run_status} t={t} />
        <DetailRow label={t('script')} value={status.script_name} t={t} />
        <DetailRow label={t('scriptVersion')} value={status.script_version || t('noData')} t={t} />
        <DetailRow label={t('qaThreshold')} value={formatNumber(status.qa_threshold, t, locale)} t={t} />
        <DetailRow label={t('startedAt')} value={formatDateTime(status.started_at, t, locale)} t={t} />
        <DetailRow label={t('finishedAt')} value={formatDateTime(status.finished_at, t, locale)} t={t} />
        <DetailRow label={t('product')} value={status.source_product_name} t={t} />
        <DetailRow label={t('latestSuccessfulUpdate')} value={lastSuccessfulAt} t={t} />
        {status.error_message ? <DetailRow label={t('error')} value={status.error_message} t={t} /> : null}
      </dl>
    </>
  )
}

function InfoTile({ label, value, detail }) {
  return (
    <div className="info-tile">
      <span>{label}</span>
      <strong>{value}</strong>
      <em>{detail}</em>
    </div>
  )
}

function DetailRow({ label, value, t }) {
  return (
    <div className="detail-row">
      <dt>{label}</dt>
      <dd>{value ?? t('noData')}</dd>
    </div>
  )
}

function LoadingState({ text }) {
  return (
    <div className="state-block" role="status" aria-live="polite">
      <div className="loading-line loading-line-title" />
      <div className="loading-line" />
      <div className="loading-line" />
      <p>{text}</p>
    </div>
  )
}

function ErrorState({ title, text }) {
  return (
    <div className="state-block state-error" role="alert">
      <h2>{title}</h2>
      <p>{text}</p>
    </div>
  )
}

function EmptyState({ title, text }) {
  return (
    <div className="state-block">
      <h2>{title}</h2>
      <p>{text}</p>
    </div>
  )
}

function ProcessingHistoryList({ items, t, locale }) {
  return (
    <div className="processing-history-list" role="list">
      {items.map(item => {
        const statusInfo = getRunStatusInfo(item.run_status, t)

        return (
          <div className="history-row" role="listitem" key={item.id_processing_run}>
            <div className="history-main">
              <span className="history-product">{item.source_product_name}</span>
              <span className="history-meta">
                Run {item.id_processing_run} - {formatRunWindow(item, t, locale)}
              </span>
            </div>
            <div className="history-metric">
              <span className="history-label">{t('validRegions')}</span>
              <strong>{formatNumber(item.valid_region_count, t, locale)}</strong>
            </div>
            <span className={`quality-badge ${statusInfo.className}`}>{statusInfo.label}</span>
          </div>
        )
      })}
    </div>
  )
}

function getRunStatusInfo(status, t) {
  if (status === 'success') {
    return { label: t('success'), title: t('latestRunSuccess'), className: 'quality-valid' }
  }

  if (status === 'running') {
    return { label: t('running'), title: t('latestRunRunning'), className: 'quality-empty' }
  }

  if (status === 'failed' || status === 'error') {
    return { label: t('failed'), title: t('latestRunFailed'), className: 'quality-error' }
  }

  return { label: status || t('unknown'), title: t('latestRunUnknown'), className: 'quality-empty' }
}

function formatNumber(value, t, locale) {
  if (value === null || value === undefined || value === '') return t('noData')

  const numberValue = Number(value)
  if (!Number.isFinite(numberValue)) return String(value)

  return numberValue.toLocaleString(locale, { maximumSignificantDigits: 6 })
}

function formatDateTime(value, t, locale) {
  if (!value) return t('noData')

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value

  return new Intl.DateTimeFormat(locale, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date)
}

function getRunTimestamp(status) {
  if (!status) return null
  return status.finished_at || status.started_at || null
}

function formatRunWindow(run, t, locale) {
  const startedAt = formatDateTime(run.started_at, t, locale)
  const finishedAt = formatDateTime(run.finished_at, t, locale)

  if (!run.finished_at) return startedAt
  return `${startedAt} - ${finishedAt}`
}

export default AdminProcessingStatusPage
