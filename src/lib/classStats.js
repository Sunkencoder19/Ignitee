// Teacher-side numbers, as plain functions. Every function takes `today`
// (a local 'YYYY-MM-DD') instead of reading the clock, and returns null
// rather than NaN when there's nothing to average, so the screens can show
// an empty state instead of a broken number.

import { addDays, daysBetween, shortDate } from '@/lib/format'
import { currentStreak, levelFor } from '@/lib/scoring'

export const INACTIVE_DAYS = 3
export const LOW_SCORE = 50

function mean(values) {
  if (values.length === 0) return null
  return Math.round(values.reduce((sum, v) => sum + v, 0) / values.length)
}

// A retake replaces an earlier score for the class numbers: one best
// attempt per quiz, so a child who tried again isn't dragged down.
export function bestAttemptByQuiz(progress) {
  const best = new Map()
  for (const attempt of progress.quizAttempts) {
    const current = best.get(attempt.quizId)
    if (!current || attempt.score >= current.score) best.set(attempt.quizId, attempt)
  }
  return best
}

function contentChapters(chapters) {
  return chapters.filter((c) => !c.locked && c.quizId)
}

// ---- one student ----

export function studentSummary(student, progress, chapters, today) {
  const best = bestAttemptByQuiz(progress)
  const daysInactive = progress.lastActive ? daysBetween(progress.lastActive, today) : null
  const doneIds = new Set(progress.completedLessons.map((l) => l.lessonId))

  const chapterRows = contentChapters(chapters).map((chapter) => {
    const attempt = best.get(chapter.quizId)
    return {
      chapterId: chapter.id,
      number: chapter.number,
      title: chapter.title,
      tint: chapter.tint,
      lessonsDone: chapter.lessonIds.filter((id) => doneIds.has(id)).length,
      lessonsTotal: chapter.lessonIds.length,
      best: attempt ? attempt.score : null,
      stars: attempt ? attempt.stars : 0,
    }
  })

  // Every reason is listed, so a teacher sees the whole picture at once.
  const reasons = []
  for (const row of chapterRows) {
    if (row.best !== null && row.best < LOW_SCORE) {
      reasons.push({ kind: 'low-score', text: `${row.best}% on ${row.title}` })
    }
  }
  if (daysInactive === null) {
    reasons.push({ kind: 'inactive', text: 'Not active yet' })
  } else if (daysInactive >= INACTIVE_DAYS) {
    reasons.push({ kind: 'inactive', text: `Inactive ${daysInactive} days` })
  }

  const bestScores = chapterRows.filter((r) => r.best !== null).map((r) => r.best)

  return {
    id: student.id,
    name: student.name,
    classId: student.classId,
    points: progress.points,
    level: levelFor(progress.points).name,
    streak: currentStreak(progress, today),
    lastActive: progress.lastActive,
    daysInactive,
    lessonsDone: progress.completedLessons.length,
    quizzesTaken: bestScores.length,
    // Average of the student's best score on each quiz they've taken.
    bestScore: mean(bestScores),
    chapterRows,
    reasons,
  }
}

// ---- a class (rows are { student, progress }) ----

export function classSummary(rows, chapters, today) {
  const summaries = rows.map((r) => studentSummary(r.student, r.progress, chapters, today))
  const allBest = rows.flatMap((r) =>
    [...bestAttemptByQuiz(r.progress).values()].map((a) => a.score)
  )
  const lessonsThisWeek = rows
    .flatMap((r) => r.progress.completedLessons)
    .filter((l) => {
      const age = daysBetween(l.completedAt, today)
      return age >= 0 && age < 7
    }).length

  return {
    studentCount: rows.length,
    averageScore: mean(allBest),
    attemptCount: allBest.length,
    lessonsThisWeek,
    inactive: summaries.filter((s) => s.daysInactive === null || s.daysInactive >= INACTIVE_DAYS),
    needsAttention: summaries.filter((s) => s.reasons.length > 0),
  }
}

// Class average per chapter; null where nobody has taken that quiz yet.
export function chapterAverages(rows, chapters) {
  return contentChapters(chapters).map((chapter) => {
    const scores = rows
      .map((r) => bestAttemptByQuiz(r.progress).get(chapter.quizId))
      .filter(Boolean)
      .map((a) => a.score)
    return {
      chapterId: chapter.id,
      label: `Ch ${chapter.number}`,
      title: chapter.title,
      value: mean(scores),
      attempted: scores.length,
    }
  })
}

// Lessons completed on each of the last `days` days, oldest first, today last.
export function lessonsPerDay(rows, today, days = 14) {
  const counts = new Map()
  for (const r of rows) {
    for (const l of r.progress.completedLessons) {
      counts.set(l.completedAt, (counts.get(l.completedAt) ?? 0) + 1)
    }
  }
  return Array.from({ length: days }, (_, i) => {
    const date = addDays(today, i - (days - 1))
    return { date, label: shortDate(date), value: counts.get(date) ?? 0 }
  })
}

// Per chapter: class average, attempt counts and how the best stars spread.
export function assessmentStats(rows, chapters) {
  return contentChapters(chapters).map((chapter) => {
    const attempts = rows.flatMap((r) =>
      r.progress.quizAttempts.filter((a) => a.quizId === chapter.quizId)
    )
    const bests = rows.map((r) => bestAttemptByQuiz(r.progress).get(chapter.quizId)).filter(Boolean)
    const stars = [0, 0, 0, 0]
    for (const b of bests) stars[b.stars] += 1

    return {
      chapterId: chapter.id,
      number: chapter.number,
      title: chapter.title,
      tint: chapter.tint,
      average: mean(bests.map((b) => b.score)),
      attempts: attempts.length,
      studentsAttempted: bests.length,
      studentsTotal: rows.length,
      stars, // index = number of stars (0 means below 50%)
    }
  })
}
