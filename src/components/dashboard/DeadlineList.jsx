import { CalendarClock } from 'lucide-react'
import { EmptyState } from '../common/EmptyState'
import { PriorityLabel } from '../common/StatusBadge'
import {
  formatDate,
  getDueLabel,
  isOverdueDate,
  parseLocalDate,
} from '../../utils/dateUtils'
import { TASK_STATUSES } from '../../utils/constants'

export function DeadlineList({
  tasks = [],
  projects = [],
  limit = 5,
  showProject = true,
  emptyTitle = 'No upcoming deadlines',
  emptyDescription = 'Everything is on schedule for this window.',
}) {
  const visible = tasks.slice(0, limit)

  if (!visible.length) {
    return <EmptyState icon={CalendarClock} title={emptyTitle} description={emptyDescription} />
  }

  return (
    <ul className="deadline-list">
      {visible.map((task) => {
        const project = projects.find((item) => item.id === task.projectId)
        const date = parseLocalDate(task.dueDate)
        const overdue =
          task.status !== TASK_STATUSES.COMPLETED && isOverdueDate(task.dueDate)
        return (
          <li
            className={`deadline-item ${overdue ? 'deadline-item--overdue' : ''}`.trim()}
            key={task.id}
          >
            <span className="deadline-item__date" aria-hidden="true">
              <span>{date ? formatDate(date, { month: 'short' }) : '—'}</span>
              <strong>{date ? date.getDate() : '—'}</strong>
            </span>
            <div className="deadline-item__body">
              <p className="deadline-item__title" title={task.title}>
                {task.title}
              </p>
              <div className="deadline-item__meta">
                {showProject && project ? <span>{project.name}</span> : null}
                {showProject && project ? <span aria-hidden="true">·</span> : null}
                <PriorityLabel value={task.priority} />
              </div>
            </div>
            <span
              className={`deadline-item__due ${
                overdue ? 'deadline-item__due--danger' : ''
              }`.trim()}
            >
              {overdue ? getDueLabel(task.dueDate) : formatDate(task.dueDate, { month: 'short', day: 'numeric' })}
            </span>
          </li>
        )
      })}
    </ul>
  )
}

export default DeadlineList
