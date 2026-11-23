import {
  BUG_SEVERITY_META,
  BUG_STATUS_META,
  MILESTONE_STATUS_META,
  PROJECT_STATUS_META,
  TASK_PRIORITY_META,
  TASK_STATUS_META,
} from '../../utils/constants'

const META_BY_TYPE = {
  task: TASK_STATUS_META,
  project: PROJECT_STATUS_META,
  priority: TASK_PRIORITY_META,
  bug: BUG_STATUS_META,
  severity: BUG_SEVERITY_META,
  milestone: MILESTONE_STATUS_META,
}

export function StatusBadge({ type = 'task', value, dot = false, label, className = '' }) {
  const meta = META_BY_TYPE[type]?.[value]
  if (!meta) return null

  return (
    <span className={`badge badge--${meta.tone} ${className}`.trim()}>
      {dot ? <span className="badge__dot" aria-hidden="true" /> : null}
      {label ?? meta.label}
    </span>
  )
}

export function PriorityLabel({ value }) {
  const meta = TASK_PRIORITY_META[value]
  if (!meta) return null

  return (
    <span className="priority">
      <span className="priority__dot" style={{ backgroundColor: meta.color }} aria-hidden="true" />
      {meta.label}
    </span>
  )
}

export default StatusBadge
