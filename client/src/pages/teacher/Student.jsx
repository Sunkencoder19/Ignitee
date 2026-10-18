// One student in detail: numbers, why they need attention, each chapter,
// and their recent quiz attempts.

import { Link, useParams } from 'react-router-dom'
import { getChapters, getClass, useData } from '../../api'
import { attemptsWithPoints, bestStars, bestScores, daysAgoLabel, lessonDone, shortDate, studentSummary, today } from '../../game'

export default function Student() {
  const { studentId } = useParams()
  const { data, error } = useData(() => Promise.all([getClass('all'), getChapters()]), [])

  if (error) return <p className="text-warn">{error}</p>
  if (!data) return <p className="text-muted">Loading...</p>

  const [rows, chapters] = data
  const row = rows.find((r) => r.student.id === studentId)
  if (!row) {
    return (
      <div>
        <p className="text-lg font-semibold">We could not find that student.</p>
        <Link to="/teacher/students" className="btn btn-secondary mt-4">
          All students
        </Link>
      </div>
    )
  }

  const { student, progress } = row
  const s = studentSummary(student, progress, chapters, today())
  const best = bestScores(progress)
  const openChapters = chapters.filter((c) => !c.locked)
  const recent = attemptsWithPoints(progress).reverse().slice(0, 5)

  const stats = [
    { label: 'Points', value: s.points },
    { label: 'Day streak', value: s.streak },
    { label: 'Lessons done', value: s.lessonsDone },
    { label: 'Average score', value: s.averageScore === null ? 'None yet' : `${s.averageScore}%` },
    { label: 'Last active', value: daysAgoLabel(s.daysInactive) },
  ]

  return (
    <div className="space-y-8">
      <div>
        <Link to="/teacher/students" className="text-sm font-semibold text-muted hover:text-ink">
          All students
        </Link>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight">{student.name}</h1>
        <p className="text-muted">Class {student.classId}</p>
      </div>

      {s.reasons.length > 0 && (
        <p className="rounded-xl bg-warn-soft p-4 font-semibold text-warn">Needs attention: {s.reasons.join('. ')}.</p>
      )}

      <dl className="grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-5">
        {stats.map((stat) => (
          <div key={stat.label}>
            <dt className="text-sm text-muted">{stat.label}</dt>
            <dd className="text-2xl font-semibold">{stat.value}</dd>
          </div>
        ))}
      </dl>

      <section>
        <h2 className="text-lg font-semibold">Chapters</h2>
        <div className="mt-3 overflow-x-auto rounded-2xl bg-surface shadow-card ring-1 ring-line">
          <table className="w-full min-w-[32rem] text-left">
            <thead className="border-b border-line text-sm text-muted">
              <tr>
                <th className="px-4 py-3 font-semibold">Chapter</th>
                <th className="px-4 py-3 text-right font-semibold">Lessons</th>
                <th className="px-4 py-3 text-right font-semibold">Best score</th>
                <th className="px-4 py-3 text-right font-semibold">Stars</th>
              </tr>
            </thead>
            <tbody className="tabular-nums">
              {openChapters.map((c) => (
                <tr key={c.id} className="not-last:border-b not-last:border-line">
                  <td className="px-4 py-3 font-semibold">
                    {c.number}. {c.title}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {c.lessonIds.filter((id) => lessonDone(progress, id)).length} of {c.lessonIds.length}
                  </td>
                  <td className="px-4 py-3 text-right">{best[c.quizId] === undefined ? 'Not taken' : `${best[c.quizId]}%`}</td>
                  <td className="px-4 py-3 text-right">{best[c.quizId] === undefined ? '' : bestStars(progress, c.quizId)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold">Recent quiz attempts</h2>
        {recent.length === 0 ? (
          <p className="mt-2 text-muted">No quiz attempts yet.</p>
        ) : (
          <ul className="mt-3 overflow-hidden rounded-2xl bg-surface shadow-card ring-1 ring-line">
            {recent.map((a, i) => (
              <li key={i} className="flex flex-wrap gap-x-6 gap-y-1 px-4 py-3 not-last:border-b not-last:border-line">
                <span className="flex-1 font-semibold">{chapters.find((c) => c.quizId === a.quizId)?.title}</span>
                <span className="text-muted">{shortDate(a.date)}</span>
                <span className="tabular-nums">{a.score}%</span>
                <span className="tabular-nums">{a.stars} stars</span>
                <span className="tabular-nums text-muted">+{a.points} points</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
