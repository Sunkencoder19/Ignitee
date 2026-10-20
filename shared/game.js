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
  // match, pairs and sort answers are strings like 'a|b' in any order
  if (question.type === 'match' || question.type === 'pairs' || question.type === 'sort') {
    const pairs = Array.isArray(given) ? [...given].sort() : []
    return pairs.length === question.answer.length && pairs.every((v, i) => v === [...question.answer].sort()[i])
  }
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
  minMatch: 3, // match: pictures to pair up
  maxMatch: 5,
  maxSpan: 30, // numberline: numbers on the line
  maxJumps: 10,
  // any-subject activities
  minPairs: 3, // pairs: words to match up
  maxPairs: 5,
  minSortGroups: 2, // sort: groups to sort into
  maxSortGroups: 3,
  maxSortPerGroup: 5, // sort: items in one group
  maxSortItems: 10, // sort: items in all
  groupName: 30,
  sortItem: 40,
  maxWord: 12, // unscramble: letters in the word
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

// The lists of words in a question that are translated all together, one for one
// with the English, so the right answer still lines up: options (mcq), items
// (order), both sides (pairs), group names and items (sort).
export function translatableLists(q) {
  const list = (value) => (Array.isArray(value) ? value : [])
  if (q?.type === 'mcq') return [{ field: 'options', label: 'Options', word: 'option', english: list(q.options) }]
  if (q?.type === 'order') return [{ field: 'items', label: 'Items, in the right order', word: 'item', english: list(q.answer) }]
  if (q?.type === 'pairs') {
    const pairs = list(q.config?.pairs)
    return [
      { field: 'lefts', label: 'Left side', word: 'left word', english: pairs.map((p) => p?.a ?? '') },
      { field: 'rights', label: 'Right side', word: 'right word', english: pairs.map((p) => p?.b ?? '') },
    ]
  }
  if (q?.type === 'sort') {
    const groups = list(q.config?.groups)
    return [
      { field: 'groups', label: 'Group names', word: 'group name', english: groups.map((g) => g?.name ?? '') },
      { field: 'items', label: 'Items to sort', word: 'item', english: groups.flatMap((g) => list(g?.items)) },
    ]
  }
  return []
}

// The names of those lists for a type, for saving.
export const translatableFields = (type) => translatableLists({ type, config: { pairs: [], groups: [] } }).map((x) => x.field)

function translationProblems(q, lang) {
  const t = q?.[lang]
  if (!t) return []
  const problems = []
  const name = LANGUAGE_NAMES[lang]
  for (const [field, max] of [['prompt', LIMITS.prompt], ['hint', LIMITS.hint], ['explanation', LIMITS.explanation]]) {
    if (tooLong(t[field], max)) problems.push(`${name}: keep the ${field === 'prompt' ? 'question' : field} under ${max} characters.`)
  }
  for (const { field, english, word } of translatableLists(q)) {
    const translated = Array.isArray(t[field]) ? t[field] : []
    if (!translated.some(filled)) continue
    if (translated.length !== english.length || translated.some((x) => !filled(x))) {
      problems.push(`${name}: translate every ${word}, or leave all of them empty.`)
    } else if (q.type !== 'order' && new Set(translated.map((x) => x.trim().toLowerCase())).size !== translated.length) {
      problems.push(`${name}: two ${word}s are the same.`)
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
  if (q.type === 'pairs' && t && complete(t.lefts, q.config.pairs.length) && complete(t.rights, q.config.pairs.length)) {
    out.config = { ...q.config, pairs: q.config.pairs.map((_, i) => ({ a: t.lefts[i], b: t.rights[i] })) }
  }
  if (q.type === 'sort' && t) {
    const groups = q.config.groups
    const total = groups.reduce((sum, g) => sum + g.items.length, 0)
    if (complete(t.groups, groups.length) && complete(t.items, total)) {
      let at = 0
      out.config = { ...q.config, groups: groups.map((g, i) => ({ name: t.groups[i], items: g.items.map(() => t.items[at++]) })) }
    }
  }
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
  const dates = [...progress.lessons.map((l) => l.date), ...progress.attempts.map((a) => a.date), ...(progress.dailies ?? []).map((d) => d.date)]
  return [...new Set(dates)].sort()
}

export function totalPoints(progress) {
  const quizPoints = attemptsWithPoints(progress).reduce((sum, a) => sum + a.points, 0)
  const dailyPoints = (progress.dailies ?? []).reduce((sum, d) => sum + d.points, 0)
  return (
    progress.lessons.length * POINTS.lesson +
    quizPoints +
    dailyPoints +
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

// ---------- subjects ----------
// Every chapter belongs to a subject. Worlds on the student's map are grouped by
// subject and open in order WITHIN a subject (finish Maths 1 to open Maths 2;
// English has its own order). Names are in the language files (subjects.<id>).

// `name` is for the teacher screens (English); students see subjects.<id> from the language files.
export const SUBJECTS = [
  { id: 'maths', name: 'Maths', colour: '#2f6fed' },
  { id: 'english', name: 'English', colour: '#c0287c' },
  { id: 'hindi', name: 'Hindi', colour: '#b45400' },
  { id: 'marathi', name: 'Marathi', colour: '#7b3fe0' },
  { id: 'science', name: 'Science', colour: '#0f7a4d' },
  { id: 'evs', name: 'Environment (EVS)', colour: '#007a94' },
  { id: 'social', name: 'Social studies', colour: '#a3411b' },
  { id: 'gk', name: 'General knowledge', colour: '#4f46c8' },
]
export const SUBJECT_IDS = SUBJECTS.map((x) => x.id)
export const subjectColour = (id) => SUBJECTS.find((x) => x.id === id)?.colour ?? SUBJECTS[0].colour

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

// Chapters open in order within their subject. A chapter is 'done' once its quiz has 1 star or
// more, the first chapter that isn't done is 'open', and the rest are
// 'locked'. (A chapter marked `locked: true` shows as 'soon'; the server
// only ever sends published chapters, so in the app that doesn't happen.)
export function chapterStates(chapters, progress) {
  const previousDone = new Map() // per subject: is the chapter before this one done? (true at the start)
  return chapters.map((chapter) => {
    const subject = chapter.subject ?? 'maths'
    const stars = chapter.quizId ? bestStars(progress, chapter.quizId) : 0
    const before = previousDone.get(subject) ?? true
    let state = 'locked'
    if (chapter.locked) state = 'soon'
    else if (before && stars >= 1) state = 'done'
    else if (before) state = 'open'
    previousDone.set(subject, state === 'done')
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
//   match:   config { tiles: [tile] }
//            Pictures on one side, their names on the other; students pair them up.
//            Answer: every picture paired with its own name, as 'tile|tile' strings.
//   numberline: config { ask: 'land', min, max, start, step, jumps }
//                    or { ask: 'count', min, max, start, step, target }
//            A frog jumps along a number line. 'land': where does it end up after
//            `jumps` jumps of `step`? 'count': how many jumps reach `target`?
//            Answer: that number, as text.
//   truefalse: config { truth: true | false }
//            The question is a statement; students tap True or False.
//            Answer: 'true' or 'false'.
//   unscramble: config { word }
//            The letters of a word are mixed up; students tap them back into order
//            (spelling, in any language). Answer: the word.
//   pairs:   config { pairs: [{ a, b }] }
//            Words on the left and right (animal and its sound, word and its meaning,
//            country and its capital); students pair them up.
//            Answer: each left paired with its own right, as 'i|i' strings.
//   sort:    config { groups: [{ name, items: [...] }] }
//            Items to sort into groups (living and non-living, nouns and verbs).
//            Answer: each item with its group, as 'item|group' strings (by position).
//   placevalue: config { ask: 'build' | 'read', places: 2-4, target }
//            Place-value columns (ones, tens, hundreds, thousands). 'build': make the
//            number with blocks. 'read': read the blocks and set the number.
//            Answer: the number, as text.
//
// What a student receives is gameView(): the board and nothing that gives the
// answer away (a pattern's missing tiles are blanks; its choices are shuffled).
// Teacher and student screens write their words in the language files, never here.

export const MATHS_GAMES = ['count', 'pattern', 'match', 'numberline', 'placevalue'] // pictures and numbers
export const ACTIVITY_TYPES = ['truefalse', 'unscramble', 'pairs', 'sort'] // for any subject
export const GAME_TYPES = [...ACTIVITY_TYPES, ...MATHS_GAMES]
export const isGame = (type) => GAME_TYPES.includes(type)

export const OBJECTS = ['mango', 'bird', 'tile', 'block']
export const TINTED = ['tile', 'block'] // the objects that come in colours
export const COLOURS = ['red', 'blue', 'green', 'yellow', 'purple']
export const SHAPES = ['circle', 'square', 'triangle', 'star', 'diamond', 'heart']

export const tileKey = (shape, colour) => `${shape}:${colour}`

// The letters of a word as a person sees them (a Hindi letter with its vowel sign is one).
export function graphemes(text) {
  const word = String(text ?? '')
  if (typeof Intl !== 'undefined' && Intl.Segmenter) return [...new Intl.Segmenter(undefined, { granularity: 'grapheme' }).segment(word)].map((x) => x.segment)
  return [...word]
}

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
  if (type === 'match') return { tiles: asList(c.tiles).map(text) }
  if (type === 'truefalse') return { truth: c.truth === true || c.truth === 'true' ? true : c.truth === false || c.truth === 'false' ? false : null }
  if (type === 'unscramble') return { word: text(c.word) }
  if (type === 'pairs') return { pairs: asList(c.pairs).map((p) => ({ a: text(p?.a), b: text(p?.b) })) }
  if (type === 'sort') return { groups: asList(c.groups).map((g) => ({ name: text(g?.name), items: asList(g?.items).map(text) })) }
  if (type === 'numberline') {
    const out = { ask: text(c.ask), min: int(c.min), max: int(c.max), start: int(c.start), step: int(c.step) }
    if (out.ask === 'count') out.target = int(c.target)
    else out.jumps = int(c.jumps)
    return out
  }
  if (type === 'placevalue') return { ask: text(c.ask), places: int(c.places), target: int(c.target) }
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
  if (q?.type === 'match') return asList(c.tiles).map((k) => `${k}|${k}`).sort()
  if (q?.type === 'numberline') {
    if (![c.start, c.step].every(Number.isInteger)) return ''
    if (c.ask === 'count') return Number.isInteger(c.target) ? String((c.target - c.start) / c.step) : ''
    return Number.isInteger(c.jumps) ? String(c.start + c.step * c.jumps) : ''
  }
  if (q?.type === 'placevalue') return Number.isInteger(c.target) ? String(c.target) : ''
  if (q?.type === 'truefalse') return typeof c.truth === 'boolean' ? String(c.truth) : ''
  if (q?.type === 'unscramble') return typeof c.word === 'string' ? c.word : ''
  if (q?.type === 'pairs') return asList(c.pairs).map((_, i) => `${i}|${i}`).sort()
  if (q?.type === 'sort') {
    let id = 0
    return asList(c.groups).flatMap((g, gi) => asList(g?.items).map(() => `${id++}|${gi}`)).sort()
  }
  return ''
}

// The right answer in words, for showing a student after they have missed it.
// (pairs and sort keep their answer as numbers; everything else is shown as it is.)
export function displayAnswer(q) {
  const c = q?.config ?? {}
  if (q?.type === 'pairs') return asList(c.pairs).map((p) => `${p.a} = ${p.b}`)
  if (q?.type === 'sort') return asList(c.groups).flatMap((g) => asList(g.items).map((item) => `${item}: ${g.name}`))
  return q?.answer
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

  if (q?.type === 'match') {
    const tiles = asList(c.tiles)
    if (tiles.length < LIMITS.minMatch || tiles.length > LIMITS.maxMatch) problems.push(`Use ${LIMITS.minMatch} to ${LIMITS.maxMatch} pictures to match.`)
    if (tiles.some((k) => !parseTile(k))) problems.push('Choose a shape and a colour for every picture.')
    if (new Set(tiles).size !== tiles.length) problems.push('Two pictures are the same, so a name could match both. Change one.')
  }

  if (q?.type === 'numberline') {
    const { ask, min, max, start, step, jumps, target } = c
    const whole = [min, max, start, step].every(Number.isInteger)
    if (!['land', 'count'].includes(ask)) problems.push('Choose what students find out: where they land, or how many jumps.')
    if (!whole) problems.push('Fill in the first number, last number, start and jump size as whole numbers.')
    else {
      if (min >= max) problems.push('The last number must be bigger than the first.')
      else if (max - min > LIMITS.maxSpan) problems.push(`The line can hold at most ${LIMITS.maxSpan + 1} numbers.`)
      if (start < min || start > max) problems.push('The start must be on the line.')
      if (step === 0 || Math.abs(step) > 10) problems.push('The jump size must be from 1 to 10, or from -10 to -1 to jump backwards.')
      else if (ask === 'land') {
        if (!Number.isInteger(jumps) || jumps < 1 || jumps > LIMITS.maxJumps) problems.push(`Choose from 1 to ${LIMITS.maxJumps} jumps.`)
        else if (start + step * jumps < min || start + step * jumps > max) problems.push('The frog would jump off the line. Widen the line or use fewer jumps.')
      } else if (ask === 'count') {
        if (!Number.isInteger(target) || target < min || target > max) problems.push('The target must be on the line.')
        else if ((target - start) % step !== 0 || (target - start) / step < 1) problems.push('The frog cannot land exactly on the target with that jump size. Change the target or the jump.')
        else if ((target - start) / step > LIMITS.maxJumps) problems.push(`That is more than ${LIMITS.maxJumps} jumps. Move the target closer.`)
      }
    }
  }

  if (q?.type === 'placevalue') {
    if (!['build', 'read'].includes(c.ask)) problems.push('Choose whether students build the number or read it.')
    if (!Number.isInteger(c.places) || c.places < 2 || c.places > 4) problems.push('Use 2, 3 or 4 places.')
    else if (!Number.isInteger(c.target) || c.target < 1 || c.target >= 10 ** c.places) problems.push(`The number must be from 1 to ${10 ** c.places - 1}.`)
  }

  if (q?.type === 'truefalse') {
    if (typeof c.truth !== 'boolean') problems.push('Choose whether the statement is true or false.')
  }

  if (q?.type === 'unscramble') {
    const word = typeof c.word === 'string' ? c.word : ''
    const letters = graphemes(word)
    if (!filled(word)) problems.push('Write the word students will spell.')
    else if (/\s/.test(word)) problems.push('Use one word, with no spaces.')
    else if (letters.length < 2 || letters.length > LIMITS.maxWord) problems.push(`The word needs 2 to ${LIMITS.maxWord} letters.`)
    else if (new Set(letters).size < 2) problems.push('Use a word with at least two different letters.')
  }

  if (q?.type === 'pairs') {
    const pairs = asList(c.pairs)
    if (pairs.length < LIMITS.minPairs || pairs.length > LIMITS.maxPairs) problems.push(`Use ${LIMITS.minPairs} to ${LIMITS.maxPairs} pairs.`)
    if (pairs.some((p) => !filled(p?.a) || !filled(p?.b))) problems.push('Fill in both sides of every pair, or remove the empty one.')
    if (pairs.some((p) => tooLong(p?.a, LIMITS.option) || tooLong(p?.b, LIMITS.option))) problems.push(`Keep each word under ${LIMITS.option} characters.`)
    const lower = (list) => list.map((x) => String(x ?? '').trim().toLowerCase()).filter(Boolean)
    for (const [side, name] of [['a', 'left'], ['b', 'right']]) {
      const words = lower(pairs.map((p) => p?.[side]))
      if (new Set(words).size !== words.length) problems.push(`Two words on the ${name} side are the same, so a match could be right either way.`)
    }
  }

  if (q?.type === 'sort') {
    const groups = asList(c.groups)
    if (groups.length < LIMITS.minSortGroups || groups.length > LIMITS.maxSortGroups) problems.push(`Use ${LIMITS.minSortGroups} or ${LIMITS.maxSortGroups} groups.`)
    groups.forEach((g, i) => {
      const where = `Group ${i + 1}: `
      if (!filled(g?.name)) problems.push(where + 'give it a name.')
      else if (tooLong(g.name, LIMITS.groupName)) problems.push(where + `keep the name under ${LIMITS.groupName} characters.`)
      const items = asList(g?.items)
      if (items.length < 1 || items.length > LIMITS.maxSortPerGroup) problems.push(where + `use 1 to ${LIMITS.maxSortPerGroup} items.`)
      if (items.some((x) => !filled(x))) problems.push(where + 'fill in every item, or remove the empty one.')
      if (items.some((x) => tooLong(x, LIMITS.sortItem))) problems.push(where + `keep each item under ${LIMITS.sortItem} characters.`)
    })
    const names = groups.map((g) => String(g?.name ?? '').trim().toLowerCase()).filter(Boolean)
    if (new Set(names).size !== names.length) problems.push('Two groups have the same name.')
    const all = groups.flatMap((g) => asList(g?.items)).map((x) => String(x ?? '').trim().toLowerCase()).filter(Boolean)
    if (all.length > LIMITS.maxSortItems) problems.push(`Use at most ${LIMITS.maxSortItems} items in all.`)
    if (new Set(all).size !== all.length) problems.push('An item appears twice, so it could belong to two groups.')
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
  if (q.type === 'match') return { tiles: shuffle([...c.tiles]), words: shuffle([...c.tiles]) }
  if (q.type === 'numberline') {
    const { ask, min, max, start, step } = c
    return ask === 'count' ? { ask, min, max, start, step, target: c.target } : { ask, min, max, start, step, jumps: c.jumps }
  }
  if (q.type === 'placevalue') return { ask: c.ask, places: c.places, target: c.target }
  if (q.type === 'truefalse') return {}
  if (q.type === 'unscramble') {
    const letters = graphemes(c.word)
    let mixed = shuffle([...letters])
    for (let tries = 0; tries < 8 && mixed.join('') === letters.join('') && new Set(letters).size > 1; tries++) mixed = shuffle([...letters])
    return { letters: mixed }
  }
  if (q.type === 'pairs') {
    return {
      lefts: c.pairs.map((p, id) => ({ id, text: p.a })),
      rights: shuffle(c.pairs.map((p, id) => ({ id, text: p.b }))),
    }
  }
  if (q.type === 'sort') {
    let id = 0
    return { groups: c.groups.map((g) => g.name), items: shuffle(c.groups.flatMap((g) => g.items.map((text) => ({ id: id++, text })))) }
  }
  return null
}

// Is there enough of an answer to press Check? `view` is what gameView gave.
export function gameReady(type, view, given) {
  if (type === 'count') return Number(normalise(given ?? '')) >= 1
  if (type === 'pattern') return Array.isArray(given) && given.length === view.gaps.length && given.every(Boolean)
  if (type === 'match') return Array.isArray(given) && given.length === view.tiles.length
  if (type === 'numberline') return given !== null && given !== undefined && given !== ''
  if (type === 'placevalue') return given !== null && given !== undefined && given !== ''
  if (type === 'truefalse') return given === 'true' || given === 'false'
  if (type === 'unscramble') return typeof given === 'string' && graphemes(given).length === view.letters.length
  if (type === 'pairs') return Array.isArray(given) && given.length === view.lefts.length
  if (type === 'sort') return Array.isArray(given) && given.length === view.items.length
  return false
}

// ---------- levels (lessons as steps on a world map) ----------
// Each lesson is a level. Its activity answers are recorded, and the level
// earns 1-3 stars from how they went: all first try is 3, mostly with a hint
// is 2, otherwise 1. A level with no question to answer is worth 3.
// There is no timer and nothing is ever taken away.

export function levelStars(outcomes) {
  if (outcomes.length === 0) return 3
  const credit = outcomes.reduce((sum, o) => sum + answerCredit(o), 0) / outcomes.length
  return credit >= 0.99 ? 3 : credit >= 0.5 ? 2 : 1
}

// The better of two outcomes ('first' beats 'hint' beats 'missed').
export function betterOutcome(a, b) {
  return answerCredit(b) > answerCredit(a) ? b : a
}

// ---------- the daily challenge ----------
// Three questions a day, picked from what the student can already play. The
// pick is worked out from the date and the student, so it is the same all day
// and different each day. It is practice for fun: it pays points like quiz
// answers, but is never counted in teacher reports.

export const DAILY_QUESTIONS = 3

function hashOf(text) {
  let h = 2166136261
  for (const ch of String(text)) h = Math.imul(h ^ ch.charCodeAt(0), 16777619) >>> 0
  return h
}

// `ids` are the ids of every question the student may be given. Returns the day's ids.
export function dailyPick(ids, studentId, dateIso, count = DAILY_QUESTIONS) {
  return [...ids]
    .map((id) => ({ id, rank: hashOf(`${dateIso}|${studentId}|${id}`) }))
    .sort((a, b) => a.rank - b.rank || String(a.id).localeCompare(String(b.id)))
    .slice(0, count)
    .map((x) => x.id)
}

// ---------- buddies, outfits and coins ----------
// A student earns coins as they earn points (1 coin per point). Coins buy
// outfits in the shop; points never go down, and the leaderboard uses points only.
// A few special items are free rewards at point milestones.
// Everything here is worked out: the balance is points minus what was spent.

export const SHOP = {
  buddy: [
    { id: 'fox', price: 0 },
    { id: 'panda', milestone: 100 },
    { id: 'monkey', price: 120 },
    { id: 'bear', price: 120 },
    { id: 'owl', price: 150 },
    { id: 'lion', milestone: 400 },
  ],
  hat: [
    { id: 'party', price: 30 },
    { id: 'cap', price: 40 },
    { id: 'chef', price: 60 },
    { id: 'wizard', price: 90 },
    { id: 'crown', milestone: 200 },
  ],
  face: [
    { id: 'round', price: 40 },
    { id: 'shades', price: 60 },
    { id: 'stars', milestone: 50 },
  ],
  neck: [
    { id: 'bow', price: 30 },
    { id: 'scarf', price: 40 },
    { id: 'cape', price: 100 },
  ],
  background: [
    { id: 'sky', price: 0 },
    { id: 'sunset', price: 50 },
    { id: 'forest', price: 50 },
    { id: 'space', price: 100 },
    { id: 'rainbow', price: 120 },
  ],
}

export const SLOTS = Object.keys(SHOP)
export const DEFAULT_MASCOT = { buddy: 'fox', hat: null, face: null, neck: null, background: 'sky' }

// Every item as { key: 'hat:cap', slot, id, price?, milestone? }.
export const CATALOG = SLOTS.flatMap((slot) => SHOP[slot].map((item) => ({ ...item, slot, key: `${slot}:${item.id}` })))
const byKey = (key) => CATALOG.find((item) => item.key === key)

// The items a student has: free ones, milestones reached, and what they bought.
export function ownedItems(points, purchases) {
  const owned = new Set()
  for (const item of CATALOG) {
    if (item.milestone === undefined && item.price === 0) owned.add(item.key)
    if (item.milestone !== undefined && points >= item.milestone) owned.add(item.key)
  }
  for (const key of purchases) if (byKey(key)) owned.add(key)
  return owned
}

export const coinsSpent = (purchases) => purchases.reduce((sum, key) => sum + (byKey(key)?.price ?? 0), 0)
export const coinBalance = (points, purchases) => points - coinsSpent(purchases)

// Why a purchase is refused, as a short code, or null if it is fine.
export function buyProblem(points, purchases, key) {
  const item = byKey(key)
  if (!item) return 'unknown-item'
  if (item.milestone !== undefined) return 'milestone-item'
  if (item.price === 0) return 'free-item'
  if (purchases.includes(key)) return 'already-owned'
  if (coinBalance(points, purchases) < item.price) return 'not-enough-coins'
  return null
}

// A mascot setting is fine if it uses only items the student owns. Hat, face
// and neck may be empty (null); the buddy and background may not.
export function mascotProblem(mascot, owned) {
  const m = mascot ?? {}
  for (const slot of SLOTS) {
    const id = m[slot]
    if (id === null || id === undefined) {
      if (slot === 'buddy' || slot === 'background') return 'bad-outfit'
      continue
    }
    if (!owned.has(`${slot}:${id}`)) return 'not-owned'
  }
  return null
}
