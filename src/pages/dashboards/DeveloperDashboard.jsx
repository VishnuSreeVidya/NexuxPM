import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowRight,
  CheckCircle2,
  Clock3,
  ListChecks,
  PlayCircle,
} from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { useData } from '../../hooks/useData'
import { PageHeader } from '../../components/common/PageHeader'
import { StatCard } from '../../components/common/StatCard'
import { Button } from '../../components/common/Button'
import { DonutChart } from '../../components/dashboard/DonutChart'
import { DeadlineList } from '../../components/dashboard/DeadlineList'
import { ActivityFeed } from '../../components/dashboard/ActivityFeed'
import { TaskTable } from '../../components/tasks/TaskTable'
import { TaskDetailsModal } from '../../components/tasks/TaskDetailsModal'
import {
  getOverdueTasks,
  getPersonalTasks,
  getUpcomingTasks,
  getVisibleActivities,
} from '../../utils/selectors'
import { getGreeting } from '../../utils/dateUtils'
import {
  TASK_STATUSES,
  TASK_STATUS_META,
  TASK_STATUS_ORDER,
} from '../../utils/constants'

function taskCountPhrase(count, phrase) {
  return `${count} task${count === 1 ? '' : 's'} ${count === 1 ? 'is' : 'are'} ${phrase}`
}

export function DeveloperDashboard() {
  const { state } = useData()
  const { currentUser } = useAuth()
  const navigate = useNavigate()
  const [selectedTask, setSelectedTask] = useState(null)

  const myTasks = useMemo(
    () => getPersonalTasks(state, currentUser),
    [state, currentUser],
  )
  const overdueTasks = useMemo(() => getOverdueTasks(myTasks), [myTasks])
  const upcomingTasks = useMemo(() => getUpcomingTasks(myTasks, 10), [myTasks])
  const activities = useMemo(
    () => getVisibleActivities(state, currentUser),
    [state, currentUser],
  )

  const statusCounts = useMemo(
    () =>
      TASK_STATUS_ORDER.reduce(
        (counts, status) => ({
          ...counts,
          [status]: myTasks.filter((task) => task.status === status).length,
        }),
        {},
      ),
    [myTasks],
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

  const firstName = currentUser.name.split(' ')[0]
  const completed = statusCounts[TASK_STATUSES.COMPLETED] ?? 0
  const inProgress = statusCounts[TASK_STATUSES.IN_PROGRESS] ?? 0
  const pending = statusCounts[TASK_STATUSES.TODO] ?? 0

  return (
    <>
      <PageHeader
        eyebrow="Developer · Personal workstream"
        title={`${getGreeting()}, ${firstName}`}
        description={`You have ${myTasks.length} assigned task${myTasks.length === 1 ? '' : 's'}. ${taskCountPhrase(inProgress, 'in progress')} and ${taskCountPhrase(pending, 'waiting to start')}. Submit completed implementation for QA review — final completion is owned by the quality gate.${overdueTasks.length ? ` ${taskCountPhrase(overdueTasks.length, 'overdue')}.` : ''}`}
        actions={
          <Button variant="secondary" icon={ListChecks} onClick={() => navigate('/tasks')}>
            Open my task list
          </Button>
        }
      />

      <section className="stat-grid" aria-label="Developer task statistics">
        <StatCard
          icon={ListChecks}
          label="My assigned tasks"
          value={myTasks.length}
          meta={overdueTasks.length ? `${overdueTasks.length} overdue` : 'All on schedule'}
          tone="primary"
          trend="Assigned"
          trendTone={overdueTasks.length ? 'danger' : ''}
        />
        <StatCard
          icon={PlayCircle}
          label="In progress"
          value={inProgress}
          meta="Currently being implemented"
          tone="info"
          trend="Focus"
        />
        <StatCard
          icon={Clock3}
          label="Pending"
          value={pending}
          meta="Not started yet"
          tone="warning"
          trend="Backlog"
        />
        <StatCard
          icon={CheckCircle2}
          label="Completed"
          value={completed}
          meta="Verified by QA"
          tone="success"
          trend="Delivered"
        />
      </section>

      <div className="dashboard-grid">
        <section className="panel dashboard-panel dash-span-4">
          <div className="panel__header">
            <div>
              <h2 className="panel__title">My work progress</h2>
              <p className="panel__subtitle">Status distribution of assigned tasks</p>
            </div>
          </div>
          <div className="panel__body">
            <DonutChart
              data={statusData}
              totalLabel="My tasks"
              size={130}
              thickness={14}
            />
          </div>
        </section>

        <section className="panel dashboard-panel dash-span-4">
          <div className="panel__header">
            <div>
              <h2 className="panel__title">Upcoming deadlines</h2>
              <p className="panel__subtitle">Due within the next 10 days</p>
            </div>
          </div>
          <div className="panel__body">
            <DeadlineList
              tasks={upcomingTasks}
              projects={state.projects}
              limit={4}
              emptyTitle="No upcoming deadlines"
              emptyDescription="You have no tasks due in the next 10 days."
            />
          </div>
        </section>

        <section className="panel dashboard-panel dash-span-4">
          <div className="panel__header">
            <div>
              <h2 className="panel__title">Recent activity</h2>
              <p className="panel__subtitle">Your latest workspace updates</p>
            </div>
          </div>
          <div className="panel__body">
            <ActivityFeed
              activities={activities}
              users={state.users}
              projects={state.projects}
              limit={5}
              emptyTitle="No recent activity"
            />
          </div>
        </section>

        <section className="panel dashboard-panel dash-span-12">
          <div className="panel__header">
            <div>
              <h2 className="panel__title">My tasks</h2>
              <p className="panel__subtitle">
                Work assigned to you across all active projects. Select a task to review
                details.
              </p>
            </div>
            <button type="button" className="panel-link" onClick={() => navigate('/tasks')}>
              View all tasks
              <ArrowRight size={12} aria-hidden="true" />
            </button>
          </div>
          <div className="panel__body">
            <TaskTable
              state={state}
              tasks={myTasks}
              limit={8}
              onSelect={setSelectedTask}
              footer={
                <>
                  <span>Showing {Math.min(8, myTasks.length)} of {myTasks.length} tasks</span>
                  <span>{inProgress} in progress</span>
                </>
              }
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

export default DeveloperDashboard
