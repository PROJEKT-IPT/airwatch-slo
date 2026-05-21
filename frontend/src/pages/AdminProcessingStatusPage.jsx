import { useEffect, useState } from 'react'

import { getProcessingHistory, getProcessingStatus } from '../api/airwatchApi'

const HISTORY_LIMIT = 20

function AdminProcessingStatusPage() {
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

      if (!isMounted) {
        return
      }

      if (statusResult.status === 'fulfilled') {
        setStatus(statusResult.value)
      } else {
        setStatus(null)
        setError('Statusa obdelave ni bilo mogoče naložiti iz API-ja.')
      }

      if (historyResult.status === 'fulfilled') {
        setHistory(historyResult.value || [])
      } else {
        setHistory([])
        setHistoryError('Zgodovine obdelav ni bilo mogoče naložiti iz API-ja.')
      }

      setIsLoading(false)
      setIsHistoryLoading(false)
    }

    loadProcessingData()

    return () => {
      isMounted = false
    }
  }, [])

  const statusInfo = getRunStatusInfo(status?.run_status)
  const latestRunAt = status ? formatDateTime(getRunTimestamp(status)) : 'Ni podatka'
  const lastSuccessfulAt = status ? formatDateTime(status.last_successful_at) : 'Ni podatka'
  const lastSuccessfulProduct = status?.last_successful_product_name || 'Ni podatka'

  return (
      <main className="dashboard-main admin-main">
        <header className="dashboard-header">
          <div>
            <p className="eyebrow">Admin/debug</p>
            <h1>Status obdelave podatkov</h1>
            <p className="dashboard-subtitle">
              Zadnji zapis obdelave za hitro preverjanje podatkovnega toka.
            </p>
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
            {isLoading ? (
              <LoadingState text="Nalagam status obdelave ..." />
            ) : error ? (
              <ErrorState title="Napaka pri nalaganju statusa" text={error} />
            ) : !status ? (
              <EmptyState />
            ) : (
              <>
                <div className="card-heading">
                  <div>
                    <p className="section-kicker">Zadnja obdelava</p>
                    <h2>{statusInfo.title}</h2>
                  </div>
                  <span className={`quality-badge ${statusInfo.className}`}>
                    {statusInfo.label}
                  </span>
                </div>

                <div className="admin-summary-grid">
                  <div className="info-tile">
                    <span>Zadnji processing run</span>
                    <strong>{latestRunAt}</strong>
                    <em>Run ID: {status.id_processing_run}</em>
                  </div>
                  <div className="info-tile">
                    <span>Zadnji Sentinel-5P produkt</span>
                    <strong>{status.source_product_name}</strong>
                    <em>Status: {status.run_status}</em>
                  </div>
                  <div className="info-tile">
                    <span>Zadnja uspešna posodobitev</span>
                    <strong>{lastSuccessfulAt}</strong>
                    <em>Produkt: {lastSuccessfulProduct}</em>
                  </div>
                </div>

                <dl className="details-list">
                  <DetailRow label="Run ID" value={status.id_processing_run} />
                  <DetailRow label="Status" value={status.run_status} />
                  <DetailRow label="Skripta" value={status.script_name} />
                  <DetailRow label="Verzija skripte" value={status.script_version || 'Ni podatka'} />
                  <DetailRow label="QA prag" value={formatNumber(status.qa_threshold)} />
                  <DetailRow label="Začetek" value={formatDateTime(status.started_at)} />
                  <DetailRow label="Konec" value={formatDateTime(status.finished_at)} />
                  <DetailRow label="Produkt" value={status.source_product_name} />
                  <DetailRow label="Zadnja uspešna posodobitev" value={lastSuccessfulAt} />
                  {status.error_message ? (
                    <DetailRow label="Napaka" value={status.error_message} />
                  ) : null}
                </dl>
              </>
            )}
          </article>
          <article className="card processing-history-card">
            <div className="card-heading">
              <div>
                <p className="section-kicker">Zgodovina obdelav</p>
                <h2>Pretekli processing runi</h2>
              </div>
              <span className="history-count">Zadnjih {HISTORY_LIMIT}</span>
            </div>

            {isHistoryLoading ? (
              <LoadingState text="Nalagam zgodovino obdelav ..." />
            ) : historyError ? (
              <ErrorState title="Napaka pri nalaganju zgodovine" text={historyError} />
            ) : history.length === 0 ? (
              <HistoryEmptyState />
            ) : (
              <ProcessingHistoryList items={history} />
            )}
          </article>
        </section>
      </main>
  )
}

function DetailRow({ label, value }) {
  return (
    <div className="detail-row">
      <dt>{label}</dt>
      <dd>{value ?? 'Ni podatka'}</dd>
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

function EmptyState() {
  return (
    <div className="state-block">
      <h2>Ni zapisov obdelave</h2>
      <p>V bazi trenutno ni nobenega zapisa obdelave.</p>
    </div>
  )
}

function HistoryEmptyState() {
  return (
    <div className="state-block">
      <h2>Ni zgodovine obdelav</h2>
      <p>V bazi trenutno ni nobenega processing run zapisa.</p>
    </div>
  )
}

function ProcessingHistoryList({ items }) {
  return (
    <div className="processing-history-list" role="list">
      {items.map(item => {
        const statusInfo = getRunStatusInfo(item.run_status)

        return (
          <div className="history-row" role="listitem" key={item.id_processing_run}>
            <div className="history-main">
              <span className="history-product">{item.source_product_name}</span>
              <span className="history-meta">
                Run {item.id_processing_run} - {formatRunWindow(item)}
              </span>
            </div>
            <div className="history-metric">
              <span className="history-label">Veljavne regije</span>
              <strong>{formatNumber(item.valid_region_count)}</strong>
            </div>
            <span className={`quality-badge ${statusInfo.className}`}>{statusInfo.label}</span>
          </div>
        )
      })}
    </div>
  )
}

function getRunStatusInfo(status) {
  if (status === 'success') {
    return {
      label: 'Uspešno',
      title: 'Zadnja obdelava je bila uspešna',
      className: 'quality-valid',
    }
  }

  if (status === 'running') {
    return {
      label: 'V teku',
      title: 'Obdelava je trenutno v teku',
      className: 'quality-empty',
    }
  }

  if (status === 'failed' || status === 'error') {
    return {
      label: 'Napaka',
      title: 'Zadnja obdelava ni bila uspešna',
      className: 'quality-error',
    }
  }

  return {
    label: status || 'Neznano',
    title: 'Status zadnje obdelave ni znan',
    className: 'quality-empty',
  }
}

function formatNumber(value) {
  if (value === null || value === undefined || value === '') {
    return 'Ni podatka'
  }

  const numberValue = Number(value)

  if (!Number.isFinite(numberValue)) {
    return String(value)
  }

  return numberValue.toLocaleString('sl-SI', {
    maximumSignificantDigits: 6,
  })
}

function formatDateTime(value) {
  if (!value) {
    return 'Ni podatka'
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return value
  }

  return new Intl.DateTimeFormat('sl-SI', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date)
}

function getRunTimestamp(status) {
  if (!status) {
    return null
  }

  return status.finished_at || status.started_at || null
}

function formatRunWindow(run) {
  const startedAt = formatDateTime(run.started_at)
  const finishedAt = formatDateTime(run.finished_at)

  if (!run.finished_at) {
    return startedAt
  }

  return `${startedAt} - ${finishedAt}`
}

export default AdminProcessingStatusPage
