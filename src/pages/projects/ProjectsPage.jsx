import { useMemo, useState } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { useData } from '../../hooks/useData'
import { useDebounce } from '../../hooks/useDebounce'
import { PageHeader } from '../../components/common/PageHeader'
import { Button } from '../../components/common/Button'
import { FilterBar } from '../../components/common/FilterBar'
import { ProjectTable } from '../../components/dashboard/ProjectTable'
import { ProjectDetailsModal } from '../../components/projects/ProjectDetailsModal'
import { EmptyState } from '../../components/common/EmptyState'
import { getVisibleProjects } from '../../utils/selectors'
import { ProjectCreateModal } from '../../components/workflow/WorkflowForms'
import { usePermission } from '../../hooks/usePermission'
import { PERMISSIONS } from '../../utils/permissions'
import { Plus, RotateCcw } from 'lucide-react'
import {
  PROJECT_STATUSES,
  PROJECT_STATUS_META,
  ROLES,
  TASK_PRIORITIES,
  TASK_PRIORITY_META,
} from '../../utils/constants'

const ROLE_COPY = {
  [ROLES.SUPER_ADMIN]: {
    eyebrow: 'Super Admin · Project portfolio',
    description:
      'Every delivery project across the organization. The Super Admin creates projects and assigns the Project Lead who owns delivery.',
  },
  [ROLES.PROJECT_LEAD]: {
    eyebrow: 'Project Lead · Assigned portfolio',
    description:
      'Projects assigned to you by the Super Admin. You own delivery health and assign the Team Leaders who will coordinate execution.',
  },
  [ROLES.TEAM_LEADER]: {
    eyebrow: 'Team Leader · Delivery projects',
    description:
      'Projects where you lead team execution. Create and assign tasks, then coordinate the work through QA verification.',
  },
}

export function ProjectsPage() {
  const { state, projectsLoading, projectsError } = useData()
  const { currentUser, reloadProjects } = useAuth()
  const { can } = usePermission()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [priorityFilter, setPriorityFilter] = useState('all')
  const [selectedProject, setSelectedProject] = useState(null)
  const [createOpen, setCreateOpen] = useState(false)
  const debouncedSearch = useDebounce(search, 200)

  const projects = useMemo(
    () => getVisibleProjects(state, currentUser),
    [state, currentUser],
  )

  const filteredProjects = useMemo(() => {
    const query = debouncedSearch.trim().toLowerCase()
    return projects.filter((project) => {
      if (statusFilter !== 'all' && project.status !== statusFilter) return false
      if (priorityFilter !== 'all' && project.priority !== priorityFilter) return false
      if (!query) return true
      const lead = state.users.find((user) => user.id === project.leadId)
      return [project.name, project.code, project.description, lead?.name ?? '']
        .join(' ')
        .toLowerCase()
        .includes(query)
    })
  }, [projects, state.users, debouncedSearch, statusFilter, priorityFilter])

  const hasActiveFilters =
    Boolean(search.trim()) || statusFilter !== 'all' || priorityFilter !== 'all'
  const copy = ROLE_COPY[currentUser.role] ?? ROLE_COPY[ROLES.SUPER_ADMIN]

  function resetFilters() {
    setSearch('')
    setStatusFilter('all')
    setPriorityFilter('all')
  }

  return (
    <>
      <PageHeader
        eyebrow={copy.eyebrow}
        title="Projects"
        description={copy.description}
        actions={can(PERMISSIONS.PROJECT_CREATE)
          ? <Button icon={Plus} onClick={() => setCreateOpen(true)}>New project</Button>
          : <span className="badge badge--neutral">{currentUser.role === ROLES.PROJECT_LEAD ? 'Assign Team Leaders from project details' : 'Project portfolio'}</span>}
      />

      <FilterBar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search by project name, code, or lead…"
        filters={[
          {
            key: 'status',
            label: 'Project status',
            value: statusFilter,
            onChange: setStatusFilter,
            options: [
              { value: 'all', label: 'All statuses' },
              ...Object.values(PROJECT_STATUSES).map((status) => ({
                value: status,
                label: PROJECT_STATUS_META[status].label,
              })),
            ],
          },
          {
            key: 'priority',
            label: 'Project priority',
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
        ]}
        resultCount={filteredProjects.length}
        resultLabel="projects"
        onReset={resetFilters}
        hasActiveFilters={hasActiveFilters}
      />

      <section className="panel dashboard-panel">
        <div className="panel__header">
          <div>
            <h2 className="panel__title">Project portfolio</h2>
            <p className="panel__subtitle">
              Select a project to review progress, team coverage, and milestones.
            </p>
          </div>
          <span className="badge badge--neutral">{projects.length} total</span>
        </div>
        <div className="panel__body">
          {projectsLoading ? (
            <p className="text-small text-muted" role="status">Loading your projects…</p>
          ) : projectsError ? (
            <EmptyState
              title="Projects unavailable"
              description={projectsError}
              action={<Button icon={RotateCcw} onClick={reloadProjects}>Try again</Button>}
            />
          ) : (
            <ProjectTable
              state={state}
              projects={filteredProjects}
              onSelect={setSelectedProject}
              footer={
                <>
                  <span>
                    Showing {filteredProjects.length} of {projects.length} projects
                  </span>
                  <span>
                    {projects.filter((project) => project.status === PROJECT_STATUSES.ACTIVE).length}{' '}
                    active
                  </span>
                </>
              }
            />
          )}
        </div>
      </section>

      <ProjectDetailsModal
        open={Boolean(selectedProject)}
        project={selectedProject}
        state={state}
        onClose={() => setSelectedProject(null)}
      />
      <ProjectCreateModal open={createOpen} onClose={() => setCreateOpen(false)} />
    </>
  )
}

export default ProjectsPage
