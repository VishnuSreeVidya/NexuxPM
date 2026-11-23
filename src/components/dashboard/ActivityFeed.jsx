import { History } from 'lucide-react'
import { Avatar } from '../common/Avatar'
import { EmptyState } from '../common/EmptyState'
import { formatRelativeTime } from '../../utils/dateUtils'

export function ActivityFeed({ activities = [], users = [], projects = [], limit, className = '' }) {
  const visible = typeof limit === 'number' ? activities.slice(0, limit) : activities

  if (!visible.length) {
    return (
      <EmptyState
        icon={History}
        title="No recent activity"
        description="Workflow updates will appear here as the team works."
      />
    )
  }

  return (
    <ul className={`activity-list ${className}`.trim()}>
      {visible.map((activity) => {
        const actor = users.find((user) => user.id === activity.actorId)
        const project = projects.find((item) => item.id === activity.projectId)
        const actorName = activity.actorName ?? actor?.name
        if (!actorName) return null
        return (
          <li className="activity-item" key={activity.id}>
            <Avatar
              name={actorName}
              userId={activity.actorId}
              color={activity.actorAvatarColor ?? actor?.avatarColor}
              size="sm"
            />
            <div className="activity-item__content">
              <p className="activity-item__text">
                <strong>{actorName}</strong> {activity.description}
              </p>
              <div className="activity-item__meta">
                <span>{formatRelativeTime(activity.timestamp)}</span>
                {activity.projectName || project ? (
                  <>
                    <span className="activity-item__dot" aria-hidden="true" />
                    <span className="activity-item__project">{activity.projectName ?? project.name}</span>
                  </>
                ) : null}
              </div>
            </div>
          </li>
        )
      })}
    </ul>
  )
}

export default ActivityFeed
