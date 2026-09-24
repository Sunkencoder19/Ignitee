// Every scoring rule in IGNITE lives here as a plain function, so each one
// can be read, explained and tested on its own. Points reward effort and
// accuracy, never speed: a slower child on a shared phone loses nothing.
// Nothing in here reads the clock; callers pass `today` in.

import { daysBetween } from '@/lib/format'

export const POINTS = {
  lessonComplete: 20,
  firstTry: 10,
  afterHint: 5,
  threeStarBonus: 30,
  improveBonus: 15,
  streakPerDay: 5,
  streakCap: 7,
  pointsPerLevel: 250,
}

// ---- answers ----

// "3,456", " 3456 " and "3456" are the same answer; so are "b" and "B".
function normalise(value) {
  return String(value).replace(/[\s,]/g, '').toLowerCase()
}

export function checkAnswer(question, given) {
  if (question.type === 'order') {
    return (
      Array.isArray(given) &&
      given.length === question.answer.length &&
      given.every((item, i) => item === question.answer[i])
    )
  }
  return normalise(given) === normalise(question.answer)
}

// ---- quiz score and stars ----

// Each outcome is 'first' (right first time), 'hint' (right after the hint)
// or 'missed' (answer shown). A hinted answer counts half, so a child who
// needed the hint on every question can't still collect 3 stars.
function creditFor(outcomes) {
  return outcomes.reduce((sum, o) => sum + (o === 'first' ? 1 : o === 'hint' ? 0.5 : 0), 0)
}

export function starsFor(percent) {
  if (percent >= 90) return 3
  if (percent >= 75) return 2
  if (percent >= 50) return 1
  return 0
}

export function scoreQuiz(outcomes) {
  const exact = outcomes.length ? (creditFor(outcomes) / outcomes.length) * 100 : 0
  // Stars come from the exact percentage, so 89.5% can't round up to 3 stars.
  return { score: Math.round(exact), stars: starsFor(exact) }
}

export function answerPoints(outcomes) {
  return outcomes.reduce(
    (sum, o) => sum + (o === 'first' ? POINTS.firstTry : o === 'hint' ? POINTS.afterHint : 0),
    0
  )
}

// ---- points for one quiz attempt ----

// Older (seed) attempts only stored a score, so rebuild their answer points
// from it: 100% on 8 questions is 8 x 10 = 80 points.
function answerPointsOf(attempt, questionCount) {
  if (typeof attempt.answerPoints === 'number') return attempt.answerPoints
  return Math.round((attempt.score / 100) * questionCount * POINTS.firstTry)
}

/**
 * The whole retake rule in one place:
 *  - First attempt: answer points, plus 30 if it earns 3 stars.
 *  - Retake that beats the best score: only the answer points above the best
 *    earlier attempt, plus 15 for improving, plus 30 the first time the quiz
 *    reaches 3 stars.
 *  - Retake that doesn't beat the best score: 0. Retaking an easy quiz over
 *    and over shouldn't buy a place at the top of the leaderboard.
 * Returns the total and a breakdown the result screen can list line by line.
 */
export function quizAttemptPoints({ outcomes, previousAttempts, questionCount }) {
  const { score, stars } = scoreQuiz(outcomes)
  const earned = answerPoints(outcomes)
  const lines = []

  if (previousAttempts.length === 0) {
    lines.push({ label: 'Answers', points: earned })
  } else {
    const bestScore = Math.max(...previousAttempts.map((a) => a.score))
    if (score <= bestScore) return { total: 0, lines, improved: false, bestScore }

    const bestAnswerPoints = Math.max(
      ...previousAttempts.map((a) => answerPointsOf(a, questionCount))
    )
    lines.push({
      label: 'Better answers than your best',
      points: Math.max(earned - bestAnswerPoints, 0),
    })
    lines.push({ label: 'Improved on a retry', points: POINTS.improveBonus })
  }

  const hadThreeStars = previousAttempts.some((a) => a.stars === 3)
  if (stars === 3 && !hadThreeStars) {
    lines.push({ label: '3-star bonus', points: POINTS.threeStarBonus })
  }

  const total = lines.reduce((sum, l) => sum + l.points, 0)
  return { total, lines, improved: previousAttempts.length > 0 }
}

// ---- streak ----

// Day 1 = 5, day 2 = 10 ... day 7 and beyond = 35.
export function streakPoints(streakDay) {
  return POINTS.streakPerDay * Math.min(streakDay, POINTS.streakCap)
}

/**
 * Called on every activity (lesson finished, quiz submitted). Only the first
 * activity of a local day moves the streak and pays streak points:
 *  - already counted today: nothing changes
 *  - last active yesterday: streak + 1
 *  - longer ago, or never: streak starts again at 1
 * A streak of 0 means today hasn't been counted yet, even if lastActive says
 * today (a new student who logged in but hasn't finished anything).
 */
export function applyStreak(progress, today) {
  if (progress.lastActive === today && progress.streak > 0) {
    return { progress, streakPoints: 0 }
  }

  const streak = daysBetween(progress.lastActive, today) === 1 ? progress.streak + 1 : 1
  const earned = streakPoints(streak)
  return {
    progress: { ...progress, streak, lastActive: today, points: progress.points + earned },
    streakPoints: earned,
  }
}

// What the header shows. A streak is still alive until the end of the day
// after the last activity; after that it reads 0 until the child comes back.
export function currentStreak(progress, today) {
  if (!progress?.lastActive) return 0
  return daysBetween(progress.lastActive, today) <= 1 ? progress.streak : 0
}

// ---- levels ----

const LEVELS = ['Spark', 'Flame', 'Blaze', 'Bonfire', 'Star']

// Every 250 points is a level; Star (1000+) is the top one.
export function levelFor(points) {
  const index = Math.min(Math.floor(points / POINTS.pointsPerLevel), LEVELS.length - 1)
  const isTop = index === LEVELS.length - 1
  return {
    index,
    name: LEVELS[index],
    nextName: isTop ? null : LEVELS[index + 1],
    pointsToNext: isTop ? 0 : (index + 1) * POINTS.pointsPerLevel - points,
  }
}
