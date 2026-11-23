import { Bug } from 'lucide-react'
import { EmptyState } from '../common/EmptyState'
import { StatusBadge } from '../common/StatusBadge'

export function BugList({ bugs = [], projects = [], limit, emptyTitle = 'No defects reported' }) {
  const visible = typeof limit === 'number' ? bugs.slice(0, limit) : bugs

  if (!visible.length) {
    return (
      <EmptyState
        icon={Bug}
        title={emptyTitle}
        description="Quality issues raised by QA will appear here."
      />
    )
  }

  return (
    <ul className="bug-list">
      {visible.map((bug) => {
        const project = projects.find((item) => item.id === bug.projectId)
        return (
          <li className="bug-item" key={bug.id}>
            <StatusBadge type="severity" value={bug.severity} />
            <div className="bug-item__body">
              <p className="bug-item__title">{bug.title}</p>
              <p className="bug-item__meta">
                {project ? `${project.name} · ` : ''}
                {bug.status.replace('_', ' ')}
              </p>
            </div>
            <StatusBadge type="bug" value={bug.status} />
          </li>
        )
      })}
    </ul>
  )
}

export default BugList
