import { CalendarClock, CheckCircle2, CircleDashed, ListTodo } from 'lucide-react'
import { PageHeader } from '../../../components/common/PageHeader'
import { StatCard } from '../../../components/common/StatCard'
import { ACTIVITIES, TASKS } from '../../../data/dashboardData'
import { Avatar } from '../../../components/common/Avatar'
import { ActivityList, Panel, TaskList } from '../components/DashboardParts'

export function DeveloperDashboard() {
  const myTasks = [TASKS[0], TASKS[3], { ...TASKS[2], title: 'Refine account settings screen', due: 'Jun 25', status: 'To do' }]
  return (
    <>
      <PageHeader eyebrow="DEVELOPER" title="Your work, at a glance" description="A focused view of your tasks, deadlines, and recent team activity." actions={<span className="date-pill"><CalendarClock size={15} /> 3 deadlines this week</span>} />
      <div className="stats-grid">
        <StatCard icon={ListTodo} label="My tasks" value="08" meta="Across 3 projects" tone="blue" />
        <StatCard icon={CircleDashed} label="In progress" value="03" meta="Keep the momentum" tone="purple" />
        <StatCard icon={CheckCircle2} label="Completed" value="12" meta="This month" tone="green" trend="+3" trendTone="positive" />
        <StatCard icon={CalendarClock} label="Due soon" value="02" meta="Next 48 hours" tone="orange" />
      </div>
      <div className="dashboard-grid dashboard-grid--overview">
        <Panel title="My task list" subtitle="Your assigned development work" id="work" action={<span className="subtle-count">8 open tasks</span>}>
          <TaskList tasks={myTasks} showProject />
        </Panel>
        <Panel title="Upcoming deadlines" subtitle="Plan your week" id="projects">
          <div className="deadline-list"><div className="deadline-row"><time><b>06</b><span>NOV</span></time><div><strong>Update onboarding flow</strong><span>Website redesign · High priority</span></div><span className="deadline-label deadline-label--today">Today</span></div><div className="deadline-row"><time><b>10</b><span>NOV</span></time><div><strong>Design system documentation</strong><span>Analytics platform · Medium priority</span></div><span className="deadline-label">In 4 days</span></div><div className="deadline-row"><time><b>13</b><span>NOV</span></time><div><strong>Add export to CSV</strong><span>Customer portal · Low priority</span></div><span className="deadline-label">In 7 days</span></div></div>
        </Panel>
        <Panel title="Recent activity" subtitle="Updates from your projects" id="reports">
          <ActivityList activities={ACTIVITIES.slice(0, 2)} />
          <div className="activity-row activity-row--inline"><Avatar name="Sofia Patel" color="#f9a8d4" size="sm" /><p><strong>Sofia Patel</strong> left a comment on <b>Onboarding flow</b></p><time>3 hours ago</time></div>
        </Panel>
        <Panel title="Ready for review" subtitle="Work waiting for feedback">
          <div className="review-card"><span className="review-card__icon"><CheckCircle2 size={17} /></span><div><strong>Responsive navigation</strong><span>Website redesign · Submitted 2 hours ago</span></div><span className="badge badge--purple">In review</span></div>
          <div className="review-card"><span className="review-card__icon review-card__icon--orange"><CircleDashed size={17} /></span><div><strong>CSV export feature</strong><span>Customer portal · Testing in progress</span></div><span className="badge badge--orange">Testing</span></div>
        </Panel>
      </div>
    </>
  )
}
