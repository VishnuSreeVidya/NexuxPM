import { Flag } from 'lucide-react'
import { EmptyState } from '../common/EmptyState'
import { StatusBadge } from '../common/StatusBadge'
import { formatShortDate } from '../../utils/dateUtils'

export function MilestoneList({ milestones = [], projects = [], limit, showProject = true }) {
  const visible = typeof limit === 'number' ? milestones.slice(0, limit) : milestones

  if (!visible.length) {
    return (
      <EmptyState
        icon={Flag}
        title="No milestones"
        description="Project milestones will appear here once they are defined."
      />
    )
  }

  return (
    <ul className="milestone-list">
      {visible.map((milestone) => {
        const project = projects.find((item) => item.id === milestone.projectId)
        return (
          <li className="milestone-item" key={milestone.id}>
            <span
              className={`milestone-item__marker is-${milestone.status}`}
              aria-hidden="true"
            />
            <div className="milestone-item__body">
              <p className="milestone-item__title">{milestone.title}</p>
              <p className="milestone-item__meta">
                {showProject && project ? `${project.name} · ` : ''}
                Due {formatShortDate(milestone.dueDate)}
              </p>
            </div>
            <StatusBadge type="milestone" value={milestone.status} />
          </li>
        )
      })}
    </ul>
  )
}

export default MilestoneList
