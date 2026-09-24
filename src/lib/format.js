// Dates are stored as plain 'YYYY-MM-DD' strings in local time. toISOString()
// would use UTC, which in India flips to yesterday between midnight and 5:30am.

const DAY_MS = 24 * 60 * 60 * 1000

export function toISODate(date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function todayISO() {
  return toISODate(new Date())
}

export function isoDaysAgo(days) {
  const date = new Date()
  date.setDate(date.getDate() - days)
  return toISODate(date)
}

// Whole calendar days from `iso` to today. Parsed as local noon so a DST
// shift can't nudge the difference to 0.96 or 1.04 days.
export function daysSince(iso) {
  if (!iso) return Infinity
  const [y, m, d] = iso.split('-').map(Number)
  const then = new Date(y, m - 1, d, 12)
  const now = new Date()
  now.setHours(12, 0, 0, 0)
  return Math.round((now - then) / DAY_MS)
}
