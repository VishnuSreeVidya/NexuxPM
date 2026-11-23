import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock3,
  FolderKanban,
  ListChecks,
  Users,
} from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { useData } from '../../hooks/useData'
import { PageHeader } from '../../components/common/PageHeader'
import { StatCard } from '../../components/common/StatCard'
import { Button } from '../../components/common/Button'
import { Avatar } from '../../components/common/Avatar'
import { DataTable } from '../../components/common/DataTable'
import { EmptyState } from '../../components/common/EmptyState'
import { DonutChart } from '../../components/dashboard/DonutChart'
import { WorkloadList } from '../../components/dashboard/WorkloadList'
import { CompactTaskList } from '../../components/dashboard/CompactTaskList'
import { ActivityFeed } from '../../components/dashboard/ActivityFeed'
import { TaskDetailsModal } from '../../components/tasks/TaskDetailsModal'
import {
  getOverdueTasks,
  getVisibleActivities,
  getVisibleProjects,
  getVisibleTasks,
} from '../../utils/selectors'
import { getGreeting } from '../../utils/dateUtils'
import {
  TASK_STATUSES,
  TASK_STATUS_META,
  TASK_STATUS_ORDER,
} from '../../utils/constants'

export function TeamLeaderDashboard() {
  const { state } = useData()
  const { currentUser } = useAuth()
  const navigate = useNavigate()
  const [selectedTask, setSelectedTask] = useState(null)

  const projects = useMemo(
    () => getVisibleProjects(state, currentUser),
    [state, currentUser],
  )
  const tasks = useMemo(() => getVisibleTasks(state, currentUser), [state, currentUser])
  const overdueTasks = useMemo(() => getOverdueTasks(tasks), [tasks])

  const statusCounts = useMemo(
    () =>
      TASK_STATUS_ORDER.reduce(
        (counts, status) => ({
          ...counts,
          [status]: tasks.filter((task) => task.status === status).length,
        }),
        {},
      ),
    [tasks],
  )

  const statusData = useMemo(
    () =>
      TASK_STATUS_ORDER.map((status) => ({
        label: TASK_STATUS_META[status].label,
        value: statusCounts[status] ?? 0,
        color: TASK_STATUS_META[status].color,
      })),
    [statusCounts],
  )

  const teamRows = useMemo(() => {
    const memberIds = new Set()
    tasks.forEach((task) => {
      if (task.assigneeId) memberIds.add(task.assigneeId)
      if (task.qaId) memberIds.add(task.qaId)
    })
    return state.users
      .filter((user) => memberIds.has(user.id))
      .map((user) => {
        const memberTasks = tasks.filter(
          (task) => task.assigneeId === user.id || task.qaId === user.id,
        )
        const open = memberTasks.filter(
          (task) => task.status !== TASK_STATUSES.COMPLETED,
        ).length
        const completed = memberTasks.filter(
          (task) => task.status === TASK_STATUSES.COMPLETED,
        ).length
        const overdue = memberTasks.filter(
          (task) => task.status !== TASK_STATUSES.COMPLETED && overdueTasks.includes(task),
        ).length
        return { user, total: memberTasks.length, open, completed, overdue }
      })
      .sort((a, b) => b.open - a.open || a.user.name.localeCompare(b.user.name))
  }, [tasks, state.users, overdueTasks])

  const activities = useMemo(
    () => getVisibleActivities(state, currentUser),
    [state, currentUser],
  )

  const completionRate = tasks.length
    ? Math.round(((statusCounts[TASK_STATUSES.COMPLETED] ?? 0) / tasks.length) * 100)
    : 0
  const pendingCount =
    (statusCounts[TASK_STATUSES.TODO] ?? 0) + (statusCounts[TASK_STATUSES.IN_PROGRESS] ?? 0)
  const firstName = currentUser.name.split(' ')[0]

  const columns = [
    {
      key: 'member',
      header: 'Team member',
      render: (row) => (
        <div className="table-user">
          <Avatar
            name={row.user.name}
            userId={row.user.id}
            color={row.user.avatarColor}
            size="sm"
          />
          <div className="table-user__meta">
            <div className="table-user__name">{row.user.name}</div>
            <div className="table-user__sub">{row.user.title}</div>
          </div>
        </div>
      ),
    },
    {
      key: 'role',
      header: 'Role',
      render: (row) => (
        <span className="badge badge--neutral">{row.user.department}</span>
      ),
    },
    {
      key: 'assigned',
      header: 'Assigned',
      render: (row) => <span className="text-strong">{row.total}</span>,
    },
    {
      key: 'open',
      header: 'Open',
      render: (row) => <span>{row.open}</span>,
    },
    {
      key: 'completed',
      header: 'Completed',
      render: (row) => <span className="text-success text-strong">{row.completed}</span>,
    },
    {
      key: 'overdue',
      header: 'Overdue',
      render: (row) => (
        <span className={row.overdue ? 'text-danger text-strong' : 'text-muted'}>
          {row.overdue}
        </span>
      ),
    },
  ]

  return (
    <>
      <PageHeader
        eyebrow="Team Leader · Delivery execution"
        title={`${getGreeting()}, ${firstName}`}
        description={`You are coordinating ${tasks.length} tasks across ${projects.length} projects. The team has completed ${completionRate}% of assigned work, with ${overdueTasks.length} overdue items needing a revised plan.`}
        actions={
          <Button variant="secondary" icon={ListChecks} onClick={() => navigate('/tasks')}>
            View team tasks
          </Button>
        }
      />

      <section className="stat-grid stat-grid--five" aria-label="Team delivery statistics">
        <StatCard
          icon={FolderKanban}
          label="Assigned projects"
          value={projects.length}
          meta="Projects you lead"
          tone="primary"
          trend="Portfolio"
        />
        <StatCard
          icon={ListChecks}
          label="Total tasks"
          value={tasks.length}
          meta="Across your projects"
          tone="info"
          trend="Workload"
        />
        <StatCard
          icon={Clock3}
          label="Pending"
          value={pendingCount}
          meta="To do and in progress"
          tone="warning"
          trend="Active work"
        />
        <StatCard
          icon={CheckCircle2}
          label="Completed"
          value={statusCounts[TASK_STATUSES.COMPLETED] ?? 0}
          meta={`${completionRate}% completion rate`}
          tone="success"
          trend="Passed QA"
        />
        <StatCard
          icon={AlertTriangle}
          label="Overdue"
          value={overdueTasks.length}
          meta="Past their due date"
          tone="danger"
          trend={overdueTasks.length ? 'Needs action' : 'On track'}
          trendTone={overdueTasks.length ? 'danger' : 'success'}
        />
      </section>

      <div className="dashboard-grid">
        <section className="panel dashboard-panel dash-span-4">
          <div className="panel__header">
            <div>
              <h2 className="panel__title">Task distribution</h2>
              <p className="panel__subtitle">Workflow status across your team</p>
            </div>
          </div>
          <div className="panel__body">
            <DonutChart
              data={statusData}
              totalLabel="Tasks"
              size={130}
              thickness={14}
            />
          </div>
        </section>

        <section className="panel dashboard-panel dash-span-4">
          <div className="panel__header">
            <div>
              <h2 className="panel__title">Team workload</h2>
              <p className="panel__subtitle">Open assignments by team member</p>
            </div>
            <span className="badge badge--neutral">
              <Users size={11} aria-hidden="true" />
              {teamRows.length}
            </span>
          </div>
          <div className="panel__body">
            <WorkloadList
              items={teamRows}
              limit={5}
              emptyTitle="No active assignments"
            />
          </div>
        </section>

        <section className="panel dashboard-panel dash-span-4">
          <div className="panel__header">
            <div>
              <h2 className="panel__title">Overdue tasks</h2>
              <p className="panel__subtitle">Work that needs a new plan</p>
            </div>
            <span
              className={`badge ${overdueTasks.length ? 'badge--danger' : 'badge--success'}`}
            >
              {overdueTasks.length}
            </span>
          </div>
          <div className="panel__body">
            <CompactTaskList
              tasks={overdueTasks}
              projects={state.projects}
              users={state.users}
              limit={4}
              showAssignee
              onSelect={setSelectedTask}
              emptyTitle="No overdue tasks"
              emptyDescription="Your team is on schedule."
            />
          </div>
        </section>

        <section className="panel dashboard-panel dash-span-8">
          <div className="panel__header">
            <div>
              <h2 className="panel__title">Task assignment overview</h2>
              <p className="panel__subtitle">
                Developer and QA ownership across your projects.
              </p>
            </div>
            <button type="button" className="panel-link" onClick={() => navigate('/tasks')}>
              All tasks
              <ArrowRight size={12} aria-hidden="true" />
            </button>
          </div>
          <div className="panel__body">
            {teamRows.length ? (
              <DataTable
                columns={columns}
                rows={teamRows}
                getRowKey={(row) => row.user.id}
              />
            ) : (
              <EmptyState
                icon={Users}
                title="No team assignments"
                description="Create and assign tasks to start tracking team workload."
              />
            )}
          </div>
        </section>

        <section className="panel dashboard-panel dash-span-4">
          <div className="panel__header">
            <div>
              <h2 className="panel__title">Recent activity</h2>
              <p className="panel__subtitle">Updates from your delivery team</p>
            </div>
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

      <TaskDetailsModal
        open={Boolean(selectedTask)}
        task={selectedTask}
        state={state}
        onClose={() => setSelectedTask(null)}
      />
    </>
  )
}

export default TeamLeaderDashboard
