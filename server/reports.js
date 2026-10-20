// Teacher reports: how a class, and each student in it, is doing.
// Only the teacher who owns the class or student can see its report.
//
// Two kinds of numbers:
//   - Needs attention (as before): best quiz score below 50%, or no learning for 3+ days.
//   - Accuracy, by chapter and by topic, from each student's LATEST finished
//     attempt on each quiz plus their lesson activity answers (best outcome on
//     each; first try 1, after the hint 0.5, missed 0). The daily challenge is not counted.
//     Below 60% with at least 3 answers counts as "struggling".
// All the maths is in shared/game.js; this file gathers the data.

import express from 'express'
import mongoose from 'mongoose'
import {
  INACTIVE_DAYS,
  MIN_ANSWERS,
  accuracyBy,
  accuracyOf,
  attemptsWithPoints,
  badges,
  bestScores,
  bestStars,
  chapterResults,
  currentStreak,
  latestAttempts,
  lessonsPerDay,
  studentSummary,
  today,
  weakestTopics,
  daysBetween,
} from '../shared/game.js'
import { requireTeacher } from './auth.js'
import { Class, Student } from './classes.js'
import { Chapter, Lesson, Quiz } from './content.js'
import { Attempt } from './progress.js'

// ---------- gathering the data ----------

// The chapters a report covers: those shown to the class, plus any the class
// has quiz attempts on (so results survive a chapter being unticked later).
// In the teacher's order, each with its lesson ids and quiz id.
async function chaptersFor(teacherId, classId, attempts) {
  const attempted = [...new Set(attempts.map((a) => String(a.chapter)))]
  const chapters = await Chapter.find({ teacher: teacherId, $or: [{ classes: classId }, { _id: { $in: attempted } }] }).sort({ order: 1 })
  const ids = chapters.map((c) => c._id)
  const lessons = await Lesson.find({ chapter: { $in: ids } }, 'chapter order').sort({ order: 1 })
  const quizzes = await Quiz.find({ chapter: { $in: ids } }, 'chapter')
  return chapters.map((c) => ({
    id: c.id,
    title: c.title,
    status: c.status,
    lessonIds: lessons.filter((l) => String(l.chapter) === c.id).map((l) => l.id),
    quizId: quizzes.find((q) => String(q.chapter) === c.id)?.id ?? null,
  }))
}

// One student's history, in the shape game.js expects, with each answer's
// topic and chapter kept for the accuracy numbers.
function historyFor(student, attempts) {
  return {
    lessons: student.lessonsFinished.map((l) => ({ lessonId: String(l.lesson), date: l.date, stars: l.stars ?? 3 })),
    // Daily challenge points count towards a student's points, but its answers are never in reports.
    dailies: student.dailies.filter((d) => d.finished).map((d) => ({ date: d.date, points: d.points })),
    // Lesson activity answers ("level answers") count towards accuracy, with the best outcome per question.
    levelAnswers: student.levels
      .filter((l) => l.best)
      .map((l) => ({ outcome: l.best, topic: l.topic || 'No topic', chapterId: String(l.chapter), prompt: l.prompt })),
    attempts: attempts
      .filter((a) => String(a.student) === student.id)
      .map((a) => ({
        id: a.id,
        quizId: String(a.quiz),
        chapterId: String(a.chapter),
        score: a.score,
        stars: a.stars,
        answerPoints: a.answerPoints,
        date: a.date,
        answers: a.answers.map((x) => ({ outcome: x.outcome, topic: x.topic || 'No topic', chapterId: String(a.chapter), prompt: x.prompt })),
      })),
  }
}

// Every answer from the student's latest finished attempt on each quiz, plus
// their lesson activity answers (best outcome on each).
function latestAnswers(history) {
  return [...latestAttempts(history.attempts).flatMap((a) => a.answers), ...history.levelAnswers]
}

const chapterKey = (answer) => answer.chapterId
const topicKey = (answer) => answer.topic

// The teacher's class, or null (then the route answers "not found").
async function ownedClass(req) {
  if (!mongoose.isValidObjectId(req.params.classId)) return null
  return Class.findOne({ _id: req.params.classId, teacher: req.teacher._id })
}

async function ownedStudent(req) {
  if (!mongoose.isValidObjectId(req.params.studentId)) return null
  return Student.findOne({ _id: req.params.studentId, teacher: req.teacher._id })
}

// ---------- routes (teachers only; requireTeacher on each) ----------

export const router = express.Router()

// GET /api/reports/classes/:classId
router.get('/reports/classes/:classId', requireTeacher, async (req, res) => {
  const cls = await ownedClass(req)
  if (!cls) return res.status(404).json({ error: 'Class not found.' })

  const students = await Student.find({ class: cls._id }).sort({ name: 1 }).collation({ locale: 'en' })
  const attempts = await Attempt.find({ class: cls._id, status: 'finished' }).sort({ finishedAt: 1 })
  const chapters = await chaptersFor(req.teacher._id, cls._id, attempts)
  const todayIso = today()

  const rows = students.map((student) => ({ student, history: historyFor(student, attempts) }))
  const progressRows = rows.map((r) => ({ student: r.student, progress: r.history })) // shape used by chapterResults etc.

  // ---- each student ----
  const studentRows = rows.map(({ student, history }) => {
    const summary = studentSummary({ id: student.id, name: student.name, classId: cls.id }, history, chapters, todayIso)
    const answers = latestAnswers(history)
    const topics = accuracyBy(answers, topicKey)
    const chapterAccuracy = accuracyBy(answers, chapterKey)
    return {
      id: student.id,
      name: student.name,
      points: summary.points,
      lessonsDone: summary.lessonsDone,
      averageScore: summary.averageScore, // average of best scores, null if no quizzes
      daysInactive: summary.daysInactive, // null if never active
      reasons: summary.reasons, // needs attention
      answers: answers.length,
      weakestTopics: weakestTopics(topics).map((t) => ({ topic: t.key, accuracy: t.accuracy, answers: t.answers, struggling: t.struggling })),
      strugglingTopics: topics.filter((t) => t.struggling).map((t) => t.key),
      // kept for the class numbers below, not sent:
      topicStats: topics,
      strugglingChapters: chapterAccuracy.filter((c) => c.struggling).map((c) => c.key),
    }
  })

  // ---- the class as a whole ----
  const allAnswers = rows.flatMap((r) => latestAnswers(r.history))
  const results = chapterResults(progressRows, chapters) // average best score and stars spread per chapter

  const chapterRows = chapters
    .filter((c) => c.quizId)
    .map((c) => {
      const result = results.find((r) => r.chapter.id === c.id)
      const accuracy = accuracyOf(allAnswers.filter((a) => a.chapterId === c.id))
      return {
        id: c.id,
        title: c.title,
        status: c.status,
        averageBestScore: result?.average ?? null,
        studentsTaken: result?.taken ?? 0,
        stars: result?.stars ?? [0, 0, 0, 0], // how many students' best attempt got 0, 1, 2, 3 stars
        accuracy: accuracy.accuracy, // null when nobody has answered yet
        answers: accuracy.answers,
        studentsStruggling: studentRows.filter((s) => s.strugglingChapters.includes(c.id)).map((s) => s.name),
      }
    })

  // Topics most students struggle with come first.
  const topicRows = accuracyBy(allAnswers, topicKey)
    .map((t) => ({
      topic: t.key,
      accuracy: t.accuracy,
      answers: t.answers,
      studentsStruggling: studentRows.filter((s) => s.strugglingTopics.includes(t.key)).map((s) => s.name),
      // students with enough answers on this topic (3+) to say whether they struggle
      studentsJudged: studentRows.filter((s) => s.topicStats.some((x) => x.key === t.key && x.answers >= MIN_ANSWERS)).length,
    }))
    .sort((a, b) => b.studentsStruggling.length - a.studentsStruggling.length || a.accuracy - b.accuracy)

  const allBest = rows.flatMap((r) => Object.values(bestScores(r.history)))
  const lessonsThisWeek = rows
    .flatMap((r) => r.history.lessons)
    .filter((l) => {
      const age = daysBetween(l.date, todayIso)
      return age >= 0 && age < 7
    }).length

  res.json({
    class: { id: cls.id, name: cls.name, code: cls.code },
    summary: {
      students: students.length,
      quizAttempts: attempts.length,
      averageScore: allBest.length ? Math.round(allBest.reduce((a, b) => a + b, 0) / allBest.length) : null,
      lessonsThisWeek,
      inactive: studentRows.filter((s) => s.daysInactive === null || s.daysInactive >= INACTIVE_DAYS).length,
    },
    needsAttention: studentRows.filter((s) => s.reasons.length > 0).map((s) => ({ id: s.id, name: s.name, reasons: s.reasons })),
    chapters: chapterRows,
    topics: topicRows,
    students: studentRows.map(({ strugglingChapters, topicStats, ...s }) => s),
    lessonsPerDay: lessonsPerDay(progressRows, todayIso, 14),
  })
})

// GET /api/reports/students/:studentId
router.get('/reports/students/:studentId', requireTeacher, async (req, res) => {
  const student = await ownedStudent(req)
  if (!student) return res.status(404).json({ error: 'Student not found.' })
  const cls = await Class.findById(student.class)

  const attempts = await Attempt.find({ student: student._id, status: 'finished' }).sort({ finishedAt: 1 })
  const chapters = await chaptersFor(req.teacher._id, student.class, attempts)
  const history = historyFor(student, attempts)
  const todayIso = today()
  const summary = studentSummary({ id: student.id, name: student.name, classId: cls?.id }, history, chapters, todayIso)

  const answers = latestAnswers(history)
  const topics = accuracyBy(answers, topicKey).map((t) => ({ topic: t.key, accuracy: t.accuracy, answers: t.answers, struggling: t.struggling }))
  const best = bestScores(history)
  const done = new Set(history.lessons.map((l) => l.lessonId))
  const titleOf = new Map(chapters.map((c) => [c.id, c.title]))

  res.json({
    student: { id: student.id, name: student.name },
    class: cls ? { id: cls.id, name: cls.name } : null,
    points: summary.points,
    streak: currentStreak(history, todayIso),
    lessonsDone: summary.lessonsDone,
    averageScore: summary.averageScore,
    daysInactive: summary.daysInactive,
    reasons: summary.reasons,
    chapters: chapters.map((c) => {
      const accuracy = accuracyOf(answers.filter((a) => a.chapterId === c.id))
      return {
        id: c.id,
        title: c.title,
        lessonsDone: c.lessonIds.filter((id) => done.has(id)).length,
        lessonsTotal: c.lessonIds.length,
        bestScore: c.quizId && best[c.quizId] !== undefined ? best[c.quizId] : null,
        stars: c.quizId ? bestStars(history, c.quizId) : 0,
        accuracy: accuracy.accuracy,
        answers: accuracy.answers,
        struggling: accuracy.struggling,
      }
    }),
    topics,
    weakestTopics: weakestTopics(topics),
    badges: badges(history, chapters).filter((b) => b.earned).map((b) => b.name),
    recentAttempts: attemptsWithPoints(history)
      .reverse()
      .slice(0, 8)
      .map((a) => ({ id: a.id, chapterTitle: titleOf.get(a.chapterId) ?? 'A removed chapter', score: a.score, stars: a.stars, points: a.points, date: a.date })),
  })
})
