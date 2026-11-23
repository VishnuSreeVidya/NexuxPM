import { Inbox } from 'lucide-react'

export function EmptyState({ icon: Icon = Inbox, title = 'Nothing here yet', description, action, className = '' }) {
  return (
    <div className={`empty-state ${className}`.trim()}>
      <span className="empty-state__icon" aria-hidden="true">
        <Icon size={21} />
      </span>
      <p className="empty-state__title">{title}</p>
      {description ? <p className="empty-state__description">{description}</p> : null}
      {action ? <div className="empty-state__action">{action}</div> : null}
    </div>
  )
}

export default EmptyState
