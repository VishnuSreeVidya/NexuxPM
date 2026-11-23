import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  AlertTriangle,
  ArrowRight,
  CalendarClock,
  Flag,
  FolderKanban,
  TrendingUp,
  Users,
} from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { useData } from '../../hooks/useData'
import { PageHeader } from '../../components/common/PageHeader'
import { StatCard } from '../../components/common/StatCard'
import { Button } from '../../components/common/Button'
import { Avatar } from '../../components/common/Avatar'
import { EmptyState } from '../../components/common/EmptyState'
import { DonutChart } from '../../components/dashboard/DonutChart'
import { ProjectTable } from '../../components/dashboard/ProjectTable'
import { ActivityFeed } from '../../components/dashboard/ActivityFeed'
import { ProjectDetailsModal } from '../../components/projects/ProjectDetailsModal'
import {
  getAverageProgress,
  getOverdueTasks,
  getVisibleActivities,
  getVisibleProjects,
  getVisibleTasks,
} from '../../utils/selectors'
import {
  formatDate,
  getDueLabel,
  getGreeting,
  isOverdueDate,
  parseLocalDate,
} from '../../utils/dateUtils'
import {
  MILESTONE_STATUSES,
  MILESTONE_STATUS_META,
  PROJECT_STATUSES,
  TASK_STATUSES,
} from '../../utils/constants'

const MILESTONE_COLORS = {
  [MILESTONE_STATUSES.PENDING]: '#94a3b8',
  [MILESTONE_STATUSES.IN_PROGRESS]: '#2563eb',
  [MILESTONE_STATUSES.COMPLETED]: '#16a34a',
  [MILESTONE_STATUSES.DELAYED]: '#dc2626',
}

export function ProjectLeadDashboard() {
  const { state } = useData()
  const { currentUser } = useAuth()
  const navigate = useNavigate()
  const [selectedProject, setSelectedProject] = useState(null)

  const projects = useMemo(
    () => getVisibleProjects(state, currentUser),
    [state, currentUser],
  )
  const projectIds = useMemo(() => new Set(projects.map((project) => project.id)), [projects])
  const tasks = useMemo(() => getVisibleTasks(state, currentUser), [state, currentUser])
  const activeProjects = projects.filter(
    (project) => project.status === PROJECT_STATUSES.ACTIVE,
  )
  const averageProgress = getAverageProgress(state, projects)
  const overdueTasks = getOverdueTasks(tasks)

  const milestones = useMemo(
    () =>
      state.milestones
        .filter((milestone) => projectIds.has(milestone.projectId))
        .sort((a, b) => a.dueDate.localeCompare(b.dueDate)),
    [state.milestones, projectIds],
  )
  const pendingMilestones = milestones.filter(
    (milestone) => milestone.status !== MILESTONE_STATUSES.COMPLETED,
  )

  const milestoneData = useMemo(
    () =>
      Object.values(MILESTONE_STATUSES).map((status) => ({
        label: MILESTONE_STATUS_META[status].label,
        value: milestones.filter((milestone) => milestone.status === status).length,
        color: MILESTONE_COLORS[status],
      })),
    [milestones],
  )

  const teamLeaders = useMemo(() => {
    const ids = new Set(projects.flatMap((project) => project.teamLeaderIds ?? []))
    return state.users.filter((user) => ids.has(user.id))
  }, [projects, state.users])

  const leaderWorkload = useMemo(
    () =>
      teamLeaders
        .map((leader) => {
          const ledProjects = projects.filter((project) =>
            project.teamLeaderIds?.includes(leader.id),
          )
          const ledProjectIds = new Set(ledProjects.map((project) => project.id))
          const leaderTasks = state.tasks.filter((task) => ledProjectIds.has(task.projectId))
          return {
            leader,
            projectsLed: ledProjects,
            open: leaderTasks.filter((task) => task.status !== TASK_STATUSES.COMPLETED).length,
            overdue: leaderTasks.filter(
              (task) => task.status !== TASK_STATUSES.COMPLETED && isOverdueDate(task.dueDate),
            ).length,
          }
        })
        .sort((a, b) => b.open - a.open),
    [teamLeaders, projects, state.tasks],
  )

  const projectDeadlines = useMemo(
    () =>
      projects
        .filter((project) => project.status !== PROJECT_STATUSES.COMPLETED)
        .sort((a, b) => a.endDate.localeCompare(b.endDate))
        .slice(0, 5),
    [projects],
  )

  const activities = useMemo(
    () => getVisibleActivities(state, currentUser),
    [state, currentUser],
  )

  const firstName = currentUser.name.split(' ')[0]

  return (
    <>
      <PageHeader
        eyebrow="Project Lead · Delivery ownership"
        title={`${getGreeting()}, ${firstName}`}
        description={`You own ${projects.length} projects with ${tasks.length} delivery tasks. ${overdueTasks.length} tasks need attention, and your Team Leaders are coordinating ${leaderWorkload.reduce((sum, item) => sum + item.open, 0)} open items.`}
        actions={
          <Button
            variant="secondary"
            icon={FolderKanban}
            onClick={() => navigate('/projects')}
          >
            View assigned projects
          </Button>
        }
      />

      <section className="stat-grid" aria-label="Project delivery statistics">
        <StatCard
          icon={FolderKanban}
          label="Assigned projects"
          value={projects.length}
          meta={`${activeProjects.length} active`}
          tone="primary"
          trend="Portfolio"
        />
        <StatCard
          icon={TrendingUp}
          label="Average completion"
          value={`${averageProgress}%`}
          meta="Across assigned projects"
          tone="success"
          trend="Delivery"
        />
        <StatCard
          icon={Flag}
          label="Pending milestones"
          value={pendingMilestones.length}
          meta={`${milestones.length} milestones tracked`}
          tone="warning"
          trend="Checkpoints"
        />
        <StatCard
          icon={AlertTriangle}
          label="Overdue tasks"
          value={overdueTasks.length}
          meta="Across your projects"
          tone="danger"
          trend={overdueTasks.length ? 'Needs review' : 'On track'}
          trendTone={overdueTasks.length ? 'danger' : 'success'}
        />
      </section>

      <div className="dashboard-grid">
        <section className="panel dashboard-panel dash-span-8">
          <div className="panel__header">
            <div>
              <h2 className="panel__title">Assigned projects</h2>
              <p className="panel__subtitle">
                Projects you own from planning through delivery.
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
              projects={projects}
              limit={5}
              onSelect={setSelectedProject}
              footer={
                <>
                  <span>Showing {Math.min(5, projects.length)} of {projects.length} projects</span>
                  <span>{pendingMilestones.length} open milestones</span>
                </>
              }
            />
          </div>
        </section>

        <section className="panel dashboard-panel dash-span-4">
          <div className="panel__header">
            <div>
              <h2 className="panel__title">Milestone health</h2>
              <p className="panel__subtitle">Checkpoints across your portfolio</p>
            </div>
          </div>
          <div className="panel__body">
            <DonutChart
              data={milestoneData}
              totalLabel="Milestones"
              size={132}
              thickness={14}
            />
          </div>
        </section>

        <section className="panel dashboard-panel dash-span-6">
          <div className="panel__header">
            <div>
              <h2 className="panel__title">Project deadlines</h2>
              <p className="panel__subtitle">Upcoming project end dates</p>
            </div>
            <CalendarClock size={16} className="text-muted" aria-hidden="true" />
          </div>
          <div className="panel__body">
            {projectDeadlines.length ? (
              <ul className="deadline-list">
                {projectDeadlines.map((project) => {
                  const date = parseLocalDate(project.endDate)
                  const overdue = isOverdueDate(project.endDate)
                  return (
                    <li
                      className={`deadline-item ${overdue ? 'deadline-item--overdue' : ''}`.trim()}
                      key={project.id}
                    >
                      <span className="deadline-item__date" aria-hidden="true">
                        <span>{date ? formatDate(date, { month: 'short' }) : '—'}</span>
                        <strong>{date ? date.getDate() : '—'}</strong>
                      </span>
                      <div className="deadline-item__body">
                        <p className="deadline-item__title">{project.name}</p>
                        <p className="deadline-item__meta">
                          <span>
                            {project.code} · {project.status.replace('_', ' ')}
                          </span>
                        </p>
                      </div>
                      <span
                        className={`deadline-item__due ${
                          overdue ? 'deadline-item__due--danger' : ''
                        }`.trim()}
                      >
                        {getDueLabel(project.endDate)}
                      </span>
                    </li>
                  )
                })}
              </ul>
            ) : (
              <EmptyState
                icon={CalendarClock}
                title="No active deadlines"
                description="All assigned projects are either complete or unscheduled."
              />
            )}
          </div>
        </section>

        <section className="panel dashboard-panel dash-span-6">
          <div className="panel__header">
            <div>
              <h2 className="panel__title">Team leaders</h2>
              <p className="panel__subtitle">
                Leaders coordinating tasks in your projects
              </p>
            </div>
            <span className="badge badge--neutral">
              <Users size={11} aria-hidden="true" />
              {leaderWorkload.length}
            </span>
          </div>
          <div className="panel__body">
            {leaderWorkload.length ? (
              <div className="team-list">
                {leaderWorkload.map((item) => (
                  <div className="team-member" key={item.leader.id}>
                    <Avatar
                      name={item.leader.name}
                      userId={item.leader.id}
                      color={item.leader.avatarColor}
                      size="sm"
                    />
                    <div className="team-member__body">
                      <div className="team-member__top">
                        <span className="team-member__name">{item.leader.name}</span>
                        <span className="team-member__count">
                          {item.open} open · {item.overdue} late
                        </span>
                      </div>
                      <div className="team-member__role">
                        {item.leader.title} · {item.projectsLed.length} projects
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                icon={Users}
                title="No Team Leaders assigned"
                description="Assign Team Leaders to your projects to begin task planning."
              />
            )}
          </div>
        </section>

        <section className="panel dashboard-panel dash-span-12">
          <div className="panel__header">
            <div>
              <h2 className="panel__title">Recent project updates</h2>
              <p className="panel__subtitle">Activity from your projects and team</p>
            </div>
            <button type="button" className="panel-link" onClick={() => navigate('/activity')}>
              View activity log
              <ArrowRight size={12} aria-hidden="true" />
            </button>
          </div>
          <div className="panel__body">
            <ActivityFeed
              activities={activities}
              users={state.users}
              projects={state.projects}
              limit={6}
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

export default ProjectLeadDashboard
