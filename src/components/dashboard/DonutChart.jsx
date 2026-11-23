export function DonutChart({
  data = [],
  totalLabel = 'Total',
  centerValue,
  size = 148,
  thickness = 16,
  showLegend = true,
}) {
  const total = data.reduce((sum, item) => sum + item.value, 0)
  const radius = (size - thickness) / 2
  const circumference = 2 * Math.PI * radius

  const segments = data
    .filter((item) => item.value > 0)
    .reduce(
      (result, item) => {
        const length = total > 0 ? (item.value / total) * circumference : 0
        result.segments.push({ ...item, length, offset: result.offset })
        return { segments: result.segments, offset: result.offset + length }
      },
      { segments: [], offset: 0 },
    ).segments

  const ariaLabel = data
    .map((item) => `${item.label}: ${item.value}`)
    .join(', ')

  return (
    <div className="donut">
      <div className="donut__chart" style={{ width: size, height: size }}>
        <svg
          width={size}
          height={size}
          role="img"
          aria-label={`${totalLabel}. ${ariaLabel}`}
        >
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="var(--surface-sunken)"
            strokeWidth={thickness}
          />
          {segments.map((segment) => (
            <circle
              key={segment.label}
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke={segment.color}
              strokeWidth={thickness}
              strokeDasharray={`${segment.length} ${circumference - segment.length}`}
              strokeDashoffset={-segment.offset}
              strokeLinecap={segments.length === 1 ? 'round' : 'butt'}
            />
          ))}
        </svg>
        <div className="donut__center">
          <span className="donut__value">{centerValue ?? total}</span>
          <span className="donut__label">{totalLabel}</span>
        </div>
      </div>

      {showLegend ? (
        <div className="donut__legend">
          {data.map((item) => (
            <div className="donut__legend-item" key={item.label}>
              <span
                className="donut__legend-dot"
                style={{ backgroundColor: item.color }}
                aria-hidden="true"
              />
              <span>{item.label}</span>
              <span className="donut__legend-value">{item.value}</span>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  )
}

export default DonutChart
