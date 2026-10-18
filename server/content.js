// What students learn: chapters, their lessons, and one quiz per chapter.
// A teacher builds these here (as drafts), ticks which of their classes see
// each chapter, and publishes it. Only the owner can see or change them.
// (The routes students use to read published content come in phase 4.)

import { readFileSync } from 'node:fs'
import express from 'express'
import mongoose from 'mongoose'
import { lessonProblems, quizProblems } from '../shared/game.js'
import { requireTeacher } from './auth.js'
import { Class, Student } from './classes.js'

const { Schema, model } = mongoose

// ---------- models ----------

const chapterSchema = new Schema(
  {
    title: { type: String, required: true, trim: true },
    teacher: { type: Schema.Types.ObjectId, ref: 'Teacher', required: true, index: true },
    classes: [{ type: Schema.Types.ObjectId, ref: 'Class' }], // which classes see it
    status: { type: String, enum: ['draft', 'published'], default: 'draft' },
    order: { type: Number, required: true }, // 0, 1, 2... the order students see
  },
  { timestamps: true }
)
export const Chapter = model('Chapter', chapterSchema, 'chapters')

// One question. `answer` is text for mcq and input, and a list (the right
// order) for order questions, so it is stored as a "Mixed" value.
const questionSchema = new Schema({
  type: { type: String, enum: ['mcq', 'input', 'order'], required: true },
  prompt: { type: String, required: true },
  options: [String], // mcq only
  answer: { type: Schema.Types.Mixed, required: true },
  hint: { type: String, required: true },
  explanation: { type: String, required: true },
  topic: { type: String, default: '' }, // needed on quiz questions; reports group by it
})

const lessonSchema = new Schema(
  {
    title: { type: String, required: true, trim: true },
    chapter: { type: Schema.Types.ObjectId, ref: 'Chapter', required: true, index: true },
    teacher: { type: Schema.Types.ObjectId, ref: 'Teacher', required: true, index: true },
    order: { type: Number, required: true },
    steps: [
      {
        _id: false,
        type: { type: String, enum: ['explain', 'example', 'activity'], required: true },
        text: { type: String, required: true },
        question: { type: questionSchema, default: undefined }, // activity steps only, optional
      },
    ],
  },
  { timestamps: true }
)
export const Lesson = model('Lesson', lessonSchema, 'lessons')

const quizSchema = new Schema(
  {
    chapter: { type: Schema.Types.ObjectId, ref: 'Chapter', required: true, unique: true },
    teacher: { type: Schema.Types.ObjectId, ref: 'Teacher', required: true, index: true },
    questions: [questionSchema],
  },
  { timestamps: true }
)
export const Quiz = model('Quiz', quizSchema, 'quizzes')

// ---------- cleaning and JSON ----------

const trim = (value) => String(value ?? '').trim()

// Keeps only the fields a question should have, trimmed. If the editor sent the
// id of a question that already exists (`keepIds`), the id is kept, so quiz
// history that points at that question still finds it.
function cleanQuestion(q, keepIds) {
  const out = { type: q?.type, prompt: trim(q?.prompt), hint: trim(q?.hint), explanation: trim(q?.explanation), topic: trim(q?.topic) }
  if (q?.type === 'mcq') {
    out.options = (Array.isArray(q.options) ? q.options : []).map(trim)
    out.answer = trim(q.answer)
  } else if (q?.type === 'order') {
    out.answer = (Array.isArray(q.answer) ? q.answer : []).map(trim)
  } else {
    out.answer = trim(q?.answer)
  }
  if (q?.id && keepIds.has(String(q.id))) out._id = q.id
  return out
}

function cleanLesson(body, keepIds = new Set()) {
  return {
    title: trim(body?.title),
    steps: (Array.isArray(body?.steps) ? body.steps : []).map((s) => {
      const step = { type: s?.type, text: trim(s?.text) }
      if (s?.question) step.question = cleanQuestion(s.question, keepIds)
      return step
    }),
  }
}

function questionJson(q) {
  const out = { id: String(q._id), type: q.type, prompt: q.prompt, answer: q.answer, hint: q.hint, explanation: q.explanation, topic: q.topic ?? '' }
  if (q.type === 'mcq') out.options = q.options
  return out
}

function lessonJson(l) {
  return {
    id: l.id,
    title: l.title,
    order: l.order,
    steps: l.steps.map((s) => ({ type: s.type, text: s.text, ...(s.question ? { question: questionJson(s.question) } : {}) })),
  }
}

function invalid(res, problems) {
  return res.status(400).json({ error: problems[0], problems })
}

// ---------- ownership and safety checks ----------

async function ownedChapter(teacher, id) {
  if (!mongoose.isValidObjectId(id)) return null
  return Chapter.findOne({ _id: id, teacher: teacher._id })
}

async function ownedLesson(teacher, id) {
  if (!mongoose.isValidObjectId(id)) return null
  return Lesson.findOne({ _id: id, teacher: teacher._id })
}

// What stops a chapter being published (or staying published).
async function publishProblems(chapter) {
  const problems = []
  if (chapter.classes.length === 0) problems.push('Tick at least one class to show this chapter to.')
  if ((await Lesson.countDocuments({ chapter: chapter._id })) === 0) problems.push('Add at least one lesson.')
  const quiz = await Quiz.findOne({ chapter: chapter._id })
  if (!quiz || quiz.questions.length === 0) problems.push('Add a quiz with at least one question.')
  return problems
}

// Has any student finished one of these lessons, or taken this chapter's quiz?
// Then deleting would wipe out children's progress, so we refuse.
async function hasProgress({ lessonIds = [], chapterId = null }) {
  if (lessonIds.length && (await Student.exists({ 'lessonsFinished.lesson': { $in: lessonIds } }))) return true
  if (chapterId && (await mongoose.connection.collection('attempts').countDocuments({ chapter: chapterId }, { limit: 1 }))) {
    return true
  }
  return false
}

const PROGRESS_KEPT = 'Students have already started this. Unpublish the chapter instead, so their progress is kept.'

// ---------- routes (all for teachers; requireTeacher on each, see classes.js) ----------

export const router = express.Router()

// GET /api/chapters   the teacher's chapters in order, with a short summary of each
router.get('/chapters', requireTeacher, async (req, res) => {
  const chapters = await Chapter.find({ teacher: req.teacher._id }).sort({ order: 1 }).populate('classes', 'name')
  const ids = chapters.map((c) => c._id)
  const lessonCounts = await Lesson.aggregate([{ $match: { chapter: { $in: ids } } }, { $group: { _id: '$chapter', n: { $sum: 1 } } }])
  const quizzes = await Quiz.find({ chapter: { $in: ids } }, 'chapter questions._id')
  const lessonsOf = new Map(lessonCounts.map((x) => [String(x._id), x.n]))
  const questionsOf = new Map(quizzes.map((q) => [String(q.chapter), q.questions.length]))
  res.json(
    chapters.map((c) => ({
      id: c.id,
      title: c.title,
      status: c.status,
      classes: c.classes.map((cls) => ({ id: cls.id, name: cls.name })),
      lessonCount: lessonsOf.get(c.id) ?? 0,
      questionCount: questionsOf.get(c.id) ?? 0,
    }))
  )
})

// POST /api/chapters  { title }   new draft chapter, added at the end
router.post('/chapters', requireTeacher, async (req, res) => {
  const title = trim(req.body?.title)
  if (!title || title.length > 80) return res.status(400).json({ error: 'Give the chapter a title (up to 80 characters).' })
  const last = await Chapter.findOne({ teacher: req.teacher._id }).sort({ order: -1 })
  const chapter = await Chapter.create({ title, teacher: req.teacher._id, order: last ? last.order + 1 : 0 })
  res.status(201).json({ id: chapter.id, title: chapter.title, status: chapter.status })
})

// POST /api/chapters/starter   add the 4 starter chapters (Maths Mela 1-4) as drafts.
// Only offered while the teacher has no chapters, so they can't be added twice by accident.
const STARTER = JSON.parse(readFileSync(new URL('./starter-content.json', import.meta.url), 'utf8'))

router.post('/chapters/starter', requireTeacher, async (req, res) => {
  if (await Chapter.exists({ teacher: req.teacher._id })) {
    return res.status(409).json({ error: 'The starter chapters can only be added while you have no chapters.' })
  }
  for (const [order, item] of STARTER.entries()) {
    const chapter = await Chapter.create({ title: item.title, teacher: req.teacher._id, order })
    await Lesson.insertMany(
      item.lessons.map((l, i) => ({ ...cleanLesson(l), chapter: chapter._id, teacher: req.teacher._id, order: i }))
    )
    await Quiz.create({
      chapter: chapter._id,
      teacher: req.teacher._id,
      questions: item.quiz.questions.map((q) => cleanQuestion(q, new Set())),
    })
  }
  res.status(201).json({ added: STARTER.length })
})

// PUT /api/chapters/order  { chapterIds }   the teacher's chapters in their new order
router.put('/chapters/order', requireTeacher, async (req, res) => {
  const ids = Array.isArray(req.body?.chapterIds) ? req.body.chapterIds.map(String) : []
  const mine = (await Chapter.find({ teacher: req.teacher._id }, '_id')).map((c) => c.id)
  const sameSet = ids.length === mine.length && new Set(ids).size === ids.length && ids.every((id) => mine.includes(id))
  if (!sameSet) return res.status(400).json({ error: 'Send every one of your chapters, each once.' })
  await Chapter.bulkWrite(ids.map((id, order) => ({ updateOne: { filter: { _id: id }, update: { order } } })))
  res.json({ saved: true })
})

// GET /api/topics   every topic this teacher has used, for the topic suggestions
router.get('/topics', requireTeacher, async (req, res) => {
  const topics = await Quiz.distinct('questions.topic', { teacher: req.teacher._id })
  res.json(topics.filter(Boolean).sort((a, b) => a.localeCompare(b)))
})

// GET /api/chapters/:chapterId   the whole chapter: details, lessons (with answers) and quiz
router.get('/chapters/:chapterId', requireTeacher, async (req, res) => {
  const chapter = await ownedChapter(req.teacher, req.params.chapterId)
  if (!chapter) return res.status(404).json({ error: 'Chapter not found.' })
  const lessons = await Lesson.find({ chapter: chapter._id }).sort({ order: 1 })
  const quiz = await Quiz.findOne({ chapter: chapter._id })
  res.json({
    id: chapter.id,
    title: chapter.title,
    status: chapter.status,
    classIds: chapter.classes.map(String),
    lessons: lessons.map(lessonJson),
    quiz: quiz ? { id: quiz.id, questions: quiz.questions.map(questionJson) } : null,
  })
})

// PATCH /api/chapters/:chapterId  { title?, classIds?, status? }
// Publishing checks the chapter is complete; a published chapter must stay complete.
router.patch('/chapters/:chapterId', requireTeacher, async (req, res) => {
  const chapter = await ownedChapter(req.teacher, req.params.chapterId)
  if (!chapter) return res.status(404).json({ error: 'Chapter not found.' })
  const body = req.body ?? {}

  if (body.title !== undefined) {
    const title = trim(body.title)
    if (!title || title.length > 80) return res.status(400).json({ error: 'Give the chapter a title (up to 80 characters).' })
    chapter.title = title
  }
  if (body.classIds !== undefined) {
    const ids = [...new Set((Array.isArray(body.classIds) ? body.classIds : []).map(String))]
    const valid = ids.every((id) => mongoose.isValidObjectId(id))
    const owned = valid ? await Class.countDocuments({ _id: { $in: ids }, teacher: req.teacher._id }) : -1
    if (owned !== ids.length) return res.status(400).json({ error: 'You can only choose your own classes.' })
    chapter.classes = ids
  }
  if (body.status !== undefined) {
    if (!['draft', 'published'].includes(body.status)) return res.status(400).json({ error: 'Status must be draft or published.' })
    chapter.status = body.status
  }
  if (chapter.status === 'published') {
    const problems = await publishProblems(chapter)
    if (problems.length) return res.status(400).json({ error: `Can’t publish yet. ${problems[0]}`, problems })
  }
  await chapter.save()
  res.json({ id: chapter.id, title: chapter.title, status: chapter.status, classIds: chapter.classes.map(String) })
})

// DELETE /api/chapters/:chapterId   the chapter with its lessons and quiz (refused once students have started it)
router.delete('/chapters/:chapterId', requireTeacher, async (req, res) => {
  const chapter = await ownedChapter(req.teacher, req.params.chapterId)
  if (!chapter) return res.status(404).json({ error: 'Chapter not found.' })
  const lessonIds = (await Lesson.find({ chapter: chapter._id }, '_id')).map((l) => l._id)
  if (await hasProgress({ lessonIds, chapterId: chapter._id })) return res.status(409).json({ error: PROGRESS_KEPT })
  await Lesson.deleteMany({ chapter: chapter._id })
  await Quiz.deleteOne({ chapter: chapter._id })
  await chapter.deleteOne()
  res.json({ deleted: true })
})

// POST /api/chapters/:chapterId/lessons  { title, steps }   add a lesson at the end
router.post('/chapters/:chapterId/lessons', requireTeacher, async (req, res) => {
  const chapter = await ownedChapter(req.teacher, req.params.chapterId)
  if (!chapter) return res.status(404).json({ error: 'Chapter not found.' })
  const lesson = cleanLesson(req.body)
  const problems = lessonProblems(lesson)
  if (problems.length) return invalid(res, problems)
  const last = await Lesson.findOne({ chapter: chapter._id }).sort({ order: -1 })
  const saved = await Lesson.create({ ...lesson, chapter: chapter._id, teacher: req.teacher._id, order: last ? last.order + 1 : 0 })
  res.status(201).json(lessonJson(saved))
})

// PUT /api/chapters/:chapterId/lesson-order  { lessonIds }
router.put('/chapters/:chapterId/lesson-order', requireTeacher, async (req, res) => {
  const chapter = await ownedChapter(req.teacher, req.params.chapterId)
  if (!chapter) return res.status(404).json({ error: 'Chapter not found.' })
  const ids = Array.isArray(req.body?.lessonIds) ? req.body.lessonIds.map(String) : []
  const mine = (await Lesson.find({ chapter: chapter._id }, '_id')).map((l) => l.id)
  const sameSet = ids.length === mine.length && new Set(ids).size === ids.length && ids.every((id) => mine.includes(id))
  if (!sameSet) return res.status(400).json({ error: 'Send every lesson in this chapter, each once.' })
  await Lesson.bulkWrite(ids.map((id, order) => ({ updateOne: { filter: { _id: id }, update: { order } } })))
  res.json({ saved: true })
})

// PATCH /api/lessons/:lessonId  { title, steps }   replace a lesson's title and steps
router.patch('/lessons/:lessonId', requireTeacher, async (req, res) => {
  const lesson = await ownedLesson(req.teacher, req.params.lessonId)
  if (!lesson) return res.status(404).json({ error: 'Lesson not found.' })
  const keepIds = new Set(lesson.steps.filter((s) => s.question).map((s) => String(s.question._id)))
  const next = cleanLesson(req.body, keepIds)
  const problems = lessonProblems(next)
  if (problems.length) return invalid(res, problems)
  lesson.title = next.title
  lesson.steps = next.steps
  await lesson.save()
  res.json(lessonJson(lesson))
})

// DELETE /api/lessons/:lessonId
router.delete('/lessons/:lessonId', requireTeacher, async (req, res) => {
  const lesson = await ownedLesson(req.teacher, req.params.lessonId)
  if (!lesson) return res.status(404).json({ error: 'Lesson not found.' })
  if (await hasProgress({ lessonIds: [lesson._id] })) return res.status(409).json({ error: PROGRESS_KEPT })
  const chapter = await Chapter.findById(lesson.chapter)
  const others = await Lesson.countDocuments({ chapter: lesson.chapter, _id: { $ne: lesson._id } })
  if (chapter.status === 'published' && others === 0) {
    return res.status(409).json({ error: 'A published chapter needs at least one lesson. Unpublish it first.' })
  }
  await lesson.deleteOne()
  res.json({ deleted: true })
})

// PUT /api/chapters/:chapterId/quiz  { questions }   save the whole quiz (creates it the first time)
router.put('/chapters/:chapterId/quiz', requireTeacher, async (req, res) => {
  const chapter = await ownedChapter(req.teacher, req.params.chapterId)
  if (!chapter) return res.status(404).json({ error: 'Chapter not found.' })
  const quiz = (await Quiz.findOne({ chapter: chapter._id })) ?? new Quiz({ chapter: chapter._id, teacher: req.teacher._id })
  const keepIds = new Set(quiz.questions.map((q) => String(q._id)))
  const questions = (Array.isArray(req.body?.questions) ? req.body.questions : []).map((q) => cleanQuestion(q, keepIds))
  const problems = quizProblems(questions)
  if (problems.length) return invalid(res, problems)
  quiz.questions = questions
  await quiz.save()
  res.json({ id: quiz.id, questions: quiz.questions.map(questionJson) })
})

// DELETE /api/chapters/:chapterId/quiz
router.delete('/chapters/:chapterId/quiz', requireTeacher, async (req, res) => {
  const chapter = await ownedChapter(req.teacher, req.params.chapterId)
  if (!chapter) return res.status(404).json({ error: 'Chapter not found.' })
  if (await hasProgress({ chapterId: chapter._id })) return res.status(409).json({ error: PROGRESS_KEPT })
  if (chapter.status === 'published') {
    return res.status(409).json({ error: 'A published chapter needs its quiz. Unpublish it first.' })
  }
  await Quiz.deleteOne({ chapter: chapter._id })
  res.json({ deleted: true })
})
