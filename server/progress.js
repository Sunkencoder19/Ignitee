// Everything a student does: reading published lessons and quizzes, answering
// questions, finishing lessons, the daily challenge, the buddy shop, and the
// class leaderboard.
//
// The server is the judge:
//   - Students never receive answers, hints or explanations up front.
//   - Every quiz answer is checked here, one question at a time. The server
//     counts the tries and records the outcome ('first', 'hint' or 'missed').
//   - The score is worked out from those records when the quiz is finished.
//     Finishing takes no input at all, so a client can't send its own score.
//   - The hint comes back only after a first miss; the right answer and the
//     explanation only after a second miss, or once the quiz is finished.
//   - Lesson activities ("levels") and the daily challenge are judged the same
//     way: the server counts the tries. Buying in the shop is guarded so that
//     two quick taps can never spend the same coins twice.

import { randomInt } from 'node:crypto'
import express from 'express'
import mongoose from 'mongoose'
import {
  CATALOG,
  DEFAULT_MASCOT,
  answerPoints,
  attemptsWithPoints,
  badges,
  bestStreak,
  betterOutcome,
  buyProblem,
  chapterStates,
  checkAnswer,
  coinBalance,
  currentStreak,
  dailyPick,
  gameView,
  displayAnswer,
  inLanguage,
  isGame,
  LANGUAGES,
  lastActive,
  levelStars,
  localizeQuestion,
  mascotProblem,
  ownedItems,
  quizOpen,
  scoreQuiz,
  today,
  totalPoints,
} from '../shared/game.js'
import { requireStudent } from './auth.js'
import { Student } from './classes.js'
import { Chapter, Lesson, Quiz } from './content.js'

// A refusal the app can show in the student's language: `code` is looked up in
// client/src/i18n/*.json (errors.<code>); `error` is the English fallback.
function refuse(res, status, code, error) {
  return res.status(status).json({ error, code })
}

const { Schema, model } = mongoose

// ---------- model ----------

// One go at a chapter quiz. It starts 'in-progress' and becomes 'finished'.
const attemptSchema = new Schema(
  {
    student: { type: Schema.Types.ObjectId, ref: 'Student', required: true, index: true },
    class: { type: Schema.Types.ObjectId, ref: 'Class', required: true, index: true },
    teacher: { type: Schema.Types.ObjectId, ref: 'Teacher', required: true },
    quiz: { type: Schema.Types.ObjectId, ref: 'Quiz', required: true },
    chapter: { type: Schema.Types.ObjectId, ref: 'Chapter', required: true, index: true },
    status: { type: String, enum: ['in-progress', 'finished'], default: 'in-progress' },
    questionIds: [Schema.Types.ObjectId], // the questions, in the order they are asked
    language: { type: String, default: 'en' }, // the language it was played in; answers are checked in it
    // What happened on each question. prompt and topic are copied in, so
    // reports still make sense if the teacher later edits the quiz.
    answers: [
      {
        _id: false,
        question: { type: Schema.Types.ObjectId, required: true },
        prompt: String,
        topic: String,
        given: Schema.Types.Mixed, // the last answer the student gave
        tries: Number, // 1 or 2
        outcome: { type: String, enum: ['first', 'hint', 'missed'] }, // empty until settled
      },
    ],
    score: Number, // 0-100, set when finished
    stars: Number, // 0-3
    answerPoints: Number, // 10 per first-try answer, 5 per hinted answer
    date: String, // 'YYYY-MM-DD' it was finished
    finishedAt: Date,
  },
  { timestamps: { createdAt: 'startedAt', updatedAt: false } }
)
export const Attempt = model('Attempt', attemptSchema, 'attempts')

// ---------- what the student can see ----------

// The published chapters for this student's class, in order, each with its
// lesson ids (in order) and quiz id, in the shape the rules in game.js expect.
async function visibleChapters(student) {
  const lang = student.language ?? 'en'
  const chapters = await Chapter.find({ status: 'published', classes: student.class }).sort({ order: 1 })
  const ids = chapters.map((c) => c._id)
  const lessons = await Lesson.find({ chapter: { $in: ids } }, 'title hi.title mr.title chapter order').sort({ order: 1 })
  const quizzes = await Quiz.find({ chapter: { $in: ids } }, 'chapter questions._id')
  return chapters.map((c) => {
    const quiz = quizzes.find((q) => String(q.chapter) === c.id)
    const own = lessons.filter((l) => String(l.chapter) === c.id)
    return {
      id: c.id,
      subject: c.subject ?? 'maths',
      title: inLanguage(c, 'title', lang),
      lessonIds: own.map((l) => l.id),
      lessonTitles: own.map((l) => inLanguage(l, 'title', lang)),
      quizId: quiz ? quiz.id : null,
      questionCount: quiz ? quiz.questions.length : 0,
    }
  })
}

// A student's history in the shape game.js expects:
//   { lessons: [{ lessonId, date, stars }], attempts: [{ quizId, score, stars, answerPoints, answers, date }],
//     dailies: [{ date, points }], purchases: ['hat:cap'], mascot }
// `attempts` are the student's finished quiz attempts.
export function historyFrom(student, attempts) {
  return {
    lessons: student.lessonsFinished.map((l) => ({ lessonId: String(l.lesson), date: l.date, stars: l.stars ?? 3 })),
    dailies: student.dailies.filter((d) => d.finished).map((d) => ({ date: d.date, points: d.points })),
    purchases: [...student.purchases],
    mascot: {
      buddy: student.mascot?.buddy ?? DEFAULT_MASCOT.buddy,
      hat: student.mascot?.hat ?? null,
      face: student.mascot?.face ?? null,
      neck: student.mascot?.neck ?? null,
      background: student.mascot?.background ?? DEFAULT_MASCOT.background,
    },
    attempts: attempts.map((a) => ({
      id: a.id,
      quizId: String(a.quiz),
      chapterId: String(a.chapter),
      score: a.score,
      stars: a.stars,
      answerPoints: a.answerPoints,
      answers: a.answers.map((x) => ({ questionId: String(x.question), outcome: x.outcome })),
      date: a.date,
    })),
  }
}

async function historyOf(student) {
  return historyFrom(student, await Attempt.find({ student: student._id, status: 'finished' }).sort({ finishedAt: 1 }))
}

// Everything the app shows about a student's progress, worked out from the history.
function summary(history, chapters) {
  const points = totalPoints(history)
  return {
    lessons: history.lessons,
    attempts: attemptsWithPoints(history).map(({ answers, ...a }) => a), // with the points each one earned
    points,
    coins: coinBalance(points, history.purchases), // points earned minus coins spent in the shop
    mascot: history.mascot,
    streak: currentStreak(history, today()),
    bestStreak: bestStreak(history),
    lastActive: lastActive(history),
    badges: badges(history, chapters),
  }
}

// Which chapter a lesson or quiz belongs to, and whether this student may open it:
// published, shown to their class, and not still locked behind an earlier chapter.
async function openChapterFor(student, chapterId) {
  const chapters = await visibleChapters(student)
  const history = await historyOf(student)
  const entry = chapterStates(chapters, history).find((e) => e.chapter.id === String(chapterId))
  if (!entry) return { error: 404, code: 'not-found', message: 'We couldn’t find that. Ask your teacher.' }
  if (entry.state === 'locked') {
    return { error: 403, code: 'chapter-locked', message: 'This chapter isn’t open yet. Finish the one before it first.' }
  }
  return { chapter: entry.chapter, chapters, history }
}

// ---------- questions without their answers ----------

// Mixes up order items so the student has to put them back in order.
function shuffled(items) {
  for (let tries = 0; tries < 10; tries++) {
    const copy = [...items]
    for (let i = copy.length - 1; i > 0; i--) {
      const j = randomInt(i + 1)
      ;[copy[i], copy[j]] = [copy[j], copy[i]]
    }
    if (copy.join('\n') !== items.join('\n')) return copy
  }
  return items
}

// A stored question (a Mongoose sub-document) in the student's language, with
// its answer in that same language so their answer can be checked against it.
function local(question, lang) {
  return localizeQuestion(typeof question.toObject === 'function' ? question.toObject() : question, lang)
}

// Plain shuffle for a game's tiles (the right tiles and the wrong ones are mixed together).
function shuffleAll(items) {
  const copy = [...items]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = randomInt(i + 1)
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

// Only what is needed to show the question. No answer, hint, explanation or topic.
// `q` must already be in the student's language (see local()).
// A game sends its board as `view` (gameView in shared/game.js builds it without the answer).
function questionForStudent(q) {
  const out = { id: String(q._id), type: q.type, prompt: q.prompt }
  if (q.type === 'mcq') out.options = q.options
  if (q.type === 'order') out.options = shuffled(q.answer)
  if (isGame(q.type)) out.view = gameView(q, shuffleAll)
  return out
}

// Keeps a student's answer to a sensible size and shape.
function cleanGiven(question, given) {
  if (question.type === 'order') {
    return Array.isArray(given) ? given.slice(0, 20).map((x) => String(x).slice(0, 100)) : []
  }
  if (question.type === 'match' || question.type === 'pairs' || question.type === 'sort') {
    return Array.isArray(given) ? given.slice(0, 12).map((x) => String(x).slice(0, 80)) : []
  }
  if (question.type === 'pattern') {
    return Array.isArray(given) ? given.slice(0, 4).map((x) => (typeof x === 'string' ? x.slice(0, 40) : null)) : []
  }
  return String(given ?? '').slice(0, 100)
}

// What to tell the student after a try. tries is 1 or 2.
function judge(question, given, tries) {
  if (checkAnswer(question, given)) return { result: 'correct', outcome: tries === 1 ? 'first' : 'hint' }
  if (tries === 1) return { result: 'retry', hint: question.hint }
  return { result: 'revealed', outcome: 'missed', answer: displayAnswer(question), explanation: question.explanation }
}

// ---------- routes (all for students; requireStudent on each) ----------

export const router = express.Router()

// GET /api/student/chapters   the chapters this student can see, in order, with their state
router.get('/student/chapters', requireStudent, async (req, res) => {
  const chapters = await visibleChapters(req.student)
  const history = await historyOf(req.student)
  const starsOf = new Map(history.lessons.map((l) => [l.lessonId, l.stars]))
  const countInSubject = new Map() // worlds are numbered within their subject
  res.json(
    chapterStates(chapters, history).map(({ chapter, state, stars }) => {
      const number = (countInSubject.get(chapter.subject) ?? 0) + 1
      countInSubject.set(chapter.subject, number)
      const levelStarsEarned = chapter.lessonIds.reduce((sum, id) => sum + (starsOf.get(id) ?? 0), 0)
      return {
        id: chapter.id,
        number,
        subject: chapter.subject,
        title: chapter.title,
        state, // 'done' | 'open' | 'locked'
        stars, // the quiz's best so far, 0-3
        // The world's stars: every level's plus the quiz's, out of 3 for each.
        worldStars: levelStarsEarned + stars,
        worldMax: (chapter.lessonIds.length + (chapter.quizId ? 1 : 0)) * 3,
        lessons: chapter.lessonIds.map((id, j) => ({ id, title: chapter.lessonTitles[j], done: starsOf.has(id), stars: starsOf.get(id) ?? 0 })),
        quiz: chapter.quizId ? { id: chapter.quizId, questionCount: chapter.questionCount, open: quizOpen(chapter, history) } : null,
      }
    })
  )
})

// GET /api/student/progress   points, streak, badges and history
router.get('/student/progress', requireStudent, async (req, res) => {
  res.json(summary(await historyOf(req.student), await visibleChapters(req.student)))
})

// GET /api/student/lessons/:lessonId   the lesson's steps, with activity questions but no answers
router.get('/student/lessons/:lessonId', requireStudent, async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.lessonId)) return refuse(res, 404, 'not-found', 'Lesson not found.')
  const lesson = await Lesson.findById(req.params.lessonId)
  if (!lesson) return refuse(res, 404, 'not-found', 'Lesson not found.')
  const open = await openChapterFor(req.student, lesson.chapter)
  if (open.error) return refuse(res, open.error, open.code, open.message)
  const lang = req.student.language ?? 'en'
  res.json({
    id: lesson.id,
    title: inLanguage(lesson, 'title', lang),
    chapterId: String(lesson.chapter),
    steps: lesson.steps.map((s) => ({
      type: s.type,
      text: inLanguage(s, 'text', lang),
      ...(s.question ? { question: questionForStudent(local(s.question, lang)) } : {}),
    })),
  })
})

// POST /api/student/lessons/:lessonId/check  { questionId, given }
// Checks a lesson activity answer. The server counts the tries (the app sends
// none) and records the best outcome for the level's stars and the reports.
// Playing a lesson again starts a fresh round; only a better outcome replaces
// the old one, so replaying can raise a level's stars but never lower them.
router.post('/student/lessons/:lessonId/check', requireStudent, async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.lessonId)) return refuse(res, 404, 'not-found', 'Lesson not found.')
  const lesson = await Lesson.findById(req.params.lessonId)
  if (!lesson) return refuse(res, 404, 'not-found', 'Lesson not found.')
  const open = await openChapterFor(req.student, lesson.chapter)
  if (open.error) return refuse(res, open.error, open.code, open.message)
  const question = lesson.steps.find((s) => s.question && String(s.question._id) === String(req.body?.questionId))?.question
  if (!question) return refuse(res, 404, 'not-found', 'Question not found.')

  const shown = local(question, req.student.language ?? 'en') // checked in the language the student sees
  const given = cleanGiven(shown, req.body?.given)
  let entry = req.student.levels.find((l) => String(l.question) === String(question._id))
  if (!entry) {
    req.student.levels.push({ lesson: lesson._id, question: question._id, chapter: lesson.chapter, prompt: question.prompt, topic: question.topic ?? '' })
    entry = req.student.levels[req.student.levels.length - 1]
  }
  if (entry.settled) {
    entry.tries = 0 // a replay: a new round
    entry.settled = false
  }
  entry.tries += 1
  const { outcome, ...reply } = judge(shown, given, entry.tries)
  entry.given = given
  entry.prompt = question.prompt
  entry.topic = question.topic ?? ''
  if (outcome) {
    entry.settled = true
    entry.best = entry.best ? betterOutcome(entry.best, outcome) : outcome
  }
  try {
    await req.student.save()
  } catch {
    return refuse(res, 409, 'try-again', 'That took too long. Try again.')
  }
  res.json({ ...reply, settled: Boolean(outcome) })
})

// POST /api/student/lessons/:lessonId/finish   records the lesson as finished (only the first time counts)
router.post('/student/lessons/:lessonId/finish', requireStudent, async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.lessonId)) return refuse(res, 404, 'not-found', 'Lesson not found.')
  const lesson = await Lesson.findById(req.params.lessonId)
  if (!lesson) return refuse(res, 404, 'not-found', 'Lesson not found.')
  const open = await openChapterFor(req.student, lesson.chapter)
  if (open.error) return refuse(res, open.error, open.code, open.message)

  const before = summary(open.history, open.chapters)
  const firstTime = !req.student.lessonsFinished.some((l) => String(l.lesson) === lesson.id)
  // The level's stars come from the best outcome on each of its questions
  // (a question never answered counts as missed).
  const outcomes = lesson.steps
    .filter((s) => s.question)
    .map((s) => req.student.levels.find((l) => String(l.question) === String(s.question._id))?.best ?? 'missed')
  const stars = levelStars(outcomes)
  if (firstTime) {
    // $push with a filter, so two quick clicks can't record it twice.
    await Student.updateOne(
      { _id: req.student._id, 'lessonsFinished.lesson': { $ne: lesson._id } },
      { $push: { lessonsFinished: { lesson: lesson._id, date: today(), stars } } }
    )
  } else {
    await Student.updateOne({ _id: req.student._id, 'lessonsFinished.lesson': lesson._id }, { $max: { 'lessonsFinished.$.stars': stars } })
  }
  const student = await Student.findById(req.student._id)
  const after = summary(await historyOf(student), open.chapters)
  const best = after.lessons.find((l) => l.lessonId === lesson.id)?.stars ?? stars
  res.json({
    firstTime,
    stars: best, // the level's best stars so far
    pointsEarned: after.points - before.points,
    coinsEarned: after.points - before.points, // coins come 1 for 1 with points
    newBadges: after.badges.filter((b, i) => b.earned && !before.badges[i].earned).map((b) => b.id),
    progress: after,
  })
})

// POST /api/student/quizzes/:quizId/attempts   start a quiz; returns the questions WITHOUT answers
router.post('/student/quizzes/:quizId/attempts', requireStudent, async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.quizId)) return refuse(res, 404, 'not-found', 'Quiz not found.')
  const quiz = await Quiz.findById(req.params.quizId)
  if (!quiz) return refuse(res, 404, 'not-found', 'Quiz not found.')
  const open = await openChapterFor(req.student, quiz.chapter)
  if (open.error) return refuse(res, open.error, open.code, open.message)
  if (!quizOpen(open.chapter, open.history)) {
    return refuse(res, 403, 'lessons-first', 'Finish every lesson in this chapter first.')
  }

  // Starting again throws away any unfinished go at this quiz.
  await Attempt.deleteMany({ student: req.student._id, quiz: quiz._id, status: 'in-progress' })
  const attempt = await Attempt.create({
    student: req.student._id,
    class: req.student.class,
    teacher: req.student.teacher,
    quiz: quiz._id,
    chapter: quiz.chapter,
    questionIds: quiz.questions.map((q) => q._id),
    language: req.student.language ?? 'en',
  })
  res.status(201).json({
    attemptId: attempt.id,
    chapterTitle: open.chapter.title, // already in the student's language
    questions: quiz.questions.map((q) => questionForStudent(local(q, attempt.language))),
  })
})

// The student's own unfinished attempt and its quiz.
async function inProgress(req) {
  if (!mongoose.isValidObjectId(req.params.attemptId)) return {}
  const attempt = await Attempt.findOne({ _id: req.params.attemptId, student: req.student._id })
  if (!attempt) return {}
  return { attempt, quiz: await Quiz.findById(attempt.quiz) }
}

// POST /api/student/attempts/:attemptId/answers  { questionId, given }
// Checks ONE answer. Questions are answered in order, each at most twice.
router.post('/student/attempts/:attemptId/answers', requireStudent, async (req, res) => {
  const { attempt, quiz } = await inProgress(req)
  if (!attempt) return refuse(res, 404, 'not-found', 'Quiz attempt not found.')
  if (attempt.status !== 'in-progress') return refuse(res, 409, 'already-finished', 'This quiz is already finished.')

  // The next question still waiting for an answer. Students can't skip ahead.
  const settled = new Set(attempt.answers.filter((a) => a.outcome).map((a) => String(a.question)))
  const nextId = attempt.questionIds.map(String).find((id) => !settled.has(id))
  if (settled.has(String(req.body?.questionId))) return refuse(res, 409, 'already-answered', 'You already answered that question.')
  if (!nextId) return refuse(res, 409, 'all-answered', 'Every question is answered. Finish the quiz.')
  if (String(req.body?.questionId) !== nextId) return refuse(res, 409, 'answer-in-order', 'Answer the questions in order.')

  const stored = quiz?.questions.id(nextId)
  if (!stored) return refuse(res, 409, 'quiz-changed', 'This quiz was changed by your teacher. Start it again.')
  const question = local(stored, attempt.language) // checked in the language the quiz was started in

  const given = cleanGiven(question, req.body?.given)
  let entry = attempt.answers.find((a) => String(a.question) === nextId)
  if (!entry) {
    // The English prompt and topic are kept for the teacher's reports.
    attempt.answers.push({ question: stored._id, prompt: stored.prompt, topic: stored.topic, tries: 0 })
    entry = attempt.answers[attempt.answers.length - 1]
  }
  entry.tries += 1
  entry.given = given
  const { outcome, ...reply } = judge(question, given, entry.tries)
  if (outcome) entry.outcome = outcome
  await attempt.save()
  res.json({ ...reply, settled: Boolean(outcome) })
})

// The full review once a quiz is finished: each question with the right answer and explanation.
function review(attempt, quiz) {
  return attempt.answers.map((a) => {
    const stored = quiz?.questions.id(a.question)
    const q = stored ? local(stored, attempt.language) : null
    return {
      questionId: String(a.question),
      type: q ? q.type : null,
      prompt: q ? q.prompt : a.prompt,
      given: a.given,
      outcome: a.outcome,
      answer: q ? displayAnswer(q) : null,
      explanation: q ? q.explanation : null,
    }
  })
}

async function resultJson(attempt, quiz, history, lang) {
  const chapter = await Chapter.findById(attempt.chapter, 'title hi.title mr.title')
  const mine = attemptsWithPoints(history).filter((a) => a.quizId === String(attempt.quiz))
  const index = mine.findIndex((a) => a.id === attempt.id)
  return {
    attemptId: attempt.id,
    quizId: String(attempt.quiz),
    chapterId: String(attempt.chapter),
    chapterTitle: chapter ? inLanguage(chapter, 'title', lang) : '',
    score: attempt.score,
    stars: attempt.stars,
    quizPoints: mine[index]?.points ?? 0, // retakes only pay what beats the best earlier try
    isRetake: index > 0,
    bestBefore: index > 0 ? Math.max(...mine.slice(0, index).map((a) => a.score)) : null,
    firstTryCount: attempt.answers.filter((a) => a.outcome === 'first').length,
    questionCount: attempt.questionIds.length,
    review: review(attempt, quiz),
  }
}

// POST /api/student/attempts/:attemptId/finish   (no body: the server scores it from its own records)
router.post('/student/attempts/:attemptId/finish', requireStudent, async (req, res) => {
  if (req.body && Object.keys(req.body).length > 0) {
    return refuse(res, 400, 'no-score', 'The server works out the score itself. Send nothing when finishing a quiz.')
  }
  const { attempt, quiz } = await inProgress(req)
  if (!attempt) return refuse(res, 404, 'not-found', 'Quiz attempt not found.')
  if (attempt.status !== 'in-progress') return refuse(res, 409, 'already-finished', 'This quiz is already finished.')

  const outcomes = attempt.questionIds.map((id) => attempt.answers.find((a) => String(a.question) === String(id))?.outcome)
  if (outcomes.some((o) => !o)) return refuse(res, 400, 'answer-everything', 'Answer every question before finishing.')

  const chapters = await visibleChapters(req.student)
  const before = summary(await historyOf(req.student), chapters)
  const statesBefore = chapterStates(chapters, await historyOf(req.student))

  const { score, stars } = scoreQuiz(outcomes)
  attempt.set({ status: 'finished', score, stars, answerPoints: answerPoints(outcomes), date: today(), finishedAt: new Date() })
  await attempt.save()

  const history = await historyOf(req.student)
  const after = summary(history, chapters)
  const statesAfter = chapterStates(chapters, history)
  const opened = statesAfter.find((e, i) => e.state === 'open' && statesBefore[i].state === 'locked')

  res.json({
    ...(await resultJson(attempt, quiz, history, req.student.language ?? 'en')),
    pointsEarned: after.points - before.points, // quiz points plus the daily learning bonus
    newBadges: after.badges.filter((b, i) => b.earned && !before.badges[i].earned).map((b) => b.id),
    openedChapter: opened ? opened.chapter.title : null,
    progress: after,
  })
})

// GET /api/student/attempts/:attemptId   a finished attempt, for the result page
router.get('/student/attempts/:attemptId', requireStudent, async (req, res) => {
  const { attempt, quiz } = await inProgress(req)
  if (!attempt || attempt.status !== 'finished') return refuse(res, 404, 'not-found', 'Quiz result not found.')
  res.json(await resultJson(attempt, quiz, await historyOf(req.student), req.student.language ?? 'en'))
})

// PATCH /api/student/language  { language: 'en' | 'hi' | 'mr' }
// Saved on the student's account, so it follows them to any phone.
router.patch('/student/language', requireStudent, async (req, res) => {
  const language = req.body?.language
  if (!LANGUAGES.includes(language)) return refuse(res, 400, 'bad-language', 'Choose English, Hindi or Marathi.')
  await Student.updateOne({ _id: req.student._id }, { $set: { language } })
  res.json({ language })
})

// ---------- the daily challenge ----------
// Three questions a day from chapters the student has already opened. They are
// picked from the date and the student (same all day, new tomorrow), saved the
// first time the student looks, and answered like a quiz: in order, two tries
// each, judged here. It pays points like quiz answers but is practice for fun,
// so it never appears in teacher reports.

async function dailyPool(student) {
  const chapters = await visibleChapters(student)
  const history = await historyOf(student)
  const playable = chapterStates(chapters, history).filter((e) => e.state === 'open' || e.state === 'done')
  const quizzes = await Quiz.find({ chapter: { $in: playable.map((e) => e.chapter.id) } })
  return quizzes.flatMap((quiz) => quiz.questions)
}

// The day's questions that still exist (a teacher may have deleted one), in order.
async function dayQuestions(day) {
  const quizzes = await Quiz.find({ 'questions._id': { $in: day.questionIds } })
  const all = quizzes.flatMap((quiz) => quiz.questions)
  return day.questionIds.map((id) => all.find((q) => String(q._id) === String(id))).filter(Boolean)
}

const outcomeOnDay = (day, question) => day.answers.find((a) => String(a.question) === String(question._id))?.outcome ?? null

// GET /api/student/daily   today's challenge: the questions without answers, and what is done
router.get('/student/daily', requireStudent, async (req, res) => {
  const date = today()
  let student = req.student
  if (!student.dailies.some((d) => d.date === date)) {
    const pool = await dailyPool(student)
    if (pool.length === 0) return res.json({ available: false })
    const ids = dailyPick(pool.map((q) => String(q._id)), student.id, date)
    // The filter makes opening it twice at once save only one.
    await Student.updateOne(
      { _id: student._id, 'dailies.date': { $ne: date } },
      { $push: { dailies: { date, questionIds: ids, language: student.language ?? 'en', answers: [], points: 0, finished: false } } }
    )
    student = await Student.findById(student._id)
  }
  const day = student.dailies.find((d) => d.date === date)
  if (day.finished) return res.json({ available: true, date, done: true, points: day.points })
  const questions = await dayQuestions(day)
  res.json({
    available: true,
    date,
    done: false,
    questions: questions.map((q) => questionForStudent(local(q, day.language))),
    outcomes: questions.map((q) => outcomeOnDay(day, q)), // null until settled (the app only needs to know it is settled)
  })
})

// POST /api/student/daily/answers  { questionId, given }   checks ONE answer, in order
router.post('/student/daily/answers', requireStudent, async (req, res) => {
  const day = req.student.dailies.find((d) => d.date === today())
  if (!day) return refuse(res, 404, 'not-found', 'Open today’s challenge first.')
  if (day.finished) return refuse(res, 409, 'already-finished', 'You finished today’s challenge. Come back tomorrow!')
  const questions = await dayQuestions(day)
  const next = questions.find((q) => !outcomeOnDay(day, q))
  if (!next) return refuse(res, 409, 'already-finished', 'You finished today’s challenge. Come back tomorrow!')
  if (String(req.body?.questionId) !== String(next._id)) return refuse(res, 409, 'answer-in-order', 'Answer the questions in order.')

  let entry = day.answers.find((a) => String(a.question) === String(next._id))
  if (!entry) {
    day.answers.push({ question: next._id, tries: 0 })
    entry = day.answers[day.answers.length - 1]
  }
  entry.tries += 1
  const question = local(next, day.language)
  const { outcome, ...reply } = judge(question, cleanGiven(question, req.body?.given), entry.tries)
  if (outcome) entry.outcome = outcome

  const allDone = questions.every((q) => outcomeOnDay(day, q))
  if (allDone) {
    day.finished = true
    day.points = answerPoints(questions.map((q) => outcomeOnDay(day, q)))
  }
  try {
    await req.student.save()
  } catch {
    return refuse(res, 409, 'try-again', 'That took too long. Try again.')
  }
  res.json({ ...reply, settled: Boolean(outcome), ...(allDone ? { done: true, points: day.points } : {}) })
})

// ---------- the buddy shop ----------

// What the shop page needs: the balance, the buddy's outfit, and every item with who has it.
async function shopJson(student) {
  const history = await historyOf(student)
  const points = totalPoints(history)
  const owned = ownedItems(points, history.purchases)
  return {
    points,
    coins: coinBalance(points, history.purchases),
    mascot: history.mascot,
    items: CATALOG.map((item) => ({ key: item.key, slot: item.slot, id: item.id, price: item.price ?? null, milestone: item.milestone ?? null, owned: owned.has(item.key) })),
  }
}

// GET /api/student/shop
router.get('/student/shop', requireStudent, async (req, res) => {
  res.json(await shopJson(req.student))
})

// POST /api/student/shop/buy  { item: 'hat:cap' }
// Safe against double taps. The purchase is only written if the student's list of
// purchases is still exactly what was read a moment ago (and still lacks the item).
// If another request got in first, it is read again and the balance checked again,
// so the same coins can never be spent twice.
router.post('/student/shop/buy', requireStudent, async (req, res) => {
  const key = String(req.body?.item ?? '')
  for (let attempt = 0; attempt < 4; attempt++) {
    const student = await Student.findById(req.student._id)
    const history = await historyOf(student)
    const problem = buyProblem(totalPoints(history), history.purchases, key)
    if (problem) return refuse(res, problem === 'not-enough-coins' || problem === 'already-owned' ? 409 : 400, problem, 'You can’t buy that.')
    const done = await Student.updateOne(
      { _id: student._id, $and: [{ purchases: { $size: student.purchases.length } }, { purchases: { $ne: key } }] },
      { $push: { purchases: key } }
    )
    if (done.modifiedCount === 1) return res.status(201).json(await shopJson(await Student.findById(student._id)))
  }
  return refuse(res, 409, 'try-again', 'That took too long. Try again.')
})

// PATCH /api/student/mascot  { buddy, hat, face, neck, background }   what the buddy wears (owned items only)
router.patch('/student/mascot', requireStudent, async (req, res) => {
  const history = await historyOf(req.student)
  const owned = ownedItems(totalPoints(history), history.purchases)
  const mascot = {}
  for (const slot of ['buddy', 'hat', 'face', 'neck', 'background']) {
    const value = req.body?.[slot]
    mascot[slot] = value === null || value === undefined ? null : String(value)
  }
  const problem = mascotProblem(mascot, owned)
  if (problem) return refuse(res, 400, problem, 'You don’t have that item yet.')
  await Student.updateOne({ _id: req.student._id }, { $set: { mascot } })
  res.json(await shopJson(await Student.findById(req.student._id)))
})

// GET /api/student/leaderboard   classmates' first names and points (nothing else)
router.get('/student/leaderboard', requireStudent, async (req, res) => {
  const classmates = await Student.find({ class: req.student.class })
  const attempts = await Attempt.find({ class: req.student.class, status: 'finished' }).sort({ finishedAt: 1 })
  const rows = classmates.map((s) => {
    const history = historyFrom(s, attempts.filter((a) => String(a.student) === s.id))
    return { id: s.id, firstName: s.name.split(' ')[0], points: totalPoints(history), isMe: s.id === req.student.id }
  })
  rows.sort((a, b) => b.points - a.points || a.firstName.localeCompare(b.firstName))
  rows.forEach((row, i) => {
    row.rank = i > 0 && row.points === rows[i - 1].points ? rows[i - 1].rank : i + 1
  })
  res.json(rows)
})
