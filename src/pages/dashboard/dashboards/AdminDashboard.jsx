import { ArrowUpRight, BriefcaseBusiness, CheckCircle2, CircleAlert, UsersRound } from 'lucide-react'
import { PageHeader } from '../../../components/common/PageHeader'
import { StatCard } from '../../../components/common/StatCard'
import { ACTIVITIES, PROJECTS } from '../../../data/dashboardData'
import { ActivityList, Panel, ProjectList, TextLink, WeeklyChart } from '../components/DashboardParts'

export function AdminDashboard({ roleLabel }) {
  return (
    <>
      <PageHeader eyebrow="ORGANIZATION OVERVIEW" title="Good morning, Olivia" description="Here’s what’s happening across your workspace today." actions={<span className="date-pill">Week of November 9, 2026</span>} />
      <div className="stats-grid">
        <StatCard icon={BriefcaseBusiness} label="Total projects" value="24" meta="Across 8 client teams" tone="blue" trend="+12%" trendTone="positive" />
        <StatCard icon={ArrowUpRight} label="Active projects" value="18" meta="75% of all projects" tone="purple" trend="+8.2%" trendTone="positive" />
        <StatCard icon={CheckCircle2} label="Completed" value="06" meta="This quarter" tone="green" trend="+2" trendTone="positive" />
        <StatCard icon={UsersRound} label="Team members" value="48" meta="Across 5 departments" tone="orange" trend="+4" trendTone="positive" />
      </div>
      <div className="dashboard-grid dashboard-grid--overview">
        <Panel title="Project performance" subtitle="Status across all active projects" id="projects" action={<TextLink href="#projects" />}>
          <ProjectList projects={PROJECTS} />
        </Panel>
        <Panel title="Workspace activity" subtitle="Team updates from across the organization" id="work">
          <ActivityList activities={ACTIVITIES} />
          <div className="panel__footer"><TextLink href="#work" /></div>
        </Panel>
        <Panel title="Delivery overview" subtitle="Work completed this week" id="reports" className="panel--chart">
          <WeeklyChart />
        </Panel>
        <Panel title="Organization health" subtitle="A snapshot of team delivery">
          <div className="health-score"><div><strong>86</strong><span>/100</span></div><span className="health-score__label">Healthy</span></div>
          <div className="health-list">
            <div><span><i className="health-dot health-dot--green" />On track</span><strong>14 projects</strong></div>
            <div><span><i className="health-dot health-dot--orange" />Needs attention</span><strong>4 projects</strong></div>
            <div><span><i className="health-dot health-dot--red" />Overdue tasks</span><strong>7 tasks</strong></div>
          </div>
          <p className="health-note"><CircleAlert size={14} /> 2 milestones need review this week</p>
        </Panel>
      </div>
      <p className="dashboard-footnote">{roleLabel} view · Demo workspace data</p>
    </>
  )
}
