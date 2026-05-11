import { useEffect, useState } from 'react'

import { getProcessingStatus } from '../api/airwatchApi'

function AdminProcessingStatusPage() {
  const [status, setStatus] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let isMounted = true

    async function loadProcessingStatus() {
      setIsLoading(true)
      setError('')

      try {
        const loadedStatus = await getProcessingStatus()

        if (!isMounted) {
          return
        }

        setStatus(loadedStatus)
      } catch (requestError) {
        if (!isMounted) {
          return
        }

        setStatus(null)
        setError('Statusa obdelave ni bilo mogoče naložiti iz API-ja.')
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    loadProcessingStatus()

    return () => {
      isMounted = false
    }
  }, [])

  const statusInfo = getRunStatusInfo(status?.run_status)

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
              <LoadingState />
            ) : error ? (
              <ErrorState text={error} />
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

                <dl className="details-list">
                  <DetailRow label="Run ID" value={status.id_processing_run} />
                  <DetailRow label="Status" value={status.run_status} />
                  <DetailRow label="Skripta" value={status.script_name} />
                  <DetailRow label="Verzija skripte" value={status.script_version || 'Ni podatka'} />
                  <DetailRow label="QA prag" value={formatNumber(status.qa_threshold)} />
                  <DetailRow label="Začetek" value={formatDateTime(status.started_at)} />
                  <DetailRow label="Konec" value={formatDateTime(status.finished_at)} />
                  <DetailRow label="Produkt" value={status.source_product_name} />
                  {status.error_message ? (
                    <DetailRow label="Napaka" value={status.error_message} />
                  ) : null}
                </dl>
              </>
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

function LoadingState() {
  return (
    <div className="state-block" role="status" aria-live="polite">
      <div className="loading-line loading-line-title" />
      <div className="loading-line" />
      <div className="loading-line" />
      <p>Nalagam status obdelave ...</p>
    </div>
  )
}

function ErrorState({ text }) {
  return (
    <div className="state-block state-error" role="alert">
      <h2>Napaka pri nalaganju statusa</h2>
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

export default AdminProcessingStatusPage
