import { FolderKanban } from 'lucide-react'
import { Avatar } from '../common/Avatar'
import { EmptyState } from '../common/EmptyState'
import { DataTable } from '../common/DataTable'
import { ProgressBar } from '../common/ProgressBar'
import { StatusBadge } from '../common/StatusBadge'
import { getProjectProgress } from '../../utils/selectors'
import { TASK_PRIORITY_META } from '../../utils/constants'
import { formatShortDate, isOverdueDate } from '../../utils/dateUtils'

export function ProjectTable({ state, projects = [], onSelect, limit, footer }) {
  const rows = typeof limit === 'number' ? projects.slice(0, limit) : projects

  if (!rows.length) {
    return (
      <EmptyState
        icon={FolderKanban}
        title="No projects found"
        description="Projects assigned to you will appear here."
      />
    )
  }

  const columns = [
    {
      key: 'project',
      header: 'Project',
      render: (project) => {
        const lead = state.users.find((user) => user.id === project.leadId)
        const priority = TASK_PRIORITY_META[project.priority]?.label ?? ''
        const taskCount = state.tasks.filter((task) => task.projectId === project.id).length
        return (
          <div className="table-project">
            <span
              className="table-project__mark"
              style={{ backgroundColor: project.status === 'completed' ? '#16A34A' : '#2563EB' }}
              aria-hidden="true"
            />
            <div className="table-user__meta">
              <div className="table-project__name" title={project.name}>
                {project.name}
              </div>
              <div className="table-user__sub">
                {project.code} · {taskCount} tasks · {priority} priority
                {lead ? '' : ' · No lead'}
              </div>
            </div>
          </div>
        )
      },
    },
    {
      key: 'lead',
      header: 'Project lead',
      render: (project) => {
        const lead = state.users.find((user) => user.id === project.leadId)
        return lead ? (
          <div className="table-user">
            <Avatar name={lead.name} userId={lead.id} color={lead.avatarColor} size="xs" />
            <div className="table-user__meta">
              <div className="table-user__name">{lead.name}</div>
              <div className="table-user__sub">Project Lead</div>
            </div>
          </div>
        ) : (
          <span className="text-muted">Unassigned</span>
        )
      },
    },
    {
      key: 'progress',
      header: 'Progress',
      render: (project) => {
        const progress = getProjectProgress(state, project.id)
        return (
          <div className="table-progress">
            <div className="table-progress__top">
              <strong>{progress}%</strong>
            </div>
            <ProgressBar
              value={progress}
              tone={progress === 100 ? 'success' : undefined}
              label={`${project.name} progress`}
            />
          </div>
        )
      },
    },
    {
      key: 'status',
      header: 'Status',
      render: (project) => <StatusBadge type="project" value={project.status} />,
    },
    {
      key: 'due',
      header: 'End date',
      className: 'is-nowrap',
      render: (project) => {
        const late = project.status !== 'completed' && isOverdueDate(project.endDate)
        return (
          <span className={late ? 'text-danger text-strong' : ''}>
            {formatShortDate(project.endDate)}
          </span>
        )
      },
    },
  ]

  return (
    <DataTable
      columns={columns}
      rows={rows}
      getRowKey={(project) => project.id}
      onRowClick={onSelect}
      rowLabel={(project) => `Open ${project.name}`}
      footer={footer}
    />
  )
}

export default ProjectTable
