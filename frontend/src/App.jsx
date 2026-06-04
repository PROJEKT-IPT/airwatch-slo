import { useEffect, useState } from 'react'

import Sidebar from './components/Sidebar'
import { LanguageProvider } from './i18n'
import AdminProcessingStatusPage from './pages/AdminProcessingStatusPage'
import Dashboard from './pages/Dashboard'

const SIDEBAR_STORAGE_KEY = 'airwatch-sidebar-collapsed'

function readViewFromHash() {
  if (typeof window === 'undefined') {
    return 'overview'
  }

  return window.location.hash === '#admin' ? 'admin' : 'overview'
}

function readSidebarCollapsed() {
  if (typeof window === 'undefined') {
    return false
  }

  return window.localStorage.getItem(SIDEBAR_STORAGE_KEY) === 'true'
}

function App() {
  const [activeView, setActiveView] = useState(readViewFromHash)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(readSidebarCollapsed)

  useEffect(() => {
    function syncFromHash() {
      setActiveView(readViewFromHash())
    }

    window.addEventListener('hashchange', syncFromHash)
    return () => window.removeEventListener('hashchange', syncFromHash)
  }, [])

  useEffect(() => {
    window.localStorage.setItem(SIDEBAR_STORAGE_KEY, String(sidebarCollapsed))
  }, [sidebarCollapsed])

  return (
    <LanguageProvider>
      <div className={`dashboard-shell${sidebarCollapsed ? ' dashboard-shell--collapsed' : ''}`}>
        <Sidebar
          activeView={activeView}
          onViewChange={setActiveView}
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed(value => !value)}
        />
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
