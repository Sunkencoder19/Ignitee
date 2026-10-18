// Classes and the students in them. Only the teacher who owns a class can
// see or change it, or its students: every route below checks that.

import { randomInt } from 'node:crypto'
import bcrypt from 'bcryptjs'
import express from 'express'
import mongoose from 'mongoose'
import { clearLockout, requireTeacher } from './auth.js'

const { Schema, model } = mongoose

// ---------- models ----------

const classSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 40 },
    // Short code students type to log in, e.g. "K7PQ2M". Unique across the app.
    code: { type: String, required: true, unique: true, uppercase: true },
    teacher: { type: Schema.Types.ObjectId, ref: 'Teacher', required: true, index: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
)

export const Class = model('Class', classSchema, 'classes')

const studentSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 40 },
    class: { type: Schema.Types.ObjectId, ref: 'Class', required: true },
    teacher: { type: Schema.Types.ObjectId, ref: 'Teacher', required: true, index: true },
    pinHash: { type: String, required: true },
    // The history of lessons finished: one entry per lesson, the first time.
    lessonsFinished: [
      {
        _id: false,
        lesson: { type: Schema.Types.ObjectId, ref: 'Lesson', required: true },
        date: { type: String, required: true }, // 'YYYY-MM-DD', server's local date
      },
    ],
  },
  { timestamps: { createdAt: true, updatedAt: false } }
)

// No two students in one class with the same name ("Diya" and "diya" count as the same),
// because students pick their name from a list to log in.
studentSchema.index({ class: 1, name: 1 }, { unique: true, collation: { locale: 'en', strength: 2 } })

export const Student = model('Student', studentSchema, 'students')

// ---------- codes and PINs ----------

// No 0/O, 1/I/L: they are easy to mix up when a child copies the code.
const CODE_LETTERS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'

function makeCode() {
  return Array.from({ length: 6 }, () => CODE_LETTERS[randomInt(CODE_LETTERS.length)]).join('')
}

// A random 4-digit PIN, skipping ones that are too easy to guess (1111, 1234, 4321...).
function makePin() {
  while (true) {
    const pin = String(randomInt(10000)).padStart(4, '0')
    const digits = [...pin].map(Number)
    const steps = digits.slice(1).map((d, i) => d - digits[i])
    if (steps.every((step) => step === 0 || step === 1) && new Set(steps).size === 1) continue
    if (steps.every((step) => step === -1)) continue
    return pin
  }
}

// ---------- helpers ----------

function cleanName(value) {
  return String(value ?? '').trim().replace(/\s+/g, ' ')
}

// The class or student, but only if this teacher owns it. Otherwise null,
// and the route answers "not found" (so nobody learns that it exists).
async function ownedClass(req) {
  if (!mongoose.isValidObjectId(req.params.classId)) return null
  return Class.findOne({ _id: req.params.classId, teacher: req.teacher._id })
}

async function ownedStudent(req) {
  if (!mongoose.isValidObjectId(req.params.studentId)) return null
  return Student.findOne({ _id: req.params.studentId, teacher: req.teacher._id })
}

function isDuplicate(err) {
  return err?.code === 11000
}

function studentJson(student) {
  return { id: student.id, name: student.name, createdAt: student.createdAt }
}

// Removes students and everything that belongs to them.
// (attempts is the quiz history collection from phase 4; deleting from it is safe before it exists.)
async function deleteStudents(filter) {
  const students = await Student.find(filter, '_id')
  const ids = students.map((s) => s._id)
  await mongoose.connection.collection('attempts').deleteMany({ student: { $in: ids } })
  await Student.deleteMany({ _id: { $in: ids } })
  ids.forEach(clearLockout)
}

// ---------- routes (all for teachers) ----------

// requireTeacher is added to each route (not router.use) because this router
// is mounted at /api, and router.use would also catch other files' routes.
export const router = express.Router()

// GET /api/classes   the teacher's classes, oldest first, with how many students each has
router.get('/classes', requireTeacher, async (req, res) => {
  const classes = await Class.find({ teacher: req.teacher._id }).sort({ createdAt: 1 })
  const counts = await Student.aggregate([
    { $match: { teacher: req.teacher._id } },
    { $group: { _id: '$class', count: { $sum: 1 } } },
  ])
  const countOf = new Map(counts.map((c) => [String(c._id), c.count]))
  res.json(classes.map((c) => ({ id: c.id, name: c.name, code: c.code, studentCount: countOf.get(c.id) ?? 0 })))
})

// POST /api/classes  { name }   create a class; the server picks its code
router.post('/classes', requireTeacher, async (req, res) => {
  const name = cleanName(req.body.name)
  if (!name || name.length > 40) return res.status(400).json({ error: 'Give the class a name (up to 40 characters).' })
  const taken = await Class.exists({ teacher: req.teacher._id, name }).collation({ locale: 'en', strength: 2 })
  if (taken) return res.status(409).json({ error: `You already have a class called ${name}.` })

  // A clash between two random codes is very unlikely, but try again if it happens.
  for (let tries = 0; tries < 5; tries++) {
    try {
      const cls = await Class.create({ name, code: makeCode(), teacher: req.teacher._id })
      return res.status(201).json({ id: cls.id, name: cls.name, code: cls.code, studentCount: 0 })
    } catch (err) {
      if (!isDuplicate(err)) throw err
    }
  }
  res.status(500).json({ error: 'Could not make a class code. Please try again.' })
})

// GET /api/classes/:classId   the class and its students (never their PINs)
router.get('/classes/:classId', requireTeacher, async (req, res) => {
  const cls = await ownedClass(req)
  if (!cls) return res.status(404).json({ error: 'Class not found.' })
  const students = await Student.find({ class: cls._id }).sort({ name: 1 }).collation({ locale: 'en' })
  res.json({ id: cls.id, name: cls.name, code: cls.code, students: students.map(studentJson) })
})

// PATCH /api/classes/:classId  { name }   rename a class
router.patch('/classes/:classId', requireTeacher, async (req, res) => {
  const cls = await ownedClass(req)
  if (!cls) return res.status(404).json({ error: 'Class not found.' })
  const name = cleanName(req.body.name)
  if (!name || name.length > 40) return res.status(400).json({ error: 'Give the class a name (up to 40 characters).' })
  const taken = await Class.exists({ teacher: req.teacher._id, name, _id: { $ne: cls._id } }).collation({
    locale: 'en',
    strength: 2,
  })
  if (taken) return res.status(409).json({ error: `You already have a class called ${name}.` })
  cls.name = name
  await cls.save()
  res.json({ id: cls.id, name: cls.name, code: cls.code })
})

// DELETE /api/classes/:classId  { confirmName }   remove the class, its students and their quiz history.
// Because this can't be undone, the teacher must type the class name to confirm;
// the server checks it too, so the check can't be skipped by calling the API directly.
router.delete('/classes/:classId', requireTeacher, async (req, res) => {
  const cls = await ownedClass(req)
  if (!cls) return res.status(404).json({ error: 'Class not found.' })
  if (cleanName(req.body?.confirmName).toLowerCase() !== cls.name.toLowerCase()) {
    return res.status(400).json({ error: `Type the class name, ${cls.name}, to confirm.` })
  }
  await deleteStudents({ class: cls._id })
  // Chapters (phase 3) list the classes they are shown to; take this one off.
  await mongoose.connection.collection('chapters').updateMany({ classes: cls._id }, { $pull: { classes: cls._id } })
  // A published chapter must be shown to at least one class; if this was its last, it goes back to draft.
  await mongoose.connection
    .collection('chapters')
    .updateMany({ teacher: req.teacher._id, status: 'published', classes: { $size: 0 } }, { $set: { status: 'draft' } })
  await cls.deleteOne()
  res.json({ deleted: true })
})

// POST /api/classes/:classId/students  { name }   add a student; the PIN is in the reply ONCE
router.post('/classes/:classId/students', requireTeacher, async (req, res) => {
  const cls = await ownedClass(req)
  if (!cls) return res.status(404).json({ error: 'Class not found.' })
  const name = cleanName(req.body.name)
  if (!name || name.length > 40) return res.status(400).json({ error: 'Type the student’s name (up to 40 characters).' })

  const pin = makePin()
  try {
    const student = await Student.create({
      name,
      class: cls._id,
      teacher: req.teacher._id,
      pinHash: await bcrypt.hash(pin, 10),
    })
    res.status(201).json({ student: studentJson(student), pin })
  } catch (err) {
    if (isDuplicate(err)) return res.status(409).json({ error: `There is already a student called ${name} in this class.` })
    throw err
  }
})

// PATCH /api/students/:studentId  { name }   rename a student
router.patch('/students/:studentId', requireTeacher, async (req, res) => {
  const student = await ownedStudent(req)
  if (!student) return res.status(404).json({ error: 'Student not found.' })
  const name = cleanName(req.body.name)
  if (!name || name.length > 40) return res.status(400).json({ error: 'Type the student’s name (up to 40 characters).' })
  student.name = name
  try {
    await student.save()
  } catch (err) {
    if (isDuplicate(err)) return res.status(409).json({ error: `There is already a student called ${name} in this class.` })
    throw err
  }
  res.json(studentJson(student))
})

// DELETE /api/students/:studentId   remove a student and their quiz history
router.delete('/students/:studentId', requireTeacher, async (req, res) => {
  const student = await ownedStudent(req)
  if (!student) return res.status(404).json({ error: 'Student not found.' })
  await deleteStudents({ _id: student._id })
  res.json({ deleted: true })
})

// POST /api/students/:studentId/reset-pin   new PIN, in the reply ONCE.
// Also lifts a wrong-PIN lock straight away (see clearLockout in auth.js).
router.post('/students/:studentId/reset-pin', requireTeacher, async (req, res) => {
  const student = await ownedStudent(req)
  if (!student) return res.status(404).json({ error: 'Student not found.' })
  const pin = makePin()
  student.pinHash = await bcrypt.hash(pin, 10)
  await student.save()
  clearLockout(student.id)
  res.json({ student: studentJson(student), pin })
})
