// Checks the seed data in src/data/progress.json against the real rules in
// src/lib, for every seed student:
//   1. each quiz attempt's stars match its score (1/2/3 stars at 50/75/90%)
//   2. each quiz attempt's points are what lib/scoring would award
//   3. the all-time points total is never less than the dated points
//      (20 per lesson + quiz attempt points + streak log)
//   4. no student qualifies for a badge they don't have
//
//   npm run check:seed            report only; exits 1 if anything is off
//   npm run check:seed -- --write fix 2 and 3 in progress.json, then report
//
// It loads src/lib through Vite so the '@/' imports resolve exactly as they
// do in the app; nothing here re-implements a rule.

import { readFileSync, writeFileSync } from 'node:fs'
import { createServer } from 'vite'

const FILE = new URL('../src/data/progress.json', import.meta.url)
const write = process.argv.includes('--write')

const vite = await createServer({
  logLevel: 'silent',
  server: { middlewareMode: true },
  appType: 'custom',
})
const { attemptPoints, answerPointsOf, starsFor, POINTS } =
  await vite.ssrLoadModule('/src/lib/scoring.js')
const { newlyEarnedBadges } = await vite.ssrLoadModule('/src/lib/badgeRules.js')
await vite.close()

const read = (name) =>
  JSON.parse(readFileSync(new URL(`../src/data/${name}.json`, import.meta.url)))
const seed = read('progress')
const chapters = read('chapters')
const badges = read('badges')
const quizzes = read('quizzes')
const students = read('students')
const questionCount = (quizId) => quizzes.find((q) => q.id === quizId).questions.length

const problems = []
const report = []

for (const student of seed) {
  const name = students.find((s) => s.id === student.studentId).name
  const before = student.points

  student.quizAttempts.forEach((attempt, i) => {
    const earlier = student.quizAttempts.slice(0, i).filter((a) => a.quizId === attempt.quizId)
    const n = questionCount(attempt.quizId)
    const expected = attemptPoints({
      score: attempt.score,
      stars: attempt.stars,
      earned: answerPointsOf(attempt, n),
      previousAttempts: earlier,
      questionCount: n,
    }).total

    if (starsFor(attempt.score) !== attempt.stars) {
      problems.push(
        `${name}: ${attempt.quizId} ${attempt.score}% has ${attempt.stars} stars, rules say ${starsFor(attempt.score)}`
      )
    }
    if (attempt.points !== expected) {
      if (write) attempt.points = expected
      else
        problems.push(
          `${name}: ${attempt.quizId} stored ${attempt.points} points, rules say ${expected}`
        )
    }
  })

  const dated =
    student.completedLessons.length * POINTS.lessonComplete +
    student.quizAttempts.reduce((sum, a) => sum + a.points, 0) +
    (student.streakLog ?? []).reduce((sum, e) => sum + e.points, 0)
  if (student.points < dated) {
    if (write) student.points = dated
    else problems.push(`${name}: total ${student.points} is below dated points ${dated}`)
  }

  const missing = newlyEarnedBadges(badges, student, chapters)
  if (missing.length)
    problems.push(`${name}: qualifies for ${missing.join(', ')} but doesn't have it`)

  report.push({
    id: student.studentId,
    name,
    classId: students.find((s) => s.id === student.studentId).classId,
    before,
    after: student.points,
    dated,
  })
}

if (write) {
  // Same layout as the hand-edited file: one short object per line.
  let json = JSON.stringify(seed, null, 2)
  json = json.replace(
    /\{\n\s+([^{}[\]]*?)\n\s+\}/g,
    (_, body) => `{ ${body.split(/,\n\s+/).join(', ')} }`
  )
  writeFileSync(FILE, json + '\n')
}

console.table(report)
if (problems.length) {
  console.log(`\n${problems.length} problem(s):\n- ${problems.join('\n- ')}`)
  process.exit(1)
}
console.log(`\nAll ${seed.length} seed students pass.`)
