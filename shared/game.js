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
// Devanagari digits (०-९) are turned into 0-9 first, so "३४५६" matches 3456.
function normalise(value) {
  return String(value)
    .replace(/[०-९]/g, (d) => String('०१२३४५६७८९'.indexOf(d)))
    .replace(/[\s,]/g, '')
    .toLowerCase()
}

export function checkAnswer(question, given) {
  // order and pattern answers are lists that must match one for one
  if (question.type === 'order' || question.type === 'pattern') {
    return Array.isArray(given) && given.length === question.answer.length && given.every((v, i) => v === question.answer[i])
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
// The same credit is used for quiz scores and for accuracy in reports.
export function answerCredit(outcome) {
  return outcome === 'first' ? 1 : outcome === 'hint' ? 0.5 : 0
}

export function scoreQuiz(outcomes) {
  const credit = outcomes.reduce((sum, o) => sum + answerCredit(o), 0)
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

// ---------- checking what a teacher writes ----------
// Used by the server before saving (it has the final say) and by the editors,
// so a teacher sees the same problems while typing. Each function returns a
// list of problems in plain words; an empty list means it is fine.

export const LIMITS = {
  title: 80,
  prompt: 300,
  stepText: 1000,
  option: 80,
  hint: 200,
  explanation: 300,
  topic: 40,
  minOptions: 2,
  maxOptions: 6,
  minItems: 2,
  maxItems: 8,
  maxSteps: 12,
  maxQuestions: 40,
  // games
  maxGroups: 3, // count: kinds of object on the board
  maxPerGroup: 12, // count: objects of one kind
  maxObjects: 20, // count: objects on the board in all
  minPattern: 3, // pattern: tiles in the row
  maxPattern: 8,
  maxGaps: 2, // pattern: missing tiles
  maxDecoys: 3, // pattern: extra wrong tiles to choose from
}

const filled = (value) => typeof value === 'string' && value.trim() !== ''
const tooLong = (value, max) => typeof value === 'string' && value.trim().length > max

// A question has: type ('mcq' | 'input' | 'order' | a game, see GAME_TYPES), prompt, hint, explanation,
// topic (quiz questions only), and an answer:
//   mcq:   options (2-6 different texts) and answer (one of the options)
//   input: answer (the text to type)
//   order: answer (2-8 items, in the right order; students see them shuffled)
//   games: a `config` (see the games section below); the answer is worked out from it
export function questionProblems(question, { needsTopic = false } = {}) {
  const q = question ?? {}
  const problems = []

  if (!['mcq', 'input', 'order', ...GAME_TYPES].includes(q.type)) return ['Choose a question type.']

  if (!filled(q.prompt)) problems.push('Write the question.')
  else if (tooLong(q.prompt, LIMITS.prompt)) problems.push(`Keep the question under ${LIMITS.prompt} characters.`)

  if (q.type === 'mcq') {
    const options = Array.isArray(q.options) ? q.options : []
    if (options.length < LIMITS.minOptions) problems.push(`Give at least ${LIMITS.minOptions} options.`)
    if (options.length > LIMITS.maxOptions) problems.push(`Give at most ${LIMITS.maxOptions} options.`)
    if (options.some((o) => !filled(o))) problems.push('Fill in every option, or remove the empty one.')
    if (options.some((o) => tooLong(o, LIMITS.option))) problems.push(`Keep each option under ${LIMITS.option} characters.`)
    const seen = options.filter(filled).map((o) => o.trim().toLowerCase())
    if (new Set(seen).size !== seen.length) problems.push('Two options are the same.')
    const isOption = options.some((o) => filled(o) && filled(q.answer) && o.trim() === q.answer.trim())
    if (!isOption) problems.push('Choose which option is the right answer.')
  }

  if (q.type === 'input') {
    if (!filled(q.answer)) problems.push('Write the right answer.')
    else if (tooLong(q.answer, LIMITS.option)) problems.push(`Keep the answer under ${LIMITS.option} characters.`)
  }

  if (q.type === 'order') {
    const items = Array.isArray(q.answer) ? q.answer : []
    if (items.length < LIMITS.minItems) problems.push(`An order question needs at least ${LIMITS.minItems} items.`)
    if (items.length > LIMITS.maxItems) problems.push(`An order question can have at most ${LIMITS.maxItems} items.`)
    if (items.some((item) => !filled(item))) problems.push('Fill in every item, or remove the empty one.')
    if (items.some((item) => tooLong(item, LIMITS.option))) problems.push(`Keep each item under ${LIMITS.option} characters.`)
  }

  if (isGame(q.type)) problems.push(...gameProblems(q))

  if (!filled(q.hint)) problems.push('Write a hint (shown after the first wrong answer).')
  else if (tooLong(q.hint, LIMITS.hint)) problems.push(`Keep the hint under ${LIMITS.hint} characters.`)
  if (!filled(q.explanation)) problems.push('Write an explanation (shown after the second wrong answer).')
  else if (tooLong(q.explanation, LIMITS.explanation)) problems.push(`Keep the explanation under ${LIMITS.explanation} characters.`)

  if (needsTopic && !filled(q.topic)) problems.push('Give the question a topic, for example "Place value".')
  if (tooLong(q.topic, LIMITS.topic)) problems.push(`Keep the topic under ${LIMITS.topic} characters.`)

  for (const lang of ['hi', 'mr']) problems.push(...translationProblems(q, lang))
  return problems
}

// ---------- Hindi and Marathi ----------
// Teachers write everything in English, and may add Hindi (hi) and Marathi
// (mr) versions next to it, e.g. question.hi = { prompt, options, items, hint,
// explanation }, step.hi = { text }, lesson.hi = { title }. Each field falls
// back to English on its own when its translation is empty.
// Options and order items are the exception: they are translated all together
// or not at all, one for one with the English, so the right answer still
// lines up (option 3 in Hindi is option 3 in English).

export const LANGUAGES = ['en', 'hi', 'mr']
const LANGUAGE_NAMES = { hi: 'Hindi', mr: 'Marathi' }

function translationProblems(q, lang) {
  const t = q?.[lang]
  if (!t) return []
  const problems = []
  const name = LANGUAGE_NAMES[lang]
  for (const [field, max] of [['prompt', LIMITS.prompt], ['hint', LIMITS.hint], ['explanation', LIMITS.explanation]]) {
    if (tooLong(t[field], max)) problems.push(`${name}: keep the ${field === 'prompt' ? 'question' : field} under ${max} characters.`)
  }
  const list = (value) => (Array.isArray(value) ? value : [])
  const english = q.type === 'mcq' ? list(q.options) : q.type === 'order' ? list(q.answer) : []
  const translated = q.type === 'mcq' ? list(t.options) : q.type === 'order' ? list(t.items) : []
  const word = q.type === 'mcq' ? 'option' : 'item'
  if (translated.some(filled)) {
    if (translated.length !== english.length || translated.some((x) => !filled(x))) {
      problems.push(`${name}: translate every ${word}, or leave all of them empty.`)
    } else if (q.type === 'mcq' && new Set(translated.map((x) => x.trim().toLowerCase())).size !== translated.length) {
      problems.push(`${name}: two options are the same.`)
    }
    if (translated.some((x) => tooLong(x, LIMITS.option))) problems.push(`${name}: keep each ${word} under ${LIMITS.option} characters.`)
  }
  return problems
}

// The text of `field` in `lang`, or the English if there is no translation.
export function inLanguage(thing, field, lang) {
  const translated = lang && lang !== 'en' ? thing?.[lang]?.[field] : null
  return filled(translated) ? translated : thing?.[field]
}

// A question as a student in `lang` sees it, with its answer in that same
// language (so their answer can be checked against it). Falls back to English
// field by field.
export function localizeQuestion(q, lang) {
  const t = lang && lang !== 'en' ? q[lang] : null
  const out = {
    ...q,
    prompt: inLanguage(q, 'prompt', lang),
    hint: inLanguage(q, 'hint', lang),
    explanation: inLanguage(q, 'explanation', lang),
  }
  const complete = (list, length) => Array.isArray(list) && list.length === length && list.every(filled)
  if (q.type === 'mcq' && t && complete(t.options, q.options.length)) {
    out.options = t.options
    out.answer = t.options[q.options.indexOf(q.answer)]
  }
  if (q.type === 'order' && t && complete(t.items, q.answer.length)) out.answer = t.items
  return out
}

// "Give it a hint." -> "give it a hint.", to follow "Question 2: ". Language names keep their capital.
const lowerFirst = (p) => (/^(Hindi|Marathi)\b/.test(p) ? p : p.charAt(0).toLowerCase() + p.slice(1))

// A lesson: a title and 1-12 steps. Each step is explain, example or activity,
// with some text; an activity step may also have one question.
export function lessonProblems(lesson) {
  const problems = []
  if (!filled(lesson?.title)) problems.push('Give the lesson a title.')
  else if (tooLong(lesson.title, LIMITS.title)) problems.push(`Keep the title under ${LIMITS.title} characters.`)
  for (const lang of ['hi', 'mr']) {
    if (tooLong(lesson?.[lang]?.title, LIMITS.title)) problems.push(`${LANGUAGE_NAMES[lang]} title is over ${LIMITS.title} characters.`)
  }

  const steps = Array.isArray(lesson?.steps) ? lesson.steps : []
  if (steps.length === 0) problems.push('Add at least one step.')
  if (steps.length > LIMITS.maxSteps) problems.push(`A lesson can have at most ${LIMITS.maxSteps} steps.`)
  steps.forEach((step, i) => {
    const where = `Step ${i + 1}: `
    if (!['explain', 'example', 'activity'].includes(step?.type)) problems.push(where + 'choose a step type.')
    if (!filled(step?.text)) problems.push(where + 'write the text.')
    else if (tooLong(step.text, LIMITS.stepText)) problems.push(where + `keep the text under ${LIMITS.stepText} characters.`)
    for (const lang of ['hi', 'mr']) {
      if (tooLong(step?.[lang]?.text, LIMITS.stepText)) problems.push(where + `${LANGUAGE_NAMES[lang]} text is over ${LIMITS.stepText} characters.`)
    }
    if (step?.question) {
      if (step.type !== 'activity') problems.push(where + 'only an activity step can have a question.')
      for (const p of questionProblems(step.question)) problems.push(where + lowerFirst(p))
    }
  })
  return problems
}

// A quiz: 1-40 questions, each needing a topic (reports group by topic).
export function quizProblems(questions) {
  const list = Array.isArray(questions) ? questions : []
  const problems = []
  if (list.length === 0) problems.push('Add at least one question.')
  if (list.length > LIMITS.maxQuestions) problems.push(`A quiz can have at most ${LIMITS.maxQuestions} questions.`)
  list.forEach((q, i) => {
    for (const p of questionProblems(q, { needsTopic: true })) problems.push(`Question ${i + 1}: ${lowerFirst(p)}`)
  })
  return problems
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
// 'locked'. (A chapter marked `locked: true` shows as 'soon'; the server
// only ever sends published chapters, so in the app that doesn't happen.)
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
// awarded twice. They work with any chapters a teacher makes.
// `chapters` is the list the student can see: [{ id, lessonIds, quizId }].

// "Finished" means every lesson done and the quiz passed with 1 star or more.
function chaptersFinished(chapters, progress) {
  return chapters.filter((c) => c.quizId && quizOpen(c, progress) && bestStars(progress, c.quizId) >= 1).length
}

// A retake that scored higher than every earlier attempt on the same quiz.
function improvedOnRetake(progress) {
  return progress.attempts.some((attempt, i) => {
    const earlier = progress.attempts.slice(0, i).filter((a) => a.quizId === attempt.quizId)
    return earlier.length > 0 && attempt.score > Math.max(...earlier.map((a) => a.score))
  })
}

// Longest run of quiz answers right first time, across all quizzes in order.
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
  { id: 'first-step', name: 'First Step', howTo: 'Finish your first lesson.', check: (p) => p.lessons.length > 0 },
  { id: 'chapter-champion', name: 'Chapter Champion', howTo: 'Finish a chapter: every lesson, then pass the quiz.', check: (p, c) => chaptersFinished(c, p) >= 1 },
  { id: 'star-student', name: 'Star Student', howTo: 'Get 3 stars on any quiz.', check: (p) => p.attempts.some((a) => a.stars === 3) },
  { id: 'explorer', name: 'Explorer', howTo: 'Finish 3 chapters.', check: (p, c) => chaptersFinished(c, p) >= 3 },
  { id: 'on-fire', name: 'On Fire', howTo: 'Learn 5 days in a row.', check: (p) => bestStreak(p) >= 5 },
  { id: 'never-give-up', name: 'Never Give Up', howTo: 'Beat your best score when you retake a quiz.', check: (p) => improvedOnRetake(p) },
  { id: 'sharp-mind', name: 'Sharp Mind', howTo: 'Get 10 quiz answers right first time in a row.', check: (p) => longestFirstTryRun(p) >= 10 },
]

// Every badge with whether this student has earned it: [{ id, name, howTo, earned }]
// (The app shows the name and how-to in the student's language, looked up by id.)
export function badges(progress, chapters) {
  return BADGES.map((b) => ({ id: b.id, name: b.name, howTo: b.howTo, earned: b.check(progress, chapters) }))
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

// ---------- accuracy and "struggling" (teacher reports) ----------
// Accuracy = credit / number of answers, as a percentage, with the same
// credit as quiz scores: right first time 1, right after the hint 0.5, missed 0.
// Reports look only at each student's LATEST finished attempt on each quiz,
// so a student who retakes a quiz and improves stops being flagged.
// A chapter or topic counts as "struggling" below 60% once there are at
// least 3 answers to judge from. With no answers, accuracy is null (never NaN).

export const STRUGGLING_BELOW = 60
export const MIN_ANSWERS = 3

// The latest attempt on each quiz. `attempts` must be oldest first.
export function latestAttempts(attempts) {
  const latest = new Map()
  for (const attempt of attempts) latest.set(attempt.quizId, attempt)
  return [...latest.values()]
}

// answers: [{ outcome, ... }]. Returns { answers, credit, accuracy, struggling }.
export function accuracyOf(answers) {
  const credit = answers.reduce((sum, a) => sum + answerCredit(a.outcome), 0)
  const accuracy = answers.length ? Math.round((credit / answers.length) * 100) : null
  const struggling = answers.length >= MIN_ANSWERS && accuracy < STRUGGLING_BELOW
  return { answers: answers.length, credit, accuracy, struggling }
}

// Groups answers by keyOf(answer) (a topic, a chapter id...) and works out
// the accuracy of each group, lowest accuracy first.
export function accuracyBy(answers, keyOf) {
  const groups = new Map()
  for (const answer of answers) {
    const key = keyOf(answer)
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key).push(answer)
  }
  return [...groups.entries()]
    .map(([key, list]) => ({ key, ...accuracyOf(list) }))
    .sort((a, b) => a.accuracy - b.accuracy || b.answers - a.answers)
}

// A student's weakest topics: those with enough answers to judge, lowest
// accuracy first (at most `count`). Each says whether it counts as struggling.
export function weakestTopics(topicRows, count = 3) {
  return topicRows.filter((t) => t.answers >= MIN_ANSWERS).slice(0, count)
}

// ---------- games ----------
// A game is a question type that is played instead of read. Everything about it
// lives in question.config, and the right answer is worked out from the config
// (gameAnswer), so a teacher never types an answer that could disagree with the board.
//
//   count:   config { groups: [{ object, colour?, count }], target }
//            Several kinds of object sit on a board; students count the `target` kind.
//            Answer: that group's count, as text.
//   pattern: config { sequence: [tile], gaps: [positions], extras: [tile] }
//            A row of tiles with 1-2 missing; students drag the right tiles in.
//            A tile is 'shape:colour', for example 'star:red'.
//            Answer: the missing tiles, in order, as a list.
//
// What a student receives is gameView(): the board and nothing that gives the
// answer away (a pattern's missing tiles are blanks; its choices are shuffled).
// Teacher and student screens write their words in the language files, never here.

export const GAME_TYPES = ['count', 'pattern']
export const isGame = (type) => GAME_TYPES.includes(type)

export const OBJECTS = ['mango', 'bird', 'tile', 'block']
export const TINTED = ['tile', 'block'] // the objects that come in colours
export const COLOURS = ['red', 'blue', 'green', 'yellow', 'purple']
export const SHAPES = ['circle', 'square', 'triangle', 'star', 'diamond', 'heart']

export const tileKey = (shape, colour) => `${shape}:${colour}`

export function parseTile(key) {
  const [shape, colour] = String(key).split(':')
  return SHAPES.includes(shape) && COLOURS.includes(colour) ? { shape, colour } : null
}

const asList = (value) => (Array.isArray(value) ? value : [])

// Shapes whatever the editor sent into a tidy config: trimmed text, whole numbers,
// gaps in order. It never fixes a mistake; gameProblems reports it.
export function cleanGameConfig(type, config) {
  const c = config ?? {}
  const int = (v) => (v === '' || v === null || v === undefined || !Number.isInteger(Number(v)) ? null : Number(v))
  const text = (v) => (typeof v === 'string' ? v.trim() : '')
  if (type === 'count') {
    return {
      groups: asList(c.groups).map((g) => {
        const out = { object: text(g?.object) }
        if (TINTED.includes(out.object)) out.colour = text(g?.colour)
        out.count = int(g?.count)
        return out
      }),
      target: int(c.target),
    }
  }
  if (type === 'pattern') {
    return {
      sequence: asList(c.sequence).map(text),
      gaps: [...new Set(asList(c.gaps).map(int).filter((n) => n !== null))].sort((a, b) => a - b),
      extras: asList(c.extras).map(text),
    }
  }
  return {}
}

// The right answer, from the config. '' or [] when the config is not valid yet.
export function gameAnswer(q) {
  const c = q?.config ?? {}
  if (q?.type === 'count') {
    const group = asList(c.groups)[c.target]
    return group && Number.isInteger(group.count) ? String(group.count) : ''
  }
  if (q?.type === 'pattern') return asList(c.gaps).map((i) => asList(c.sequence)[i]).filter(Boolean)
  return ''
}

export function gameProblems(q) {
  const c = q?.config ?? {}
  const problems = []

  if (q?.type === 'count') {
    const groups = asList(c.groups)
    if (groups.length < 1) problems.push('Add at least one kind of object to count.')
    if (groups.length > LIMITS.maxGroups) problems.push(`Use at most ${LIMITS.maxGroups} kinds of object.`)
    groups.forEach((g, i) => {
      const where = `Group ${i + 1}: `
      if (!OBJECTS.includes(g?.object)) problems.push(where + 'choose an object.')
      else if (TINTED.includes(g.object) && !COLOURS.includes(g.colour)) problems.push(where + 'choose a colour.')
      if (!Number.isInteger(g?.count) || g.count < 1 || g.count > LIMITS.maxPerGroup) {
        problems.push(where + `choose a number from 1 to ${LIMITS.maxPerGroup}.`)
      }
    })
    const kinds = groups.map((g) => `${g?.object}/${g?.colour ?? ''}`)
    if (new Set(kinds).size !== kinds.length) problems.push('Two groups look the same. Change the object or the colour.')
    const total = groups.reduce((sum, g) => sum + (Number.isInteger(g?.count) ? g.count : 0), 0)
    if (total > LIMITS.maxObjects) problems.push(`The board can hold ${LIMITS.maxObjects} objects in all. It has ${total}.`)
    if (!Number.isInteger(c.target) || c.target < 0 || c.target >= groups.length) problems.push('Choose which group the students count.')
  }

  if (q?.type === 'pattern') {
    const sequence = asList(c.sequence)
    const gaps = asList(c.gaps)
    const extras = asList(c.extras)
    if (sequence.length < LIMITS.minPattern || sequence.length > LIMITS.maxPattern) {
      problems.push(`The row needs ${LIMITS.minPattern} to ${LIMITS.maxPattern} tiles.`)
    }
    if (sequence.some((k) => !parseTile(k))) problems.push('Choose a shape and a colour for every tile.')
    if (gaps.length < 1 || gaps.length > LIMITS.maxGaps) problems.push(`Hide ${LIMITS.maxGaps === 1 ? 'one tile' : `1 or ${LIMITS.maxGaps} tiles`} for students to find.`)
    if (gaps.some((i) => !Number.isInteger(i) || i < 0 || i >= sequence.length)) problems.push('A hidden tile is outside the row.')
    if (sequence.length - gaps.length < 2) problems.push('Leave at least 2 tiles showing.')
    if (extras.length > LIMITS.maxDecoys) problems.push(`Use at most ${LIMITS.maxDecoys} extra tiles.`)
    if (extras.some((k) => !parseTile(k))) problems.push('Choose a shape and a colour for every extra tile.')
    const missing = gaps.map((i) => sequence[i])
    if (extras.some((k) => missing.includes(k))) problems.push('An extra tile is the same as a hidden tile, so two answers would be right. Change it.')
    if (new Set(extras).size !== extras.length) problems.push('Two extra tiles are the same.')
  }

  return problems
}

// What a student receives for a game: the board, without the answer. `shuffle`
// mixes a list (the server and the app each pass their own).
//   count:   { groups: [{ object, colour?, count }], ask: { object, colour? } }
//            `ask` is the kind to count; the number is whatever is on the board.
//   pattern: { sequence: [tile or null for a gap], gaps: [positions], choices: [tile, ...] }
export function gameView(q, shuffle = (list) => list) {
  const c = q.config
  if (q.type === 'count') {
    const kind = (g) => ({ object: g.object, ...(g.colour ? { colour: g.colour } : {}) })
    return { groups: c.groups.map((g) => ({ ...kind(g), count: g.count })), ask: kind(c.groups[c.target]) }
  }
  if (q.type === 'pattern') {
    return {
      sequence: c.sequence.map((k, i) => (c.gaps.includes(i) ? null : k)),
      gaps: c.gaps,
      choices: shuffle([...c.gaps.map((i) => c.sequence[i]), ...c.extras]),
    }
  }
  return null
}

// Is there enough of an answer to press Check? `view` is what gameView gave.
export function gameReady(type, view, given) {
  if (type === 'count') return Number(normalise(given ?? '')) >= 1
  if (type === 'pattern') return Array.isArray(given) && given.length === view.gaps.length && given.every(Boolean)
  return false
}
