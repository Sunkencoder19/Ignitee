// Every scoring rule in IGNITE lives here as a plain function, so each one
// can be read, explained and tested on its own. Points reward effort and
// accuracy, never speed: a slower child on a shared phone loses nothing.

export const POINTS = {
  lessonComplete: 20,
  firstTry: 10,
  afterHint: 5,
  threeStarBonus: 30,
  improveBonus: 15,
  // Streak points (5 x day, capped at 7 days) arrive with ProgressContext.
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
