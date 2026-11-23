import { useMemo, useState } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { useData } from '../../hooks/useData'
import { useDebounce } from '../../hooks/useDebounce'
import { PageHeader } from '../../components/common/PageHeader'
import { Button } from '../../components/common/Button'
import { FilterBar } from '../../components/common/FilterBar'
import { TaskTable } from '../../components/tasks/TaskTable'
import { TaskDetailsModal } from '../../components/tasks/TaskDetailsModal'
import { getVisibleTasks } from '../../utils/selectors'
import { TaskCreateModal } from '../../components/workflow/WorkflowForms'
import { usePermission } from '../../hooks/usePermission'
import { PERMISSIONS } from '../../utils/permissions'
import { Plus } from 'lucide-react'
import {
  ROLES,
  TASK_PRIORITIES,
  TASK_PRIORITY_META,
  TASK_STATUSES,
  TASK_STATUS_META,
  TASK_STATUS_ORDER,
} from '../../utils/constants'

const ROLE_COPY = {
  [ROLES.SUPER_ADMIN]: {
    eyebrow: 'Super Admin · Task oversight',
    description:
      'A read-only view of every task in the organization, including QA ownership and workflow status.',
    title: 'All tasks',
  },
  [ROLES.TEAM_LEADER]: {
    eyebrow: 'Team Leader · Task execution',
    description:
      'Tasks across the projects you lead. Developers implement, QA verifies, and you coordinate delivery.',
    title: 'Team tasks',
  },
  [ROLES.PROJECT_LEAD]: {
    eyebrow: 'Project Lead · Delivery oversight',
    description:
      'A read-only view of tasks across your assigned projects, including delivery progress and QA ownership.',
    title: 'Project tasks',
  },
  [ROLES.DEVELOPER]: {
    eyebrow: 'Developer · My workstream',
    description:
      'Your assigned implementation tasks. Complete the work and submit it for review; QA owns final verification.',
    title: 'My tasks',
  },
  [ROLES.QA_ENGINEER]: {
    eyebrow: 'QA Engineer · Quality queue',
    description:
      'Tasks where you own quality verification. A task reaches completion only after passing the QA gate.',
    title: 'My testing tasks',
  },
}

export function TasksPage() {
  const { state, tasksLoading, tasksError } = useData()
  const { currentUser, reloadTasks } = useAuth()
  const { can } = usePermission()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [priorityFilter, setPriorityFilter] = useState('all')
  const [projectFilter, setProjectFilter] = useState('all')
  const [selectedTask, setSelectedTask] = useState(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [retrying, setRetrying] = useState(false)
  const debouncedSearch = useDebounce(search, 200)

  const visibleTasks = useMemo(
    () => getVisibleTasks(state, currentUser),
    [state, currentUser],
  )

  const scopedTasks = useMemo(() => {
    if (currentUser.role === ROLES.DEVELOPER) {
      return visibleTasks.filter((task) => task.assigneeId === currentUser.id)
    }
    if (currentUser.role === ROLES.QA_ENGINEER) {
      return visibleTasks.filter((task) => task.qaId === currentUser.id)
    }
    return visibleTasks
  }, [visibleTasks, currentUser])

  const projectOptions = useMemo(() => {
    const ids = new Set(scopedTasks.map((task) => task.projectId))
    return state.projects
      .filter((project) => ids.has(project.id))
      .map((project) => ({ value: project.id, label: project.name }))
  }, [scopedTasks, state.projects])

  const filteredTasks = useMemo(() => {
    const query = debouncedSearch.trim().toLowerCase()
    return scopedTasks
      .filter((task) => {
        if (statusFilter !== 'all' && task.status !== statusFilter) return false
        if (priorityFilter !== 'all' && task.priority !== priorityFilter) return false
        if (projectFilter !== 'all' && task.projectId !== projectFilter) return false
        if (!query) return true
        const project = state.projects.find((item) => item.id === task.projectId)
        const assignee = state.users.find((user) => user.id === task.assigneeId)
        const qa = state.users.find((user) => user.id === task.qaId)
        return [task.title, task.description, project?.name ?? '', assignee?.name ?? '', qa?.name ?? '']
          .join(' ')
          .toLowerCase()
          .includes(query)
      })
      .sort((a, b) => {
        if (a.status === TASK_STATUSES.COMPLETED && b.status !== TASK_STATUSES.COMPLETED) return 1
        if (b.status === TASK_STATUSES.COMPLETED && a.status !== TASK_STATUSES.COMPLETED) return -1
        return (a.dueDate ?? '').localeCompare(b.dueDate ?? '')
      })
  }, [
    scopedTasks,
    state.projects,
    state.users,
    debouncedSearch,
    statusFilter,
    priorityFilter,
    projectFilter,
  ])

  const hasActiveFilters =
    Boolean(search.trim()) ||
    statusFilter !== 'all' ||
    priorityFilter !== 'all' ||
    projectFilter !== 'all'
  const copy = ROLE_COPY[currentUser.role] ?? ROLE_COPY[ROLES.TEAM_LEADER]

  async function retryTasks() {
    setRetrying(true)
    try {
      await reloadTasks()
    } finally {
      setRetrying(false)
    }
  }

  function resetFilters() {
    setSearch('')
    setStatusFilter('all')
    setPriorityFilter('all')
    setProjectFilter('all')
  }

  const totalOpen = scopedTasks.filter(
    (task) => task.status !== TASK_STATUSES.COMPLETED,
  ).length

  return (
    <>
      <PageHeader
        eyebrow={copy.eyebrow}
        title={copy.title}
        description={copy.description}
        actions={<div className="header-actions">
          <span className="badge badge--neutral">{totalOpen} open · {scopedTasks.length} total</span>
          {can(PERMISSIONS.TASK_CREATE) ? <Button icon={Plus} onClick={() => setCreateOpen(true)}>New task</Button> : null}
        </div>}
      />

      <FilterBar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search tasks, projects, or people…"
        filters={[
          {
            key: 'status',
            label: 'Task status',
            value: statusFilter,
            onChange: setStatusFilter,
            options: [
              { value: 'all', label: 'All statuses' },
              ...TASK_STATUS_ORDER.map((status) => ({
                value: status,
                label: TASK_STATUS_META[status].label,
              })),
            ],
          },
          {
            key: 'priority',
            label: 'Task priority',
            value: priorityFilter,
            onChange: setPriorityFilter,
            options: [
              { value: 'all', label: 'All priorities' },
              ...Object.values(TASK_PRIORITIES).map((priority) => ({
                value: priority,
                label: TASK_PRIORITY_META[priority].label,
              })),
            ],
          },
          {
            key: 'project',
            label: 'Project',
            value: projectFilter,
            onChange: setProjectFilter,
            options: [{ value: 'all', label: 'All projects' }, ...projectOptions],
          },
        ]}
        resultCount={filteredTasks.length}
        resultLabel="tasks"
        onReset={resetFilters}
        hasActiveFilters={hasActiveFilters}
      />

      <section className="panel dashboard-panel">
        <div className="panel__header">
          <div>
            <h2 className="panel__title">Task register</h2>
            <p className="panel__subtitle">
              Select a task to review its description, people, dates, and comments.
            </p>
          </div>
          <span className="badge badge--neutral">{filteredTasks.length} shown</span>
        </div>
        <div className="panel__body">
          {tasksError ? (
            <div className="alert alert--danger" role="alert">
              <span>{tasksError}</span>
              <Button variant="secondary" size="sm" onClick={retryTasks} disabled={retrying}>
                {retrying ? 'Retrying…' : 'Retry'}
              </Button>
            </div>
          ) : tasksLoading ? (
            <p className="form-hint" role="status">Loading tasks…</p>
          ) : (
            <TaskTable
              state={state}
              tasks={filteredTasks}
              onSelect={setSelectedTask}
              footer={
                <>
                  <span>
                    Showing {filteredTasks.length} of {scopedTasks.length} tasks
                  </span>
                  <span>{totalOpen} open</span>
                </>
              }
            />
          )}
        </div>
      </section>

      <TaskDetailsModal
        open={Boolean(selectedTask)}
        task={selectedTask}
        state={state}
        onClose={() => setSelectedTask(null)}
      />
      <TaskCreateModal open={createOpen} onClose={() => setCreateOpen(false)} />
    </>
  )
}

export default TasksPage
