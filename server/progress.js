// Everything a student does: reading published lessons and quizzes, answering
// questions, finishing lessons, and the class leaderboard.
//
// The server is the judge:
//   - Students never receive answers, hints or explanations up front.
//   - Every quiz answer is checked here, one question at a time. The server
//     counts the tries and records the outcome ('first', 'hint' or 'missed').
//   - The score is worked out from those records when the quiz is finished.
//     Finishing takes no input at all, so a client can't send its own score.
//   - The hint comes back only after a first miss; the right answer and the
//     explanation only after a second miss, or once the quiz is finished.

import { randomInt } from 'node:crypto'
import express from 'express'
import mongoose from 'mongoose'
import {
  answerPoints,
  attemptsWithPoints,
  badges,
  bestStreak,
  chapterStates,
  checkAnswer,
  currentStreak,
  lastActive,
  quizOpen,
  scoreQuiz,
  today,
  totalPoints,
} from '../shared/game.js'
import { requireStudent } from './auth.js'
import { Student } from './classes.js'
import { Chapter, Lesson, Quiz } from './content.js'

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
  const chapters = await Chapter.find({ status: 'published', classes: student.class }).sort({ order: 1 })
  const ids = chapters.map((c) => c._id)
  const lessons = await Lesson.find({ chapter: { $in: ids } }, 'title chapter order').sort({ order: 1 })
  const quizzes = await Quiz.find({ chapter: { $in: ids } }, 'chapter questions._id')
  return chapters.map((c) => {
    const quiz = quizzes.find((q) => String(q.chapter) === c.id)
    const own = lessons.filter((l) => String(l.chapter) === c.id)
    return {
      id: c.id,
      title: c.title,
      lessonIds: own.map((l) => l.id),
      lessonTitles: own.map((l) => l.title),
      quizId: quiz ? quiz.id : null,
      questionCount: quiz ? quiz.questions.length : 0,
    }
  })
}

// The student's history in the shape game.js expects:
//   { lessons: [{ lessonId, date }], attempts: [{ quizId, score, stars, answerPoints, answers, date }] }
async function historyOf(student) {
  const attempts = await Attempt.find({ student: student._id, status: 'finished' }).sort({ finishedAt: 1 })
  return {
    lessons: student.lessonsFinished.map((l) => ({ lessonId: String(l.lesson), date: l.date })),
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

// Everything the app shows about a student's progress, worked out from the history.
function summary(history, chapters) {
  return {
    lessons: history.lessons,
    attempts: attemptsWithPoints(history).map(({ answers, ...a }) => a), // with the points each one earned
    points: totalPoints(history),
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
  if (!entry) return { error: 404, message: 'We couldn’t find that. Ask your teacher.' }
  if (entry.state === 'locked') return { error: 403, message: 'This chapter isn’t open yet. Finish the one before it first.' }
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

// Only what is needed to show the question. No answer, hint, explanation or topic.
function questionForStudent(q) {
  const out = { id: String(q._id), type: q.type, prompt: q.prompt }
  if (q.type === 'mcq') out.options = q.options
  if (q.type === 'order') out.options = shuffled(q.answer)
  return out
}

// Keeps a student's answer to a sensible size and shape.
function cleanGiven(question, given) {
  if (question.type === 'order') {
    return Array.isArray(given) ? given.slice(0, 20).map((x) => String(x).slice(0, 100)) : []
  }
  return String(given ?? '').slice(0, 100)
}

// What to tell the student after a try. tries is 1 or 2.
function judge(question, given, tries) {
  if (checkAnswer(question, given)) return { result: 'correct', outcome: tries === 1 ? 'first' : 'hint' }
  if (tries === 1) return { result: 'retry', hint: question.hint }
  return { result: 'revealed', outcome: 'missed', answer: question.answer, explanation: question.explanation }
}

// ---------- routes (all for students; requireStudent on each) ----------

export const router = express.Router()

// GET /api/student/chapters   the chapters this student can see, in order, with their state
router.get('/student/chapters', requireStudent, async (req, res) => {
  const chapters = await visibleChapters(req.student)
  const history = await historyOf(req.student)
  const done = new Set(history.lessons.map((l) => l.lessonId))
  res.json(
    chapterStates(chapters, history).map(({ chapter, state, stars }, i) => ({
      id: chapter.id,
      number: i + 1,
      title: chapter.title,
      state, // 'done' | 'open' | 'locked'
      stars, // best so far, 0-3
      lessons: chapter.lessonIds.map((id, j) => ({ id, title: chapter.lessonTitles[j], done: done.has(id) })),
      quiz: chapter.quizId ? { id: chapter.quizId, questionCount: chapter.questionCount, open: quizOpen(chapter, history) } : null,
    }))
  )
})

// GET /api/student/progress   points, streak, badges and history
router.get('/student/progress', requireStudent, async (req, res) => {
  res.json(summary(await historyOf(req.student), await visibleChapters(req.student)))
})

// GET /api/student/lessons/:lessonId   the lesson's steps, with activity questions but no answers
router.get('/student/lessons/:lessonId', requireStudent, async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.lessonId)) return res.status(404).json({ error: 'Lesson not found.' })
  const lesson = await Lesson.findById(req.params.lessonId)
  if (!lesson) return res.status(404).json({ error: 'Lesson not found.' })
  const open = await openChapterFor(req.student, lesson.chapter)
  if (open.error) return res.status(open.error).json({ error: open.message })
  res.json({
    id: lesson.id,
    title: lesson.title,
    chapterId: String(lesson.chapter),
    steps: lesson.steps.map((s) => ({ type: s.type, text: s.text, ...(s.question ? { question: questionForStudent(s.question) } : {}) })),
  })
})

// POST /api/student/lessons/:lessonId/check  { questionId, given, tries }
// Checks a lesson activity answer. Activities are practice (no points, nothing
// recorded), so the app says which try this is.
router.post('/student/lessons/:lessonId/check', requireStudent, async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.lessonId)) return res.status(404).json({ error: 'Lesson not found.' })
  const lesson = await Lesson.findById(req.params.lessonId)
  if (!lesson) return res.status(404).json({ error: 'Lesson not found.' })
  const open = await openChapterFor(req.student, lesson.chapter)
  if (open.error) return res.status(open.error).json({ error: open.message })
  const question = lesson.steps.find((s) => s.question && String(s.question._id) === String(req.body?.questionId))?.question
  if (!question) return res.status(404).json({ error: 'Question not found.' })
  const tries = req.body?.tries === 2 ? 2 : 1
  const { outcome, ...reply } = judge(question, cleanGiven(question, req.body?.given), tries)
  res.json(reply)
})

// POST /api/student/lessons/:lessonId/finish   records the lesson as finished (only the first time counts)
router.post('/student/lessons/:lessonId/finish', requireStudent, async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.lessonId)) return res.status(404).json({ error: 'Lesson not found.' })
  const lesson = await Lesson.findById(req.params.lessonId)
  if (!lesson) return res.status(404).json({ error: 'Lesson not found.' })
  const open = await openChapterFor(req.student, lesson.chapter)
  if (open.error) return res.status(open.error).json({ error: open.message })

  const before = summary(open.history, open.chapters)
  const firstTime = !req.student.lessonsFinished.some((l) => String(l.lesson) === lesson.id)
  if (firstTime) {
    // $push with a filter, so two quick clicks can't record it twice.
    await Student.updateOne(
      { _id: req.student._id, 'lessonsFinished.lesson': { $ne: lesson._id } },
      { $push: { lessonsFinished: { lesson: lesson._id, date: today() } } }
    )
  }
  const student = await Student.findById(req.student._id)
  const after = summary(await historyOf(student), open.chapters)
  res.json({
    firstTime,
    pointsEarned: after.points - before.points,
    newBadges: after.badges.filter((b, i) => b.earned && !before.badges[i].earned).map((b) => b.name),
    progress: after,
  })
})

// POST /api/student/quizzes/:quizId/attempts   start a quiz; returns the questions WITHOUT answers
router.post('/student/quizzes/:quizId/attempts', requireStudent, async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.quizId)) return res.status(404).json({ error: 'Quiz not found.' })
  const quiz = await Quiz.findById(req.params.quizId)
  if (!quiz) return res.status(404).json({ error: 'Quiz not found.' })
  const open = await openChapterFor(req.student, quiz.chapter)
  if (open.error) return res.status(open.error).json({ error: open.message })
  if (!quizOpen(open.chapter, open.history)) {
    return res.status(403).json({ error: 'Finish every lesson in this chapter first.' })
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
  })
  res.status(201).json({
    attemptId: attempt.id,
    chapterTitle: open.chapter.title,
    questions: quiz.questions.map(questionForStudent),
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
  if (!attempt) return res.status(404).json({ error: 'Quiz attempt not found.' })
  if (attempt.status !== 'in-progress') return res.status(409).json({ error: 'This quiz is already finished.' })

  // The next question still waiting for an answer. Students can't skip ahead.
  const settled = new Set(attempt.answers.filter((a) => a.outcome).map((a) => String(a.question)))
  const nextId = attempt.questionIds.map(String).find((id) => !settled.has(id))
  if (settled.has(String(req.body?.questionId))) return res.status(409).json({ error: 'You already answered that question.' })
  if (!nextId) return res.status(409).json({ error: 'Every question is answered. Finish the quiz.' })
  if (String(req.body?.questionId) !== nextId) return res.status(409).json({ error: 'Answer the questions in order.' })

  const question = quiz?.questions.id(nextId)
  if (!question) return res.status(409).json({ error: 'This quiz was changed by your teacher. Start it again.' })

  const given = cleanGiven(question, req.body?.given)
  let entry = attempt.answers.find((a) => String(a.question) === nextId)
  if (!entry) {
    attempt.answers.push({ question: question._id, prompt: question.prompt, topic: question.topic, tries: 0 })
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
    const q = quiz?.questions.id(a.question)
    return {
      questionId: String(a.question),
      prompt: a.prompt,
      given: a.given,
      outcome: a.outcome,
      answer: q ? q.answer : null,
      explanation: q ? q.explanation : null,
    }
  })
}

async function resultJson(attempt, quiz, history) {
  const chapter = await Chapter.findById(attempt.chapter, 'title')
  const mine = attemptsWithPoints(history).filter((a) => a.quizId === String(attempt.quiz))
  const index = mine.findIndex((a) => a.id === attempt.id)
  return {
    attemptId: attempt.id,
    quizId: String(attempt.quiz),
    chapterId: String(attempt.chapter),
    chapterTitle: chapter?.title ?? '',
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
    return res.status(400).json({ error: 'The server works out the score itself. Send nothing when finishing a quiz.' })
  }
  const { attempt, quiz } = await inProgress(req)
  if (!attempt) return res.status(404).json({ error: 'Quiz attempt not found.' })
  if (attempt.status !== 'in-progress') return res.status(409).json({ error: 'This quiz is already finished.' })

  const outcomes = attempt.questionIds.map((id) => attempt.answers.find((a) => String(a.question) === String(id))?.outcome)
  if (outcomes.some((o) => !o)) return res.status(400).json({ error: 'Answer every question before finishing.' })

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
    ...(await resultJson(attempt, quiz, history)),
    pointsEarned: after.points - before.points, // quiz points plus the daily learning bonus
    newBadges: after.badges.filter((b, i) => b.earned && !before.badges[i].earned).map((b) => b.name),
    openedChapter: opened ? opened.chapter.title : null,
    progress: after,
  })
})

// GET /api/student/attempts/:attemptId   a finished attempt, for the result page
router.get('/student/attempts/:attemptId', requireStudent, async (req, res) => {
  const { attempt, quiz } = await inProgress(req)
  if (!attempt || attempt.status !== 'finished') return res.status(404).json({ error: 'Quiz result not found.' })
  res.json(await resultJson(attempt, quiz, await historyOf(req.student)))
})

// GET /api/student/leaderboard   classmates' first names and points (nothing else)
router.get('/student/leaderboard', requireStudent, async (req, res) => {
  const classmates = await Student.find({ class: req.student.class })
  const attempts = await Attempt.find({ class: req.student.class, status: 'finished' }).sort({ finishedAt: 1 })
  const rows = classmates.map((s) => {
    const history = {
      lessons: s.lessonsFinished.map((l) => ({ lessonId: String(l.lesson), date: l.date })),
      attempts: attempts
        .filter((a) => String(a.student) === s.id)
        .map((a) => ({ quizId: String(a.quiz), score: a.score, stars: a.stars, answerPoints: a.answerPoints, date: a.date })),
    }
    return { id: s.id, firstName: s.name.split(' ')[0], points: totalPoints(history), isMe: s.id === req.student.id }
  })
  rows.sort((a, b) => b.points - a.points || a.firstName.localeCompare(b.firstName))
  rows.forEach((row, i) => {
    row.rank = i > 0 && row.points === rows[i - 1].points ? rows[i - 1].rank : i + 1
  })
  res.json(rows)
})
