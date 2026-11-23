export function ProgressBar({ value = 0, tone = '', size = '', label }) {
  const clamped = Math.max(0, Math.min(100, Math.round(value)))

  return (
    <div
      className={`progress ${size ? `progress--${size}` : ''}`.trim()}
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={clamped}
      aria-label={label ?? 'Progress'}
    >
      <div
        className={`progress__bar ${tone ? `progress__bar--${tone}` : ''}`.trim()}
        style={{ width: `${clamped}%` }}
      />
    </div>
  )
}

export default ProgressBar
