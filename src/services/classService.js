import students from '@/data/students.json'
import chapters from '@/data/chapters.json'
import { peekProgress } from '@/services/progressService'
import { request } from '@/services/api'

const INACTIVE_DAYS = 3

function daysSince(dateString) {
  if (!dateString) return Infinity
  const ms = Date.now() - new Date(dateString).getTime()
  return ms / (1000 * 60 * 60 * 24)
}

function averageScore(quizAttempts) {
  if (quizAttempts.length === 0) return 0
  const total = quizAttempts.reduce((sum, a) => sum + a.score, 0)
  return Math.round(total / quizAttempts.length)
}

function withProgress(student) {
  const progress = peekProgress(student.id)
  return { ...student, progress }
}

export function getStudents() {
  const rows = students.map(withProgress).map(({ progress, ...student }) => ({
    ...student,
    points: progress.points,
    streak: progress.streak,
    lastActive: progress.lastActive,
    lessonsDone: progress.completedLessons.length,
    averageScore: averageScore(progress.quizAttempts),
  }))
  return request(rows)
}

export function getStudentDetail(studentId) {
  const student = students.find((s) => s.id === studentId)
  if (!student) return Promise.reject(new Error(`No student found for id "${studentId}"`))

  const progress = peekProgress(studentId)
  const doneLessonIds = new Set(progress.completedLessons.map((l) => l.lessonId))
  const chapterBreakdown = chapters
    .filter((ch) => !ch.locked)
    .map((ch) => {
      const lessonsDone = ch.lessonIds.filter((id) => doneLessonIds.has(id)).length
      const attempt = progress.quizAttempts.find((a) => a.quizId === ch.quizId)
      return {
        chapterId: ch.id,
        title: ch.title,
        lessonsDone,
        lessonsTotal: ch.lessonIds.length,
        bestScore: attempt?.score ?? null,
        stars: attempt?.stars ?? 0,
      }
    })

  return request({ ...student, progress, chapterBreakdown })
}

export function getClassSummary() {
  const rows = students.map(withProgress)
  const allAttempts = rows.flatMap((r) => r.progress.quizAttempts)
  const lessonsThisWeek = rows
    .flatMap((r) => r.progress.completedLessons)
    .filter((l) => daysSince(l.completedAt) <= 7).length
  const inactiveStudents = rows.filter((r) => daysSince(r.progress.lastActive) >= INACTIVE_DAYS)

  const summary = {
    studentCount: rows.length,
    averageScore: averageScore(allAttempts),
    lessonsThisWeek,
    inactiveCount: inactiveStudents.length,
  }
  return request(summary)
}
