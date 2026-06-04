import { useState } from 'react'

import {
  AdminDisabledError,
  hasAdminAuth,
  setAdminPassword,
  verifyAdminPassword,
} from '../api/airwatchApi'
import { useLanguage } from '../i18n'

function AdminLoginGate({ children }) {
  const { t } = useLanguage()
  const [isAuthenticated, setIsAuthenticated] = useState(hasAdminAuth)
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isVerifying, setIsVerifying] = useState(false)

  if (isAuthenticated) {
    return children
  }

  async function handleSubmit(event) {
    event.preventDefault()
    if (isVerifying || !password) return

    setIsVerifying(true)
    setError('')

    try {
      const accepted = await verifyAdminPassword(password)
      if (accepted) {
        setAdminPassword(password)
        setIsAuthenticated(true)
        setPassword('')
      } else {
        setError(t('adminLoginError'))
      }
    } catch (cause) {
      if (cause instanceof AdminDisabledError) {
        setError(t('adminLoginDisabledError'))
      } else {
        setError(t('adminLoginNetworkError'))
      }
    } finally {
      setIsVerifying(false)
    }
  }

  return (
    <main className="dashboard-main admin-login-main">
      <div className="admin-login-card card" role="dialog" aria-labelledby="admin-login-title">
        <p className="eyebrow">Admin/debug</p>
        <h1 id="admin-login-title">{t('adminLoginTitle')}</h1>
        <p className="dashboard-subtitle">{t('adminLoginSubtitle')}</p>

        <form className="admin-login-form" onSubmit={handleSubmit}>
          <label className="admin-login-field">
            <span>{t('adminLoginPasswordLabel')}</span>
            <input
              type="password"
              autoComplete="current-password"
              autoFocus
              value={password}
              onChange={event => {
                setPassword(event.target.value)
                if (error) setError('')
              }}
              aria-invalid={error ? 'true' : undefined}
              aria-describedby={error ? 'admin-login-error' : undefined}
              disabled={isVerifying}
            />
          </label>

          {error ? (
            <p className="admin-login-error" id="admin-login-error" role="alert">
              {error}
            </p>
          ) : null}

          <button type="submit" className="admin-login-submit" disabled={isVerifying || !password}>
            {isVerifying ? t('adminLoginVerifying') : t('adminLoginSubmit')}
          </button>
        </form>

        <p className="admin-login-hint">{t('adminLoginHint')}</p>
      </div>
    </main>
  )
}

export default AdminLoginGate
