const MS_PER_DAY = 24 * 60 * 60 * 1000

export function parseLocalDate(value) {
  if (!value) return null
  if (value instanceof Date) return new Date(value.getTime())
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split('-').map(Number)
    return new Date(year, month - 1, day)
  }
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

export function startOfDay(value = new Date()) {
  const date = parseLocalDate(value)
  if (!date) return null
  date.setHours(0, 0, 0, 0)
  return date
}

export function toISODate(value = new Date()) {
  const date = parseLocalDate(value)
  if (!date) return ''
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function todayISO() {
  return toISODate(new Date())
}

export function addDays(value, amount) {
  const date = parseLocalDate(value)
  if (!date) return null
  date.setDate(date.getDate() + amount)
  return date
}

export function addDaysISO(amount, from = new Date()) {
  return toISODate(addDays(from, amount))
}

export function daysUntil(value, from = new Date()) {
  const target = startOfDay(value)
  const base = startOfDay(from)
  if (!target || !base) return null
  return Math.round((target.getTime() - base.getTime()) / MS_PER_DAY)
}

export function isOverdueDate(value, from = new Date()) {
  const days = daysUntil(value, from)
  return days !== null && days < 0
}

export function isDueSoon(value, days = 7, from = new Date()) {
  const remaining = daysUntil(value, from)
  return remaining !== null && remaining >= 0 && remaining <= days
}

export function formatDate(value, options = {}) {
  const date = parseLocalDate(value)
  if (!date) return '—'
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    ...options,
  }).format(date)
}

export function formatShortDate(value) {
  return formatDate(value, { month: 'short', day: 'numeric' })
}

export function formatLongDate(value = new Date()) {
  const date = parseLocalDate(value)
  if (!date) return ''
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(date)
}

export function formatDateRange(start, end) {
  const from = parseLocalDate(start)
  const to = parseLocalDate(end)
  if (!from || !to) return '—'
  const sameYear = from.getFullYear() === to.getFullYear()
  const fromLabel = new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    ...(sameYear ? {} : { year: 'numeric' }),
  }).format(from)
  const toLabel = new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(to)
  return `${fromLabel} – ${toLabel}`
}

export function formatRelativeTime(value) {
  const date = parseLocalDate(value)
  if (!date) return ''
  const diffMs = Date.now() - date.getTime()
  const minutes = Math.floor(diffMs / 60000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  const weeks = Math.floor(days / 7)
  if (weeks < 5) return `${weeks}w ago`
  return formatShortDate(value)
}

export function getDueLabel(value, from = new Date()) {
  const remaining = daysUntil(value, from)
  if (remaining === null) return 'No due date'
  if (remaining < 0) return `${Math.abs(remaining)}d overdue`
  if (remaining === 0) return 'Due today'
  if (remaining === 1) return 'Due tomorrow'
  return `Due in ${remaining}d`
}

export function getGreeting(date = new Date()) {
  const hour = date.getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}
