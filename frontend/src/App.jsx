import { useState } from 'react'

import Sidebar from './components/Sidebar'
import AdminProcessingStatusPage from './pages/AdminProcessingStatusPage'
import Dashboard from './pages/Dashboard'

function App() {
  const [activeView, setActiveView] = useState('dashboard')

  return (
    <div className="dashboard-shell">
      <Sidebar activeView={activeView} onViewChange={setActiveView} />
      {activeView === 'admin' ? <AdminProcessingStatusPage /> : <Dashboard />}
    </div>
  )
}

export default App
