// Numbers for the student's own dashboard and profile. Plain functions;
// `today` is passed in, and "nothing yet" comes back as null, never NaN.

import { getChapterMapEntries } from '@/lib/chapterProgress'
import { addDays, weekdayName } from '@/lib/format'
import { POINTS, levelFor } from '@/lib/scoring'

export function isBrandNew(progress) {
  return progress.completedLessons.length === 0 && progress.quizAttempts.length === 0
}

/**
 * The one thing to do next, following the same unlock rules as the map:
 *  - the current chapter's first unfinished lesson
 *  - or, with every lesson done, that chapter's quiz
 *  - or, with every open chapter done, the chapter with the fewest stars
 *    (kind 'improve'), or 'all-done' when everything already has 3 stars
 */
export function nextStep(chapters, progress) {
  const entries = getChapterMapEntries(chapters, progress)
  const current = entries.find((e) => e.state === 'current')

  if (current) {
    const done = new Set(progress.completedLessons.map((l) => l.lessonId))
    const lessonId = current.chapter.lessonIds.find((id) => !done.has(id))
    if (lessonId) return { kind: 'lesson', chapter: current.chapter, lessonId }
    return { kind: 'quiz', chapter: current.chapter }
  }

  const finished = entries.filter((e) => e.state === 'done')
  if (finished.length === 0) return null
  const weakest = finished.reduce((low, e) => (e.stars < low.stars ? e : low))
  return {
    kind: weakest.stars < 3 ? 'improve' : 'all-done',
    chapter: weakest.chapter,
    stars: weakest.stars,
  }
}

// The last `days` days, oldest first. A day is active if a lesson was
// finished or a quiz was taken on it.
export function activityStrip(progress, today, days = 7) {
  const active = new Set([
    ...progress.completedLessons.map((l) => l.completedAt),
    ...progress.quizAttempts.map((a) => a.date),
  ])
  return Array.from({ length: days }, (_, i) => {
    const date = addDays(today, i - (days - 1))
    const name = weekdayName(date)
    return { date, name, initial: name[0], active: active.has(date), isToday: date === today }
  })
}

// Most recent first. The badges array is in unlock order (the reducer appends).
export function recentBadges(progress, badges, count = 3) {
  return progress.badges
    .slice(-count)
    .reverse()
    .map((id) => badges.find((b) => b.id === id))
    .filter(Boolean)
}

export function levelProgress(points) {
  const level = levelFor(points)
  const floor = level.index * POINTS.pointsPerLevel
  return {
    ...level,
    intoLevel: level.nextName ? points - floor : POINTS.pointsPerLevel,
    levelSize: POINTS.pointsPerLevel,
  }
}

export function profileStats(progress, chapters) {
  const lessonsTotal = chapters.filter((c) => !c.locked).reduce((n, c) => n + c.lessonIds.length, 0)
  const bestStars = new Map()
  for (const a of progress.quizAttempts) {
    bestStars.set(a.quizId, Math.max(bestStars.get(a.quizId) ?? 0, a.stars))
  }
  const scores = progress.quizAttempts.map((a) => a.score)

  return {
    lessonsDone: progress.completedLessons.length,
    lessonsTotal,
    quizAttempts: progress.quizAttempts.length,
    quizzesPassed: [...bestStars.values()].filter((s) => s >= 1).length,
    // Every attempt counts here, retakes included: it's the child's own record.
    averageScore: scores.length
      ? Math.round(scores.reduce((sum, s) => sum + s, 0) / scores.length)
      : null,
    bestStreak: Math.max(progress.bestStreak ?? 0, progress.streak ?? 0),
  }
}
