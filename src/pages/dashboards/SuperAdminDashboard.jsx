import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowRight,
  CheckCircle2,
  FolderKanban,
  Rocket,
  Users,
} from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { useData } from '../../hooks/useData'
import { PageHeader } from '../../components/common/PageHeader'
import { StatCard } from '../../components/common/StatCard'
import { Button } from '../../components/common/Button'
import { DonutChart } from '../../components/dashboard/DonutChart'
import { ProjectTable } from '../../components/dashboard/ProjectTable'
import { ProgressList } from '../../components/dashboard/ProgressList'
import { ActivityFeed } from '../../components/dashboard/ActivityFeed'
import { ProjectDetailsModal } from '../../components/projects/ProjectDetailsModal'
import {
  getProjectProgress,
  getVisibleActivities,
} from '../../utils/selectors'
import { getGreeting } from '../../utils/dateUtils'
import {
  PROJECT_STATUSES,
  PROJECT_STATUS_META,
  ROLES,
  TASK_STATUSES,
} from '../../utils/constants'

const STATUS_ORDER = [
  PROJECT_STATUSES.ACTIVE,
  PROJECT_STATUSES.PLANNING,
  PROJECT_STATUSES.ON_HOLD,
  PROJECT_STATUSES.COMPLETED,
]

export function SuperAdminDashboard() {
  const { state } = useData()
  const { currentUser } = useAuth()
  const navigate = useNavigate()
  const [selectedProject, setSelectedProject] = useState(null)

  const activeProjects = state.projects.filter(
    (project) => project.status === PROJECT_STATUSES.ACTIVE,
  )
  const completedProjects = state.projects.filter(
    (project) => project.status === PROJECT_STATUSES.COMPLETED,
  )
  const teamMembers = state.users.filter((user) => user.role !== ROLES.SUPER_ADMIN)
  const completedTasks = state.tasks.filter(
    (task) => task.status === TASK_STATUSES.COMPLETED,
  ).length

  const portfolioData = useMemo(
    () =>
      Object.values(PROJECT_STATUSES).map((status) => ({
        label: PROJECT_STATUS_META[status].label,
        value: state.projects.filter((project) => project.status === status).length,
        color: PROJECT_STATUS_META[status].color,
      })),
    [state.projects],
  )

  const overviewProjects = useMemo(
    () =>
      [...state.projects].sort((a, b) => {
        const statusDiff = STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status)
        if (statusDiff !== 0) return statusDiff
        return a.endDate.localeCompare(b.endDate)
      }),
    [state.projects],
  )

  const progressItems = useMemo(
    () =>
      state.projects
        .filter((project) => project.status !== PROJECT_STATUSES.COMPLETED)
        .map((project) => ({
          id: project.id,
          label: project.name,
          meta: `${project.code} · ${state.users.find((user) => user.id === project.leadId)?.name ?? 'No lead'}`,
          value: getProjectProgress(state, project.id),
        }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 5),
    [state],
  )

  const activities = useMemo(
    () => getVisibleActivities(state, currentUser),
    [state, currentUser],
  )

  const firstName = currentUser.name.split(' ')[0]

  return (
    <>
      <PageHeader
        eyebrow="Super Admin · Organization overview"
        title={`${getGreeting()}, ${firstName}`}
        description={`You have ${state.projects.length} projects and ${teamMembers.length} delivery team members across the organization. ${completedTasks} tasks have passed the quality gate.`}
        actions={
          <Button
            variant="secondary"
            icon={FolderKanban}
            onClick={() => navigate('/projects')}
          >
            Open project portfolio
          </Button>
        }
      />

      <section className="stat-grid" aria-label="Organization statistics">
        <StatCard
          icon={FolderKanban}
          label="Total projects"
          value={state.projects.length}
          meta={`${activeProjects.length} active right now`}
          tone="primary"
          trend="Portfolio"
        />
        <StatCard
          icon={Rocket}
          label="Active projects"
          value={activeProjects.length}
          meta="Currently in delivery"
          tone="info"
          trend="In flight"
        />
        <StatCard
          icon={CheckCircle2}
          label="Completed projects"
          value={completedProjects.length}
          meta="Delivered programs"
          tone="success"
          trend="Closed"
        />
        <StatCard
          icon={Users}
          label="Team members"
          value={teamMembers.length}
          meta="Across 4 delivery roles"
          tone="violet"
          trend="People"
        />
      </section>

      <div className="dashboard-grid">
        <section className="panel dashboard-panel dash-span-8">
          <div className="panel__header">
            <div>
              <h2 className="panel__title">Project portfolio</h2>
              <p className="panel__subtitle">
                Projects ordered by delivery status and upcoming end date.
              </p>
            </div>
            <button type="button" className="panel-link" onClick={() => navigate('/projects')}>
              View all
              <ArrowRight size={12} aria-hidden="true" />
            </button>
          </div>
          <div className="panel__body">
            <ProjectTable
              state={state}
              projects={overviewProjects}
              limit={5}
              onSelect={setSelectedProject}
              footer={
                <>
                  <span>
                    Showing {Math.min(5, overviewProjects.length)} of {overviewProjects.length}{' '}
                    projects
                  </span>
                  <span>{activeProjects.length} active</span>
                </>
              }
            />
          </div>
        </section>

        <section className="panel dashboard-panel dash-span-4">
          <div className="panel__header">
            <div>
              <h2 className="panel__title">Delivery portfolio</h2>
              <p className="panel__subtitle">Distribution of project health</p>
            </div>
          </div>
          <div className="panel__body">
            <DonutChart
              data={portfolioData}
              totalLabel="Projects"
              size={146}
              thickness={15}
            />
          </div>
        </section>

        <section className="panel dashboard-panel dash-span-7">
          <div className="panel__header">
            <div>
              <h2 className="panel__title">Project progress</h2>
              <p className="panel__subtitle">
                Completion based on tasks that passed the QA gate.
              </p>
            </div>
            <span className="badge badge--neutral">Active portfolio</span>
          </div>
          <div className="panel__body">
            <ProgressList items={progressItems} />
          </div>
        </section>

        <section className="panel dashboard-panel dash-span-5">
          <div className="panel__header">
            <div>
              <h2 className="panel__title">Recent activity</h2>
              <p className="panel__subtitle">Latest updates across all projects</p>
            </div>
            <button type="button" className="panel-link" onClick={() => navigate('/activity')}>
              Activity log
              <ArrowRight size={12} aria-hidden="true" />
            </button>
          </div>
          <div className="panel__body">
            <ActivityFeed
              activities={activities}
              users={state.users}
              projects={state.projects}
              limit={5}
            />
          </div>
        </section>
      </div>

      <ProjectDetailsModal
        open={Boolean(selectedProject)}
        project={selectedProject}
        state={state}
        onClose={() => setSelectedProject(null)}
      />
    </>
  )
}

export default SuperAdminDashboard
