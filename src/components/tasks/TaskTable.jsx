import { ListChecks } from 'lucide-react'
import { Avatar } from '../common/Avatar'
import { EmptyState } from '../common/EmptyState'
import { DataTable } from '../common/DataTable'
import { PriorityLabel, StatusBadge } from '../common/StatusBadge'
import { formatShortDate, isOverdueDate } from '../../utils/dateUtils'
import { TASK_STATUSES } from '../../utils/constants'

export function TaskTable({ state, tasks = [], onSelect, limit, footer }) {
  const rows = typeof limit === 'number' ? tasks.slice(0, limit) : tasks

  if (!rows.length) {
    return (
      <EmptyState
        icon={ListChecks}
        title="No tasks found"
        description="Tasks matching this view will appear here."
      />
    )
  }

  const columns = [
    {
      key: 'task',
      header: 'Task',
      render: (task) => {
        const project = state.projects.find((item) => item.id === task.projectId)
        return (
          <div className="table-user__meta" style={{ maxWidth: 320 }}>
            <div className="table-title">{task.title}</div>
            <div className="table-title__sub">{project ? project.name : 'Unknown project'}</div>
          </div>
        )
      },
    },
    {
      key: 'assignee',
      header: 'Developer',
      render: (task) => {
        const assignee = state.users.find((user) => user.id === task.assigneeId)
        return assignee ? (
          <div className="table-user">
            <Avatar
              name={assignee.name}
              userId={assignee.id}
              color={assignee.avatarColor}
              size="xs"
            />
            <div className="table-user__meta">
              <div className="table-user__name">{assignee.name}</div>
              <div className="table-user__sub">{assignee.title}</div>
            </div>
          </div>
        ) : (
          <span className="text-muted">Unassigned</span>
        )
      },
    },
    {
      key: 'qa',
      header: 'QA owner',
      render: (task) => {
        const qa = state.users.find((user) => user.id === task.qaId)
        return qa ? (
          <div className="table-user">
            <Avatar
              name={qa.name}
              userId={qa.id}
              color={qa.avatarColor}
              size="xs"
            />
            <div className="table-user__meta">
              <div className="table-user__name">{qa.name}</div>
              <div className="table-user__sub">QA Engineer</div>
            </div>
          </div>
        ) : (
          <span className="text-muted">Not assigned</span>
        )
      },
    },
    {
      key: 'priority',
      header: 'Priority',
      render: (task) => <PriorityLabel value={task.priority} />,
    },
    {
      key: 'status',
      header: 'Status',
      render: (task) => <StatusBadge type="task" value={task.status} />,
    },
    {
      key: 'due',
      header: 'Due date',
      className: 'is-nowrap',
      render: (task) => {
        const overdue = task.status !== TASK_STATUSES.COMPLETED && isOverdueDate(task.dueDate)
        return (
          <span className={overdue ? 'text-danger text-strong' : ''}>
            {formatShortDate(task.dueDate)}
          </span>
        )
      },
    },
  ]

  return (
    <DataTable
      columns={columns}
      rows={rows}
      getRowKey={(task) => task.id}
      onRowClick={onSelect}
      rowLabel={(task) => `Open ${task.title}`}
      footer={footer}
    />
  )
}

export default TaskTable
