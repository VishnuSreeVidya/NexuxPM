import { Users } from 'lucide-react'
import { Avatar } from '../common/Avatar'
import { ProgressBar } from '../common/ProgressBar'
import { EmptyState } from '../common/EmptyState'

function getTone(item) {
  if (item.overdue > 0) return 'danger'
  if (item.open >= 6) return 'warning'
  return ''
}

export function WorkloadList({ items = [], limit, emptyTitle = 'No workload data' }) {
  const visible = typeof limit === 'number' ? items.slice(0, limit) : items
  const maxOpen = Math.max(...visible.map((item) => item.open), 1)

  if (!visible.length) {
    return (
      <EmptyState
        icon={Users}
        title={emptyTitle}
        description="Assignments will appear here once work is allocated."
      />
    )
  }

  return (
    <ul className="workload-list">
      {visible.map((item) => {
        const percentage = item.open === 0 ? 0 : Math.max(6, (item.open / maxOpen) * 100)
        return (
          <li className="workload-item" key={item.user.id}>
            <Avatar
              name={item.user.name}
              userId={item.user.id}
              color={item.user.avatarColor}
              size="sm"
            />
            <div className="workload-item__body">
              <div className="workload-item__top">
                <span className="workload-item__name" title={item.user.name}>
                  {item.user.name}
                </span>
                <span className="workload-item__count">
                  <strong>{item.open}</strong> open
                  {item.overdue > 0 ? ` · ${item.overdue} late` : ''}
                </span>
              </div>
              <ProgressBar value={percentage} tone={getTone(item)} label={`${item.user.name} workload`} />
            </div>
          </li>
        )
      })}
    </ul>
  )
}

export default WorkloadList
