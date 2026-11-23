import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Bell,
  Bug,
  CheckCheck,
  FileBarChart2,
  FolderKanban,
  ListChecks,
  Settings2,
} from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { useData } from '../../hooks/useData'
import { useClickOutside } from '../../hooks/useClickOutside'
import { getApiErrorMessage } from '../../services/api'
import {
  getUserNotifications,
} from '../../utils/selectors'
import { formatRelativeTime } from '../../utils/dateUtils'
import { EmptyState } from '../common/EmptyState'
import { Button } from '../common/Button'

const TYPE_ICONS = {
  bug: Bug,
  project: FolderKanban,
  report: FileBarChart2,
  task: ListChecks,
  system: Settings2,
}

export function NotificationBell() {
  const {
    currentUser,
    markNotificationRead,
    markAllNotificationsRead,
    reloadNotifications,
  } = useAuth()
  const {
    state,
    notificationsLoading,
    notificationsError,
    unreadNotificationCount,
  } = useData()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [actionError, setActionError] = useState('')
  const [isUpdating, setIsUpdating] = useState(false)
  const anchorRef = useRef(null)

  useClickOutside(anchorRef, () => setOpen(false), open)

  if (!currentUser) return null

  const unread = unreadNotificationCount
  const notifications = getUserNotifications(state, currentUser.id).slice(0, 6)

  async function handleOpenNotification(notification) {
    if (!notification.read) {
      setIsUpdating(true)
      setActionError('')
      try {
        await markNotificationRead(notification.id)
      } catch (error) {
        setActionError(getApiErrorMessage(error, 'Notification could not be marked as read.'))
        setIsUpdating(false)
        return
      }
      setIsUpdating(false)
    }
    setOpen(false)
    if (notification.link) navigate(notification.link)
  }

  async function handleMarkAllRead() {
    setIsUpdating(true)
    setActionError('')
    try {
      await markAllNotificationsRead()
    } catch (error) {
      setActionError(getApiErrorMessage(error, 'Notifications could not be marked as read.'))
    } finally {
      setIsUpdating(false)
    }
  }

  return (
    <div className="popover-anchor" ref={anchorRef}>
      <button
        type="button"
        className="icon-btn icon-btn--bordered icon-btn--badge"
        onClick={() => {
          const nextOpen = !open
          setOpen(nextOpen)
          if (nextOpen) {
            setActionError('')
            reloadNotifications()
          }
        }}
        aria-label={`Notifications${unread ? `, ${unread} unread` : ''}`}
        aria-expanded={open}
        aria-haspopup="dialog"
      >
        <Bell size={18} />
        {unread > 0 ? (
          <span className="icon-btn__count" aria-hidden="true">
            {unread > 9 ? '9+' : unread}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="popover popover--wide" role="dialog" aria-label="Notifications">
          <div className="popover__header">
            <div>
              <p className="popover__title">Notifications</p>
              <p className="text-small text-muted">
                {unread > 0 ? `${unread} unread` : 'You are up to date'}
              </p>
            </div>
            {unread > 0 ? (
              <button
                type="button"
                className="btn btn--ghost btn--sm"
                onClick={handleMarkAllRead}
                disabled={isUpdating}
              >
                <CheckCheck size={14} aria-hidden="true" />
                Mark all read
              </button>
            ) : null}
          </div>

          <div className="notification-list">
            {notificationsError || actionError ? (
              <div className="alert alert--danger" role="alert">
                {actionError || notificationsError}{' '}
                <button type="button" className="btn btn--ghost btn--sm" onClick={reloadNotifications}>Retry</button>
              </div>
            ) : notificationsLoading && !notifications.length ? (
              <p className="form-hint" role="status">Loading notifications…</p>
            ) : notifications.length ? (
              notifications.map((notification) => {
                const Icon = TYPE_ICONS[notification.type] ?? Bell
                return (
                  <button
                    type="button"
                    key={notification.id}
                    className={`notification-item ${notification.read ? '' : 'is-unread'}`.trim()}
                    onClick={() => handleOpenNotification(notification)}
                    disabled={isUpdating}
                  >
                    <span
                      className={`notification-item__icon ${notification.type ? `notification-item__icon--${notification.type}` : ''}`.trim()}
                      aria-hidden="true"
                    >
                      <Icon size={15} />
                    </span>
                    <span className="notification-item__body">
                      <span className="notification-item__title">{notification.title}</span>
                      <span className="notification-item__message">{notification.message}</span>
                      <span className="notification-item__time">
                        {formatRelativeTime(notification.createdAt)}
                      </span>
                    </span>
                    {notification.read ? null : (
                      <span className="notification-item__dot" aria-hidden="true" />
                    )}
                  </button>
                )
              })
            ) : (
              <EmptyState
                icon={Bell}
                title="No notifications"
                description="Workflow updates will appear here."
              />
            )}
          </div>

          <div className="popover__footer">
            <Button
              variant="ghost"
              size="sm"
              className="btn--block"
              onClick={() => {
                setOpen(false)
                navigate('/notifications')
              }}
            >
              View all notifications
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  )
}

export default NotificationBell
