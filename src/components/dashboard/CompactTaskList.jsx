import { ListChecks } from 'lucide-react'
import { Avatar } from '../common/Avatar'
import { EmptyState } from '../common/EmptyState'
import { StatusBadge } from '../common/StatusBadge'
import { getDueLabel, isOverdueDate } from '../../utils/dateUtils'
import { TASK_STATUSES } from '../../utils/constants'

export function CompactTaskList({
  tasks = [],
  projects = [],
  users = [],
  limit,
  showProject = true,
  showAssignee = false,
  onSelect,
  emptyTitle = 'No tasks to show',
  emptyDescription = 'Assigned work will appear here.',
}) {
  const visible = typeof limit === 'number' ? tasks.slice(0, limit) : tasks

  if (!visible.length) {
    return (
      <EmptyState
        icon={ListChecks}
        title={emptyTitle}
        description={emptyDescription}
      />
    )
  }

  return (
    <ul className="compact-list">
      {visible.map((task) => {
        const project = projects.find((item) => item.id === task.projectId)
        const assignee = users.find((user) => user.id === task.assigneeId)
        const overdue = task.status !== TASK_STATUSES.COMPLETED && isOverdueDate(task.dueDate)
        const content = (
          <>
            <div className="compact-row__body">
              <div className="compact-row__title" title={task.title}>
                {task.title}
              </div>
              <div className="compact-row__meta">
                {showProject && project ? <span>{project.name}</span> : null}
                {showProject && project ? <span aria-hidden="true">·</span> : null}
                <span className={overdue ? 'text-danger' : ''}>{getDueLabel(task.dueDate)}</span>
              </div>
            </div>
            {showAssignee && assignee ? (
              <Avatar
                name={assignee.name}
                userId={assignee.id}
                color={assignee.avatarColor}
                size="xs"
              />
            ) : null}
            <div className="compact-row__right">
              <StatusBadge type="task" value={task.status} />
            </div>
          </>
        )

        return (
          <li key={task.id}>
            {onSelect ? (
              <button type="button" className="compact-row" onClick={() => onSelect(task)}>
                {content}
              </button>
            ) : (
              <div className="compact-row">{content}</div>
            )}
          </li>
        )
      })}
    </ul>
  )
}

export default CompactTaskList
