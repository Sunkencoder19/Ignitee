// Class leaderboard maths. Plain functions; `today` is passed in.
//
// "This week" is a rolling 7 days (today and the 6 before it), so nobody's
// score drops to zero every Monday. It only counts points that carry a date:
//   - each lesson finished for the first time: 20, dated by completedAt
//   - each quiz attempt: its stored points, dated by the attempt's date
//   - each day's streak points: dated in streakLog
// "All time" is the stored total, which also includes older undated points.

import { daysBetween } from '@/lib/format'
import { POINTS } from '@/lib/scoring'

export const WEEK_DAYS = 7

function inWeek(date, today) {
  if (!date) return false
  const age = daysBetween(date, today)
  return age >= 0 && age < WEEK_DAYS
}

export function weeklyPoints(progress, today) {
  const lessons =
    progress.completedLessons.filter((l) => inWeek(l.completedAt, today)).length *
    POINTS.lessonComplete
  const quizzes = progress.quizAttempts
    .filter((a) => inWeek(a.date, today))
    .reduce((sum, a) => sum + (a.points ?? 0), 0)
  const streak = (progress.streakLog ?? [])
    .filter((entry) => inWeek(entry.date, today))
    .reduce((sum, entry) => sum + entry.points, 0)
  return lessons + quizzes + streak
}

/**
 * entries: [{ id, firstName, avatar, progress }], mode: 'week' | 'all'.
 * Highest points first; ties share a rank (1, 1, 3) and sort by name.
 */
export function rankClass(entries, mode, today) {
  const scored = entries
    .map((e) => ({
      id: e.id,
      firstName: e.firstName,
      avatar: e.avatar,
      points: mode === 'week' ? weeklyPoints(e.progress, today) : e.progress.points,
    }))
    .sort((a, b) => b.points - a.points || a.firstName.localeCompare(b.firstName))

  let rank = 0
  return scored.map((entry, i) => {
    if (i === 0 || entry.points !== scored[i - 1].points) rank = i + 1
    return { ...entry, rank }
  })
}
