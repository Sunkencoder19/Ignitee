// Every rule in IGNITE, as plain functions. No React, no storage, no imports.
// Used by both the server (server/*.js) and the app (through client/src/game.js),
// so a rule is only ever written once.
//
// A student's progress is only a history of what they did:
//   { studentId,
//     lessons:  [{ lessonId, date }],
//     attempts: [{ quizId, score, stars, answerPoints, answers, date }] }
// Points, streak and "last active" are always worked out from that history,
// so they can never disagree with it.

export const POINTS = {
  lesson: 20, // first time a lesson is finished
  firstTry: 10, // quiz answer right first time
  afterHint: 5, // quiz answer right on the second try
  activeDay: 5, // each day the student learns something
}

// ---------- dates ----------
// Dates are 'YYYY-MM-DD' strings in local time.

export function toISO(date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function today() {
  return toISO(new Date())
}

export function addDays(iso, days) {
  const [y, m, d] = iso.split('-').map(Number)
  return toISO(new Date(y, m - 1, d + days, 12))
}

export function daysBetween(fromIso, toIso) {
  const noon = (iso) => {
    const [y, m, d] = iso.split('-').map(Number)
    return new Date(y, m - 1, d, 12).getTime()
  }
  return Math.round((noon(toIso) - noon(fromIso)) / 86400000)
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

export function shortDate(iso) {
  const [, m, d] = iso.split('-').map(Number)
  return `${d} ${MONTHS[m - 1]}`
}

export function daysAgoLabel(days) {
  if (days === null) return 'Never'
  if (days === 0) return 'Today'
  if (days === 1) return 'Yesterday'
  return `${days} days ago`
}

// ---------- answers and quiz scores ----------

// "3,456", " 3456 " and "3456" count as the same answer; so do "b" and "B".
function normalise(value) {
  return String(value).replace(/[\s,]/g, '').toLowerCase()
}

export function checkAnswer(question, given) {
  if (question.type === 'order') {
    return given.length === question.answer.length && given.every((v, i) => v === question.answer[i])
  }
  return normalise(given) === normalise(question.answer)
}

export function starsFor(percent) {
  if (percent >= 90) return 3
  if (percent >= 75) return 2
  if (percent >= 50) return 1
  return 0
}

// Each outcome is 'first' (right first time), 'hint' (right on the second
// try, after the hint) or 'missed'. A hinted answer counts as half.
export function scoreQuiz(outcomes) {
  const credit = outcomes.reduce((sum, o) => sum + (o === 'first' ? 1 : o === 'hint' ? 0.5 : 0), 0)
  const percent = outcomes.length ? (credit / outcomes.length) * 100 : 0
  return { score: Math.round(percent), stars: starsFor(percent) }
}

export function answerPoints(outcomes) {
  return outcomes.reduce(
    (sum, o) => sum + (o === 'first' ? POINTS.firstTry : o === 'hint' ? POINTS.afterHint : 0),
    0
  )
}

// A retake only pays the points above the student's best earlier attempt
// on that quiz, so retaking an easy quiz again and again earns nothing.
export function attemptsWithPoints(progress) {
  const best = {}
  return progress.attempts.map((attempt) => {
    const before = best[attempt.quizId] ?? 0
    best[attempt.quizId] = Math.max(before, attempt.answerPoints)
    return { ...attempt, points: Math.max(0, attempt.answerPoints - before) }
  })
}

// ---------- points and streak ----------

export function activeDays(progress) {
  const dates = [...progress.lessons.map((l) => l.date), ...progress.attempts.map((a) => a.date)]
  return [...new Set(dates)].sort()
}

export function totalPoints(progress) {
  const quizPoints = attemptsWithPoints(progress).reduce((sum, a) => sum + a.points, 0)
  return (
    progress.lessons.length * POINTS.lesson +
    quizPoints +
    activeDays(progress).length * POINTS.activeDay
  )
}

export function lastActive(progress) {
  const days = activeDays(progress)
  return days.length ? days[days.length - 1] : null
}

// Days in a row with some learning, ending today. If the student hasn't
// learned yet today, a streak that reached yesterday still counts.
export function currentStreak(progress, todayIso) {
  const days = new Set(activeDays(progress))
  let day = days.has(todayIso) ? todayIso : addDays(todayIso, -1)
  let streak = 0
  while (days.has(day)) {
    streak += 1
    day = addDays(day, -1)
  }
  return streak
}

export function bestStreak(progress) {
  let best = 0
  let run = 0
  let previous = null
  for (const day of activeDays(progress)) {
    run = previous && daysBetween(previous, day) === 1 ? run + 1 : 1
    best = Math.max(best, run)
    previous = day
  }
  return best
}

// ---------- chapters and unlocking ----------

export function bestStars(progress, quizId) {
  const stars = progress.attempts.filter((a) => a.quizId === quizId).map((a) => a.stars)
  return stars.length ? Math.max(...stars) : 0
}

export function lessonDone(progress, lessonId) {
  return progress.lessons.some((l) => l.lessonId === lessonId)
}

export function quizOpen(chapter, progress) {
  return chapter.lessonIds.every((id) => lessonDone(progress, id))
}

// Chapters open in order. A chapter is 'done' once its quiz has 1 star or
// more, the first chapter that isn't done is 'open', and the rest are
// 'locked'. Chapters without content yet are 'soon'.
export function chapterStates(chapters, progress) {
  let previousDone = true
  return chapters.map((chapter) => {
    const stars = chapter.quizId ? bestStars(progress, chapter.quizId) : 0
    let state = 'locked'
    if (chapter.locked) state = 'soon'
    else if (previousDone && stars >= 1) state = 'done'
    else if (previousDone) state = 'open'
    previousDone = state === 'done'
    return { chapter, state, stars }
  })
}

// The one thing the student should do next.
export function nextStep(chapters, progress) {
  const open = chapterStates(chapters, progress).find((c) => c.state === 'open')
  if (!open) return null
  const lessonId = open.chapter.lessonIds.find((id) => !lessonDone(progress, id))
  if (lessonId) return { kind: 'lesson', chapter: open.chapter, lessonId }
  return { kind: 'quiz', chapter: open.chapter }
}

// ---------- badges ----------
// Seven badges. Like points and streak, they are worked out from the
// history every time, so nothing extra is saved and a badge can't be
// awarded twice.

function chapterFinished(chapters, progress, chapterId) {
  const chapter = chapters.find((c) => c.id === chapterId)
  return quizOpen(chapter, progress) && bestStars(progress, chapter.quizId) >= 1
}

// A retake that scored higher than every earlier attempt on the same quiz.
function improvedOnRetake(progress) {
  return progress.attempts.some((attempt, i) => {
    const earlier = progress.attempts.slice(0, i).filter((a) => a.quizId === attempt.quizId)
    return earlier.length > 0 && attempt.score > Math.max(...earlier.map((a) => a.score))
  })
}

// Longest run of quiz answers right first time, across all quizzes in order.
// Demo (seed) attempts have no saved answers, so they don't count.
function longestFirstTryRun(progress) {
  let run = 0
  let best = 0
  for (const attempt of progress.attempts) {
    for (const answer of attempt.answers ?? []) {
      run = answer.outcome === 'first' ? run + 1 : 0
      best = Math.max(best, run)
    }
  }
  return best
}

const BADGES = [
  { name: 'First Step', howTo: 'Finish your first lesson.', check: (p) => p.lessons.length > 0 },
  { name: 'Shape Explorer', howTo: 'Finish Chapter 1, Shapes Around Us.', check: (p, c) => chapterFinished(c, p, 'ch1') },
  { name: 'Pattern Pro', howTo: 'Get 3 stars on the Chapter 3 quiz.', check: (p) => bestStars(p, 'ch3-quiz') === 3 },
  { name: 'Thousand Club', howTo: 'Finish Chapter 4, Thousands Around Us.', check: (p, c) => chapterFinished(c, p, 'ch4') },
  { name: 'On Fire', howTo: 'Learn 5 days in a row.', check: (p) => bestStreak(p) >= 5 },
  { name: 'Never Give Up', howTo: 'Beat your best score when you retake a quiz.', check: (p) => improvedOnRetake(p) },
  { name: 'Sharp Mind', howTo: 'Get 10 quiz answers right first time in a row.', check: (p) => longestFirstTryRun(p) >= 10 },
]

// Every badge with whether this student has earned it: [{ name, howTo, earned }]
export function badges(progress, chapters) {
  return BADGES.map((b) => ({ name: b.name, howTo: b.howTo, earned: b.check(progress, chapters) }))
}

// ---------- teacher numbers ----------
// `rows` is a list of { student, progress }.

export const LOW_SCORE = 50
export const INACTIVE_DAYS = 3

function average(values) {
  if (values.length === 0) return null
  return Math.round(values.reduce((sum, v) => sum + v, 0) / values.length)
}

// Best score on each quiz the student has taken: { 'ch1-quiz': 80, ... }
export function bestScores(progress) {
  const best = {}
  for (const a of progress.attempts) best[a.quizId] = Math.max(best[a.quizId] ?? 0, a.score)
  return best
}

export function studentSummary(student, progress, chapters, todayIso) {
  const best = bestScores(progress)
  const last = lastActive(progress)
  const daysInactive = last ? daysBetween(last, todayIso) : null

  // Why a teacher should look at this student, in plain words.
  const reasons = []
  for (const chapter of chapters) {
    const score = best[chapter.quizId]
    if (score !== undefined && score < LOW_SCORE) reasons.push(`${score}% on ${chapter.title}`)
  }
  if (daysInactive === null) reasons.push('Has not started yet')
  else if (daysInactive >= INACTIVE_DAYS) reasons.push(`Inactive for ${daysInactive} days`)

  return {
    id: student.id,
    name: student.name,
    classId: student.classId,
    points: totalPoints(progress),
    streak: currentStreak(progress, todayIso),
    lessonsDone: progress.lessons.length,
    averageScore: average(Object.values(best)),
    daysInactive,
    reasons,
  }
}

// For each chapter with a quiz: class average of best scores, how many have
// taken it, and how many got 3, 2, 1 or 0 stars on their best attempt.
export function chapterResults(rows, chapters) {
  return chapters
    .filter((c) => c.quizId && !c.locked)
    .map((chapter) => {
      const bests = rows
        .map((r) => r.progress.attempts.filter((a) => a.quizId === chapter.quizId))
        .filter((attempts) => attempts.length > 0)
        .map((attempts) => attempts.reduce((top, a) => (a.score > top.score ? a : top)))
      const stars = [0, 0, 0, 0]
      for (const b of bests) stars[b.stars] += 1
      return {
        chapter,
        average: average(bests.map((b) => b.score)),
        taken: bests.length,
        stars,
      }
    })
}

// Lessons finished on each of the last `days` days, oldest first.
export function lessonsPerDay(rows, todayIso, days = 14) {
  return Array.from({ length: days }, (_, i) => {
    const date = addDays(todayIso, i - (days - 1))
    const count = rows.reduce(
      (sum, r) => sum + r.progress.lessons.filter((l) => l.date === date).length,
      0
    )
    return { date, count }
  })
}
