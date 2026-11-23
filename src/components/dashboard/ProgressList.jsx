import { ProgressBar } from '../common/ProgressBar'

export function ProgressList({ items = [] }) {
  return (
    <div className="progress-list">
      {items.map((item) => (
        <div className="progress-row" key={item.id}>
          <div className="progress-row__label">
            <strong title={item.label}>{item.label}</strong>
            {item.meta ? <span title={item.meta}>{item.meta}</span> : null}
          </div>
          <div className="progress-row__track">
            <ProgressBar value={item.value} tone={item.tone} label={`${item.label} progress`} />
          </div>
          <span className="progress-row__value">{Math.round(item.value)}%</span>
        </div>
      ))}
    </div>
  )
}

export default ProgressList
