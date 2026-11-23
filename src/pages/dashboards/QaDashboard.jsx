import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  CheckCircle2,
  ClipboardCheck,
  Clock3,
  FlaskConical,
  ListChecks,
  RotateCcw,
} from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { useData } from '../../hooks/useData'
import { PageHeader } from '../../components/common/PageHeader'
import { StatCard } from '../../components/common/StatCard'
import { Button } from '../../components/common/Button'
import { EmptyState } from '../../components/common/EmptyState'
import { DonutChart } from '../../components/dashboard/DonutChart'
import { CompactTaskList } from '../../components/dashboard/CompactTaskList'
import { BugList } from '../../components/dashboard/BugList'
import { ActivityFeed } from '../../components/dashboard/ActivityFeed'
import { TaskDetailsModal } from '../../components/tasks/TaskDetailsModal'
import {
  getPersonalTasks,
  getQaVerificationQueue,
  getVisibleActivities,
  getVisibleBugs,
} from '../../utils/selectors'
import { getGreeting } from '../../utils/dateUtils'
import {
  BUG_SEVERITIES,
  BUG_SEVERITY_META,
  BUG_STATUSES,
  TASK_STATUSES,
} from '../../utils/constants'

const BUG_STATUS_ORDER = [
  BUG_STATUSES.REOPENED,
  BUG_STATUSES.OPEN,
  BUG_STATUSES.IN_PROGRESS,
  BUG_STATUSES.FIXED,
  BUG_STATUSES.VERIFIED,
]

export function QaDashboard() {
  const { state } = useData()
  const { currentUser } = useAuth()
  const navigate = useNavigate()
  const [selectedTask, setSelectedTask] = useState(null)

  const myTasks = useMemo(
    () => getPersonalTasks(state, currentUser),
    [state, currentUser],
  )
  const testingQueue = useMemo(
    () =>
      myTasks
        .filter((task) =>
          [TASK_STATUSES.IN_REVIEW, TASK_STATUSES.TESTING].includes(task.status),
        )
        .sort((a, b) => a.dueDate.localeCompare(b.dueDate)),
    [myTasks],
  )
  const visibleBugs = useMemo(
    () => getVisibleBugs(state, currentUser),
    [state, currentUser],
  )
  const reportedBugs = useMemo(
    () =>
      visibleBugs
        .filter((bug) => bug.reportedBy === currentUser.id)
        .sort((a, b) => {
          const statusDiff =
            BUG_STATUS_ORDER.indexOf(a.status) - BUG_STATUS_ORDER.indexOf(b.status)
          if (statusDiff !== 0) return statusDiff
          return b.createdAt.localeCompare(a.createdAt)
        }),
    [visibleBugs, currentUser.id],
  )
  const verificationQueue = useMemo(
    () => getQaVerificationQueue(state, currentUser),
    [state, currentUser],
  )
  const activities = useMemo(
    () => getVisibleActivities(state, currentUser),
    [state, currentUser],
  )

  const inReview = myTasks.filter((task) => task.status === TASK_STATUSES.IN_REVIEW).length
  const inTesting = myTasks.filter((task) => task.status === TASK_STATUSES.TESTING).length
  const approved = myTasks.filter((task) => task.status === TASK_STATUSES.COMPLETED).length
  const openDefects = visibleBugs.filter(
    (bug) => bug.status !== BUG_STATUSES.VERIFIED,
  ).length

  const returnedTaskIds = new Set(
    reportedBugs
      .filter((bug) => bug.status !== BUG_STATUSES.VERIFIED)
      .map((bug) => bug.taskId)
      .filter(Boolean),
  )
  const returnedTasks = myTasks.filter(
    (task) =>
      returnedTaskIds.has(task.id) && task.status !== TASK_STATUSES.COMPLETED,
  )

  const severityData = useMemo(
    () =>
      Object.values(BUG_SEVERITIES).map((severity) => ({
        label: BUG_SEVERITY_META[severity].label,
        value: reportedBugs.filter((bug) => bug.severity === severity).length,
        color:
          severity === BUG_SEVERITIES.CRITICAL
            ? '#dc2626'
            : severity === BUG_SEVERITIES.HIGH
              ? '#ea580c'
              : severity === BUG_SEVERITIES.MEDIUM
                ? '#2563eb'
                : '#94a3b8',
      })),
    [reportedBugs],
  )

  const firstName = currentUser.name.split(' ')[0]

  return (
    <>
      <PageHeader
        eyebrow="QA Engineer · Quality gate"
        title={`${getGreeting()}, ${firstName}`}
        description={`You own quality verification for ${myTasks.length} tasks. ${testingQueue.length} items are waiting in your testing queue and ${openDefects} defects remain open. A task cannot be completed until QA verifies the acceptance criteria.`}
        actions={
          <Button variant="secondary" icon={ListChecks} onClick={() => navigate('/tasks')}>
            Open testing queue
          </Button>
        }
      />

      <section className="stat-grid stat-grid--five" aria-label="Quality assurance statistics">
        <StatCard
          icon={ClipboardCheck}
          label="Assigned testing tasks"
          value={myTasks.length}
          meta="Quality ownership"
          tone="primary"
          trend="QA scope"
        />
        <StatCard
          icon={Clock3}
          label="Pending verification"
          value={inReview}
          meta="Waiting to enter testing"
          tone="warning"
          trend="Queue"
        />
        <StatCard
          icon={FlaskConical}
          label="In testing"
          value={inTesting}
          meta="Actively being validated"
          tone="info"
          trend="Testing"
        />
        <StatCard
          icon={CheckCircle2}
          label="Approved"
          value={approved}
          meta="Passed the quality gate"
          tone="success"
          trend="Verified"
        />
        <StatCard
          icon={RotateCcw}
          label="Returned tasks"
          value={returnedTasks.length}
          meta="Blocked by open defects"
          tone="danger"
          trend={returnedTasks.length ? 'Rework' : 'Clear'}
          trendTone={returnedTasks.length ? 'danger' : 'success'}
        />
      </section>

      <div className="dashboard-grid">
        <section className="panel dashboard-panel dash-span-4">
          <div className="panel__header">
            <div>
              <h2 className="panel__title">Testing queue</h2>
              <p className="panel__subtitle">Tasks waiting on QA validation</p>
            </div>
            <span className="badge badge--violet">{testingQueue.length}</span>
          </div>
          <div className="panel__body">
            <CompactTaskList
              tasks={testingQueue}
              projects={state.projects}
              users={state.users}
              limit={5}
              showAssignee
              onSelect={setSelectedTask}
              emptyTitle="Testing queue is clear"
              emptyDescription="No tasks are waiting on QA verification."
            />
          </div>
        </section>

        <section className="panel dashboard-panel dash-span-4">
          <div className="panel__header">
            <div>
              <h2 className="panel__title">Bugs by severity</h2>
              <p className="panel__subtitle">Defects you have reported</p>
            </div>
          </div>
          <div className="panel__body">
            <DonutChart
              data={severityData}
              totalLabel="Defects"
              size={128}
              thickness={14}
            />
          </div>
        </section>

        <section className="panel dashboard-panel dash-span-4">
          <div className="panel__header">
            <div>
              <h2 className="panel__title">Verification queue</h2>
              <p className="panel__subtitle">Fixes ready for re-test</p>
            </div>
            <span className="badge badge--violet">{verificationQueue.length}</span>
          </div>
          <div className="panel__body">
            {verificationQueue.length ? (
              <BugList
                bugs={verificationQueue}
                projects={state.projects}
                limit={4}
              />
            ) : (
              <EmptyState
                icon={CheckCircle2}
                title="Nothing to verify"
                description="Developer fixes will appear here when they are ready for re-test."
              />
            )}
          </div>
        </section>

        <section className="panel dashboard-panel dash-span-7">
          <div className="panel__header">
            <div>
              <h2 className="panel__title">Reported defects</h2>
              <p className="panel__subtitle">
                Quality issues raised by you across active projects.
              </p>
            </div>
            <span
              className={`badge ${openDefects ? 'badge--danger' : 'badge--success'}`}
            >
              {openDefects} open
            </span>
          </div>
          <div className="panel__body">
            <BugList
              bugs={reportedBugs}
              projects={state.projects}
              limit={6}
              emptyTitle="No defects reported"
            />
          </div>
        </section>

        <section className="panel dashboard-panel dash-span-5">
          <div className="panel__header">
            <div>
              <h2 className="panel__title">Recent activity</h2>
              <p className="panel__subtitle">Your latest quality updates</p>
            </div>
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

      <TaskDetailsModal
        open={Boolean(selectedTask)}
        task={selectedTask}
        state={state}
        onClose={() => setSelectedTask(null)}
      />
    </>
  )
}

export default QaDashboard
