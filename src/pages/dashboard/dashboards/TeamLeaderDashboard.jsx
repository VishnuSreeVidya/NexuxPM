import { Activity, CheckCircle2, CircleDashed, UsersRound } from 'lucide-react'
import { PageHeader } from '../../../components/common/PageHeader'
import { StatCard } from '../../../components/common/StatCard'
import { TASKS, WORKLOAD } from '../../../data/dashboardData'
import { Avatar } from '../../../components/common/Avatar'
import { Panel, TaskList, WeeklyChart } from '../components/DashboardParts'

export function TeamLeaderDashboard() {
  return (
    <>
      <PageHeader eyebrow="TEAM LEADER" title="Team workspace" description="Plan the work, keep the team unblocked, and move tasks through delivery." actions={<span className="date-pill">Sprint 12 · Nov 2 – Nov 16</span>} />
      <div className="stats-grid">
        <StatCard icon={Activity} label="Assigned projects" value="03" meta="Active this sprint" tone="blue" />
        <StatCard icon={CircleDashed} label="Total tasks" value="28" meta="Across your projects" tone="purple" />
        <StatCard icon={Activity} label="In progress" value="09" meta="3 due this week" tone="orange" />
        <StatCard icon={CheckCircle2} label="Completed" value="14" meta="This sprint" tone="green" trend="+18%" trendTone="positive" />
      </div>
      <div className="dashboard-grid dashboard-grid--overview">
        <Panel title="Team task board" subtitle="Current work across your team" id="work" action={<span className="subtle-count">9 in progress</span>}>
          <TaskList tasks={TASKS} />
        </Panel>
        <Panel title="Team workload" subtitle="Open tasks by team member" id="projects" action={<UsersRound size={17} className="text-muted" />}>
          <div className="workload-list">{WORKLOAD.map((person) => <div className="workload-row" key={person.name}><div className="workload-row__person"><Avatar name={person.name} color={person.color} size="sm" /><div><strong>{person.name}</strong><span>{person.role}</span></div><b>{person.tasks}</b></div><div className="workload-row__bar"><span style={{ width: `${person.load}%` }} /></div></div>)}</div>
        </Panel>
        <Panel title="Sprint activity" subtitle="Completed tasks by day" id="reports"><WeeklyChart compact /></Panel>
        <Panel title="Project focus" subtitle="This sprint's delivery priorities">
          <div className="focus-card"><span className="project-mark project-mark--blue">W</span><div><strong>Website redesign</strong><span>6 tasks due this week</span></div><span className="focus-card__tag">Sprint goal</span></div>
          <div className="focus-card"><span className="project-mark project-mark--purple">M</span><div><strong>Mobile banking app</strong><span>3 reviews waiting</span></div><span className="focus-card__tag focus-card__tag--muted">Watch</span></div>
        </Panel>
      </div>
    </>
  )
}
