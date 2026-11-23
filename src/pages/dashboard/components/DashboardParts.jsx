import { ArrowDownRight, ArrowRight, ArrowUpRight, MoreHorizontal } from 'lucide-react'
import { Avatar, AvatarStack } from '../../../components/common/Avatar'
import { ProgressBar } from '../../../components/common/ProgressBar'
import { StatusBadge } from '../../../components/common/StatusBadge'
import { TASKS, WEEKLY_ACTIVITY } from '../../../data/dashboardData'

export function Panel({ title, subtitle, action, children, className = '', id }) {
  return (
    <section className={`panel ${className}`.trim()} id={id}>
      <div className="panel__header">
        <div>
          <h2 className="panel__title">{title}</h2>
          {subtitle ? <p className="panel__subtitle">{subtitle}</p> : null}
        </div>
        {action ?? (
          <button type="button" className="icon-btn panel__more" aria-label={`${title} options`}>
            <MoreHorizontal size={19} />
          </button>
        )}
      </div>
      {children}
    </section>
  )
}

export function ProjectList({ projects }) {
  return (
    <div className="project-list">
      {projects.map((project) => (
        <article className="project-row" key={project.name}>
          <span className={`project-mark project-mark--${project.color}`} aria-hidden="true">
            {project.name.slice(0, 1)}
          </span>
          <div className="project-row__main">
            <div className="project-row__title">
              <strong>{project.name}</strong>
              <StatusBadge type="project" value={project.status} />
            </div>
            <span className="text-muted">{project.client}</span>
            <div className="project-row__progress">
              <ProgressBar value={project.progress} size="sm" label={`${project.name} completion`} />
              <span>{project.progress}%</span>
            </div>
          </div>
          <AvatarStack users={project.team.map((initials, index) => ({
            id: `${project.name}-${initials}-${index}`,
            name: { MC: 'Marcus Chen', SP: 'Sofia Patel', EB: 'Ethan Brooks', AT: 'Ava Thompson' }[initials],
            avatarColor: { MC: '#93c5fd', SP: '#f9a8d4', EB: '#86efac', AT: '#fcd34d' }[initials],
          }))} limit={3} />
          <span className="project-row__due">{project.due}</span>
        </article>
      ))}
    </div>
  )
}

export function TaskList({ tasks = TASKS, showProject = true }) {
  return (
    <div className="task-list">
      {tasks.map((task) => (
        <article className="task-row" key={task.title}>
          <span className="task-row__check" aria-hidden="true" />
          <div className="task-row__main">
            <strong>{task.title}</strong>
            {showProject ? <span className="text-muted">{task.project}</span> : null}
          </div>
          <span className={`priority priority--${task.priority.toLowerCase()}`}>
            <span className="priority__dot" />
            {task.priority}
          </span>
          <StatusBadge type="task" value={task.status} />
          <span className="task-row__due">{task.due}</span>
        </article>
      ))}
    </div>
  )
}

export function ActivityList({ activities }) {
  return (
    <div className="activity-list">
      {activities.map((activity) => (
        <div className="activity-row" key={`${activity.name}-${activity.time}`}>
          <Avatar name={activity.name} color={activity.color} size="sm" />
          <p>
            <strong>{activity.name}</strong> {activity.action} <b>{activity.detail}</b>
          </p>
          <time>{activity.time}</time>
        </div>
      ))}
    </div>
  )
}

export function WeeklyChart({ compact = false }) {
  return (
    <div className={`weekly-chart ${compact ? 'weekly-chart--compact' : ''}`.trim()}>
      <div className="weekly-chart__summary">
        <div><strong>{compact ? '36' : '142'}</strong><span>tasks completed</span></div>
        <span className="chart-trend"><ArrowUpRight size={14} /> 12.8%</span>
      </div>
      <div className="weekly-chart__bars" aria-label="Activity for the last seven days">
        {WEEKLY_ACTIVITY.map((item, index) => (
          <div className="weekly-chart__day" key={item.day}>
            <div className="weekly-chart__track">
              <span className={index === 3 ? 'is-highlighted' : ''} style={{ height: `${item.value}%` }} />
            </div>
            <span>{item.day}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export function Metric({ label, value, change, tone = 'up' }) {
  const Trend = tone === 'up' ? ArrowUpRight : ArrowDownRight
  return (
    <div className="metric">
      <span>{label}</span>
      <div className="metric__value">{value}</div>
      {change ? <small className={tone === 'up' ? 'metric__positive' : 'metric__negative'}><Trend size={13} /> {change}</small> : null}
    </div>
  )
}

export function TextLink({ children = 'View all', href = '#work' }) {
  return <a className="text-link" href={href}>{children}<ArrowRight size={14} /></a>
}
