// Logging in, for teachers (email + password) and students (class code + name + PIN).
// Both get a JWT that the app sends with every request. requireTeacher and
// requireStudent check that token; every other route file uses them.

import bcrypt from 'bcryptjs'
import express from 'express'
import jwt from 'jsonwebtoken'
import mongoose from 'mongoose'
import { Class, Student } from './classes.js'

const { Schema, model } = mongoose

// ---------- model ----------

const teacherSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 60 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
)

export const Teacher = model('Teacher', teacherSchema, 'teachers')

// ---------- tokens ----------

const TOKEN_LIFETIME = '7d'

function makeToken(role, id) {
  return jwt.sign({ role, id: String(id) }, process.env.JWT_SECRET, { expiresIn: TOKEN_LIFETIME })
}

// Reads "Authorization: Bearer <token>". Returns { role, id } or null.
function readToken(req) {
  const [kind, token] = (req.get('Authorization') ?? '').split(' ')
  if (kind !== 'Bearer' || !token) return null
  try {
    return jwt.verify(token, process.env.JWT_SECRET)
  } catch {
    return null // expired, or not made with our secret
  }
}

// Route guards. They also load the account, so a deleted student or teacher
// is logged out straight away even if their token hasn't expired.
// (Written as function declarations so other files can import them safely.)
export async function requireTeacher(req, res, next) {
  const token = readToken(req)
  const teacher = token?.role === 'teacher' && mongoose.isValidObjectId(token.id) && (await Teacher.findById(token.id))
  if (!teacher) return res.status(401).json({ error: 'Please log in as a teacher.' })
  req.teacher = teacher
  next()
}

export async function requireStudent(req, res, next) {
  const token = readToken(req)
  const student = token?.role === 'student' && mongoose.isValidObjectId(token.id) && (await Student.findById(token.id))
  if (!student) return res.status(401).json({ error: 'Please log in.' })
  req.student = student
  next()
}

// What the app keeps about whoever is logged in.
function teacherSession(teacher) {
  return { role: 'teacher', id: teacher.id, name: teacher.name, firstName: teacher.name.split(' ')[0], email: teacher.email }
}

async function studentSession(student) {
  const cls = await Class.findById(student.class)
  return {
    role: 'student',
    id: student.id,
    name: student.name,
    firstName: student.name.split(' ')[0],
    classId: String(student.class),
    className: cls?.name ?? '',
  }
}

// ---------- wrong-PIN lockout ----------
// A 4-digit PIN is easy to guess by trying them all, so after 5 wrong PINs
// that student can't log in for 10 minutes. Kept in memory: a server restart clears it.

const MAX_WRONG_PINS = 5
const LOCK_MS = 10 * 60 * 1000
const wrongPins = new Map() // studentId -> { count, lockedUntil }

function isLocked(studentId) {
  const entry = wrongPins.get(studentId)
  return entry?.lockedUntil > Date.now()
}

function recordWrongPin(studentId) {
  const entry = wrongPins.get(studentId) ?? { count: 0, lockedUntil: 0 }
  entry.count += 1
  if (entry.count >= MAX_WRONG_PINS) {
    entry.count = 0
    entry.lockedUntil = Date.now() + LOCK_MS
  }
  wrongPins.set(studentId, entry)
}

// ---------- routes ----------

export const router = express.Router()

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// POST /api/auth/teacher/signup  { name, email, password }   anyone
router.post('/teacher/signup', async (req, res) => {
  const name = String(req.body.name ?? '').trim()
  const email = String(req.body.email ?? '').trim().toLowerCase()
  const password = String(req.body.password ?? '')

  if (!name || name.length > 60) return res.status(400).json({ error: 'Enter your name (up to 60 characters).' })
  if (!EMAIL.test(email)) return res.status(400).json({ error: 'Enter a valid email address.' })
  // bcrypt only looks at the first 72 bytes of a password.
  if (password.length < 8 || password.length > 72) {
    return res.status(400).json({ error: 'Your password needs 8 to 72 characters.' })
  }
  if (await Teacher.exists({ email })) {
    return res.status(409).json({ error: 'There is already an account with that email. Log in instead.' })
  }

  const teacher = await Teacher.create({ name, email, passwordHash: await bcrypt.hash(password, 10) })
  res.status(201).json({ token: makeToken('teacher', teacher.id), user: teacherSession(teacher) })
})

// A real hash of a random password. Comparing against it when the email is
// unknown makes "wrong email" take as long as "wrong password".
const DUMMY_HASH = bcrypt.hashSync(String(Math.random()), 10)

// POST /api/auth/teacher/login  { email, password }   anyone
router.post('/teacher/login', async (req, res) => {
  const email = String(req.body.email ?? '').trim().toLowerCase()
  const password = String(req.body.password ?? '')
  const teacher = await Teacher.findOne({ email })
  const ok = await bcrypt.compare(password, teacher?.passwordHash ?? DUMMY_HASH)
  if (!teacher || !ok) return res.status(401).json({ error: 'That email and password don’t match.' })
  res.json({ token: makeToken('teacher', teacher.id), user: teacherSession(teacher) })
})

// GET /api/auth/class/:code   anyone
// The class name and its students' names, so a child can pick their name from a list.
router.get('/class/:code', async (req, res) => {
  const cls = await Class.findOne({ code: String(req.params.code).trim().toUpperCase() })
  if (!cls) return res.status(404).json({ error: 'We couldn’t find a class with that code. Check it with your teacher.' })
  const students = await Student.find({ class: cls.id }, 'name').sort({ name: 1 }).collation({ locale: 'en' })
  res.json({ className: cls.name, students: students.map((s) => ({ id: s.id, name: s.name })) })
})

// POST /api/auth/student/login  { classCode, studentId, pin }   anyone
router.post('/student/login', async (req, res) => {
  const classCode = String(req.body.classCode ?? '').trim().toUpperCase()
  const studentId = String(req.body.studentId ?? '')
  const pin = String(req.body.pin ?? '')
  const wrong = () => res.status(401).json({ error: 'That PIN doesn’t match. Try again.' })

  const cls = await Class.findOne({ code: classCode })
  if (!cls || !mongoose.isValidObjectId(studentId)) return wrong()
  const student = await Student.findOne({ _id: studentId, class: cls.id })
  if (!student) return wrong()

  if (isLocked(student.id)) {
    return res.status(429).json({ error: 'Too many wrong PINs. Ask your teacher, or try again in 10 minutes.' })
  }
  if (!/^\d{4}$/.test(pin) || !(await bcrypt.compare(pin, student.pinHash))) {
    recordWrongPin(student.id)
    return wrong()
  }

  wrongPins.delete(student.id)
  res.json({ token: makeToken('student', student.id), user: await studentSession(student) })
})

// GET /api/auth/me   anyone logged in
// The app calls this when it opens, to check the saved token still works.
router.get('/me', async (req, res) => {
  const token = readToken(req)
  if (token?.role === 'teacher') return requireTeacher(req, res, () => res.json({ user: teacherSession(req.teacher) }))
  if (token?.role === 'student') {
    return requireStudent(req, res, async () => res.json({ user: await studentSession(req.student) }))
  }
  res.status(401).json({ error: 'Please log in.' })
})
