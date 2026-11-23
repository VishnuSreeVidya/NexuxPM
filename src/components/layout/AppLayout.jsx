import { useEffect, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { useData } from '../../hooks/useData'
import { Button } from '../common/Button'
import { Sidebar } from './Sidebar'
import { Topbar } from './Topbar'

export function AppLayout() {
  const { bugsLoading, bugsError } = useData()
  const { reloadBugs } = useAuth()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const location = useLocation()

  useEffect(() => {
    setSidebarOpen(false)
    window.scrollTo({ top: 0, behavior: 'auto' })
  }, [location.pathname])

  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key === 'Escape') setSidebarOpen(false)
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  return (
    <div className="app-shell">
      <Sidebar open={sidebarOpen} onNavigate={() => setSidebarOpen(false)} />
      <button
        type="button"
        className={`sidebar-backdrop ${sidebarOpen ? 'is-visible' : ''}`.trim()}
        aria-label="Close navigation"
        onClick={() => setSidebarOpen(false)}
        tabIndex={sidebarOpen ? 0 : -1}
      />
      <div className="main-shell">
        <Topbar
          onOpenSidebar={() => setSidebarOpen(true)}
          sidebarOpen={sidebarOpen}
        />
        {bugsLoading ? <p className="alert" role="status">Loading bugs…</p> : null}
        {bugsError ? (
          <div className="alert alert--danger" role="alert">
            {bugsError} <Button size="sm" variant="secondary" onClick={reloadBugs}>Retry</Button>
          </div>
        ) : null}
        <main className="page-content">
          <div id="top" className="page-content__inner">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}

export default AppLayout
