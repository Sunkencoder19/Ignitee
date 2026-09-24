import students from '@/data/students.json'
import { peekProgress } from '@/services/progressService'
import { request } from '@/services/api'

// Class only, and only what the board needs: first name, avatar and the
// dated points. Surnames and quiz answers never leave this file.
// TODO(fattesing): with a backend, rank on the server and send only the rows.
export function getLeaderboard(classId) {
  const rows = students
    .filter((s) => s.classId === classId)
    .map((s) => {
      const p = peekProgress(s.id)
      return {
        id: s.id,
        firstName: s.name.split(' ')[0],
        avatar: s.avatar,
        progress: {
          points: p.points,
          completedLessons: p.completedLessons.map((l) => ({ completedAt: l.completedAt })),
          quizAttempts: p.quizAttempts.map((a) => ({ date: a.date, points: a.points })),
          streakLog: p.streakLog ?? [],
        },
      }
    })
  return request(rows)
}
