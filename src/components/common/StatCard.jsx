export function StatCard({ icon: Icon, label, value, meta, tone = 'primary', trend, trendTone = '' }) {
  return (
    <article className="stat-card">
      <div className="stat-card__top">
        <span className={`stat-card__icon stat-card__icon--${tone}`} aria-hidden="true">
          {Icon ? <Icon size={19} /> : null}
        </span>
        {trend ? (
          <span className={`stat-card__trend ${trendTone ? `stat-card__trend--${trendTone}` : ''}`.trim()}>
            {trend}
          </span>
        ) : null}
      </div>
      <div>
        <div className="stat-card__value">{value}</div>
        <div className="stat-card__label">{label}</div>
        {meta ? <div className="stat-card__meta">{meta}</div> : null}
      </div>
    </article>
  )
}

export default StatCard
