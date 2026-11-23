import { useState } from 'react'
import { useLocation } from 'react-router-dom'
import { CalendarDays, ChevronRight, Menu } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { getPageTitle } from '../../routes/navigation'
import { NotificationBell } from './NotificationBell'
import { UserMenu } from './UserMenu'

export function Topbar({ onOpenSidebar, sidebarOpen }) {
  const { currentUser } = useAuth()
  const location = useLocation()
  const [date] = useState(() =>
    new Intl.DateTimeFormat('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(new Date()),
  )

  const pageTitle = getPageTitle(location.pathname, currentUser)

  return (
    <header className="topbar">
      <div className="topbar__left">
        <button
          type="button"
          className="icon-btn topbar__menu"
          onClick={onOpenSidebar}
          aria-label="Open navigation"
          aria-expanded={sidebarOpen}
        >
          <Menu size={20} />
        </button>
        <div className="topbar__breadcrumb">
          <span>NexusPM</span>
          <ChevronRight size={13} aria-hidden="true" />
          <strong>{pageTitle}</strong>
        </div>
      </div>

      <div className="topbar__right">
        <div className="topbar__date">
          <CalendarDays size={14} aria-hidden="true" />
          {date}
        </div>
        <NotificationBell />
        <UserMenu />
      </div>
    </header>
  )
}

export default Topbar
