import { useEffect, useState } from 'react'
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
import { useToast } from '../../hooks/useToast'
import { PageHeader } from '../../components/common/PageHeader'
import { Button } from '../../components/common/Button'
import { EmptyState } from '../../components/common/EmptyState'
import { getApiErrorMessage } from '../../services/api'
import { formatRelativeTime } from '../../utils/dateUtils'

const TYPE_ICONS = {
  bug: Bug,
  project: FolderKanban,
  report: FileBarChart2,
  task: ListChecks,
  system: Settings2,
}

export function NotificationsPage() {
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
  const { notify } = useToast()
  const navigate = useNavigate()
  const [filter, setFilter] = useState('all')
  const [actionError, setActionError] = useState('')
  const [isUpdating, setIsUpdating] = useState(false)
  const notifications = state.notifications.filter(
    (notification) => notification.userId === currentUser.id,
  )
  const unread = notifications.filter((notification) => !notification.read)
  const visible = filter === 'unread' ? unread : notifications

  useEffect(() => {
    reloadNotifications()
  }, [reloadNotifications])

  async function handleOpen(notification) {
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
    if (notification.link) navigate(notification.link)
  }

  async function handleMarkAll() {
    setIsUpdating(true)
    setActionError('')
    try {
      await markAllNotificationsRead()
      notify('All notifications marked as read.', { type: 'success' })
    } catch (error) {
      setActionError(getApiErrorMessage(error, 'Notifications could not be marked as read.'))
    } finally {
      setIsUpdating(false)
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Account · Inbox"
        title="Notifications"
        description={`You have ${unreadNotificationCount} unread ${unreadNotificationCount === 1 ? 'notification' : 'notifications'}. Updates cover task workflow, project milestones, defects, and reports.`}
        actions={<>
          <Button variant="secondary" onClick={reloadNotifications} disabled={notificationsLoading}>
            {notificationsLoading ? 'Refreshing…' : 'Refresh'}
          </Button>
          <Button
            variant="secondary"
            icon={CheckCheck}
            onClick={handleMarkAll}
            disabled={unreadNotificationCount === 0 || isUpdating}
          >
            Mark all as read
          </Button>
        </>}
      />

      <div className="segmented" role="tablist" aria-label="Notification filter">
        <button
          type="button"
          role="tab"
          aria-selected={filter === 'all'}
          className={`segmented__btn ${filter === 'all' ? 'is-active' : ''}`.trim()}
          onClick={() => setFilter('all')}
        >
          All ({notifications.length})
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={filter === 'unread'}
          className={`segmented__btn ${filter === 'unread' ? 'is-active' : ''}`.trim()}
          onClick={() => setFilter('unread')}
        >
          Unread ({unreadNotificationCount})
        </button>
      </div>

      <section className="panel dashboard-panel">
        <div className="panel__header">
          <div>
            <h2 className="panel__title">
              {filter === 'unread' ? 'Unread notifications' : 'All notifications'}
            </h2>
            <p className="panel__subtitle">
              Select a notification to open the related workspace area.
            </p>
          </div>
          <span className="badge badge--neutral">{visible.length} items</span>
        </div>
        <div className="panel__body" style={{ padding: 0 }}>
          {actionError || notificationsError ? (
            <div className="alert alert--danger" role="alert">
              {actionError || notificationsError}{' '}
              <button type="button" className="btn btn--ghost btn--sm" onClick={reloadNotifications}>Retry</button>
            </div>
          ) : notificationsLoading && !notifications.length ? (
            <p className="form-hint" role="status">Loading notifications…</p>
          ) : visible.length ? (
            <div className="notification-page-list">
              {visible.map((notification) => {
                const Icon = TYPE_ICONS[notification.type] ?? Bell
                return (
                  <button
                    type="button"
                    key={notification.id}
                    className={`notification-item ${notification.read ? '' : 'is-unread'}`.trim()}
                    onClick={() => handleOpen(notification)}
                    disabled={isUpdating}
                  >
                    <span
                      className={`notification-item__icon ${notification.type ? `notification-item__icon--${notification.type}` : ''}`.trim()}
                      aria-hidden="true"
                    >
                      <Icon size={16} />
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
              })}
            </div>
          ) : (
            <EmptyState
              icon={Bell}
              title={filter === 'unread' ? 'You are all caught up' : 'No notifications yet'}
              description={
                filter === 'unread'
                  ? 'There are no unread notifications in this demo workspace.'
                  : 'Workflow updates will appear here as the team works.'
              }
            />
          )}
        </div>
      </section>
    </>
  )
}

export default NotificationsPage
