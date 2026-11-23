import { AlertTriangle, CalendarDays, CheckCircle2, Flag, UsersRound } from 'lucide-react'
import { PageHeader } from '../../../components/common/PageHeader'
import { StatCard } from '../../../components/common/StatCard'
import { MILESTONES, PROJECTS, TASKS, WORKLOAD } from '../../../data/dashboardData'
import { Avatar } from '../../../components/common/Avatar'
import { Panel, ProjectList, TaskList, TextLink } from '../components/DashboardParts'

export function ProjectLeadDashboard() {
  return (
    <>
      <PageHeader eyebrow="PROJECT LEAD" title="Your project portfolio" description="Keep an eye on delivery, milestones, and the teams moving work forward." actions={<span className="date-pill"><CalendarDays size={15} /> Week of November 9</span>} />
      <div className="stats-grid">
        <StatCard icon={Flag} label="My projects" value="04" meta="2 due this month" tone="blue" />
        <StatCard icon={CheckCircle2} label="Average completion" value="68%" meta="Across active projects" tone="green" trend="+6%" trendTone="positive" />
        <StatCard icon={CalendarDays} label="Upcoming milestones" value="03" meta="Next 7 days" tone="purple" />
        <StatCard icon={AlertTriangle} label="Overdue tasks" value="05" meta="Across 2 projects" tone="orange" trend="Needs attention" trendTone="negative" />
      </div>
      <div className="dashboard-grid dashboard-grid--overview">
        <Panel title="Assigned projects" subtitle="Progress and health at a glance" id="projects" action={<TextLink href="#projects" />}>
          <ProjectList projects={PROJECTS.slice(0, 3)} />
        </Panel>
        <Panel title="Milestones" subtitle="Upcoming project checkpoints" id="reports">
          <div className="milestone-list">{MILESTONES.map((item) => <div className="milestone-row" key={item.title}><span className={`milestone-mark milestone-mark--${item.status.toLowerCase().replace(' ', '-')}`}><Flag size={14} /></span><div><strong>{item.title}</strong><span>{item.project}</span></div><time>{item.date}</time></div>)}</div>
        </Panel>
        <Panel title="Team leaders" subtitle="Leads assigned to your projects" id="work" action={<UsersRound size={17} className="text-muted" />}>
          <div className="people-list">{WORKLOAD.slice(0, 2).map((person) => <div className="person-row" key={person.name}><Avatar name={person.name} color={person.color} size="sm" /><div><strong>{person.name}</strong><span>{person.role}</span></div><span className="person-row__count">{person.tasks} open</span></div>)}</div>
        </Panel>
        <Panel title="Needs your attention" subtitle="Tasks that may affect delivery">
          <TaskList tasks={TASKS.filter((task) => task.priority === 'Urgent' || task.status === 'To do').slice(0, 3)} />
        </Panel>
      </div>
    </>
  )
}
