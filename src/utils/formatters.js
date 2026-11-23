export function getInitials(name = '') {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('')
}

export function pluralize(count, singular, plural = `${singular}s`) {
  return `${count} ${count === 1 ? singular : plural}`
}

export function truncate(value, length = 120) {
  if (!value) return ''
  if (value.length <= length) return value
  return `${value.slice(0, length).trimEnd()}…`
}

export function formatPercent(value) {
  return `${Math.round(value)}%`
}
