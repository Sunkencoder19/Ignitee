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

// Whole calendar days from one 'YYYY-MM-DD' to another. Pure: both dates
// come in as arguments, so reducers and rules can use it without a clock.
// Parsed as local noon so a DST shift can't nudge the gap to 0.96 or 1.04.
export function daysBetween(fromIso, toIso) {
  if (!fromIso || !toIso) return Infinity
  const toNoon = (iso) => {
    const [y, m, d] = iso.split('-').map(Number)
    return new Date(y, m - 1, d, 12).getTime()
  }
  return Math.round((toNoon(toIso) - toNoon(fromIso)) / DAY_MS)
}

// Whole calendar days from `iso` to today. Reads the clock, so it's for
// services and screens only, never for the reducer or lib rules.
export function daysSince(iso) {
  return daysBetween(iso, todayISO())
}
