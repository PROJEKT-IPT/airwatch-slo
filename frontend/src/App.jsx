import { useEffect, useState } from 'react'

import Sidebar from './components/Sidebar'
import { LanguageProvider } from './i18n'
import AdminProcessingStatusPage from './pages/AdminProcessingStatusPage'
import Dashboard from './pages/Dashboard'

function readViewFromHash() {
  if (typeof window === 'undefined') {
    return 'overview'
  }

  return window.location.hash === '#admin' ? 'admin' : 'overview'
}

function App() {
  const [activeView, setActiveView] = useState(readViewFromHash)

  // Admin/debug is an internal view: reachable at #admin for troubleshooting,
  // but not advertised in the public navigation.
  useEffect(() => {
    function syncFromHash() {
      setActiveView(readViewFromHash())
    }

    window.addEventListener('hashchange', syncFromHash)
    return () => window.removeEventListener('hashchange', syncFromHash)
  }, [])

  return (
    <LanguageProvider>
      <div className="dashboard-shell">
        <Sidebar activeView={activeView} onViewChange={setActiveView} />
        {activeView === 'admin' ? (
          <AdminProcessingStatusPage />
        ) : (
          <Dashboard activeView={activeView} />
        )}
      </div>
    </LanguageProvider>
  )
}

export default App
