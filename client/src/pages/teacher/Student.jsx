// One student's report: why they need attention (if they do), their weakest
// topics, accuracy by topic and by chapter, badges and recent quizzes.
// Accuracy uses their latest try at each quiz, so it shows where they are now.

import { Link, useParams } from 'react-router-dom'
import { getStudentReport, useData } from '../../api'
import { daysAgoLabel, shortDate } from '../../game'

export default function Student() {
  const { studentId } = useParams()
  const { data: r, error } = useData(() => getStudentReport(studentId), [studentId])

  if (error) {
    return (
      <div>
        <p className="text-lg font-semibold">{error}</p>
        <Link to="/teacher/reports" className="btn btn-secondary mt-4">
          Back to reports
        </Link>
      </div>
    )
  }
  if (!r) return <p className="text-muted">Loading the report...</p>

  const firstName = r.student.name.split(' ')[0]
  const stats = [
    { label: 'Points', value: r.points },
    { label: 'Day streak', value: r.streak },
    { label: 'Lessons done', value: r.lessonsDone },
    { label: 'Average score', value: r.averageScore === null ? 'None yet' : `${r.averageScore}%` },
    { label: 'Last active', value: daysAgoLabel(r.daysInactive) },
  ]

  return (
    <div className="max-w-4xl space-y-10">
      <div>
        {r.class && (
          <Link to={`/teacher/reports/${r.class.id}`} className="inline-flex min-h-12 items-center font-semibold text-muted hover:text-ink">
            {r.class.name} report
          </Link>
        )}
        <h1 className="text-3xl font-semibold tracking-tight">{r.student.name}</h1>
      </div>

      {r.reasons.length > 0 && (
        <p className="rounded-2xl bg-warn-soft p-4 font-semibold text-warn">Needs attention: {r.reasons.join('. ')}.</p>
      )}

      <dl className="grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-5">
        {stats.map((s) => (
          <div key={s.label}>
            <dt className="text-sm text-muted">{s.label}</dt>
            <dd className="text-2xl font-semibold">{s.value}</dd>
          </div>
        ))}
      </dl>

      {/* ---------- topics ---------- */}
      <section>
        <h2 className="text-xl font-semibold">Topics</h2>
        <p className="text-muted">
          From {firstName}’s latest try at each quiz. Struggling means below 60% with at least 3 answers.
        </p>
        {r.topics.length === 0 ? (
          <p className="card mt-3">{firstName} hasn’t answered any quiz questions yet.</p>
        ) : (
          <>
            <p className="mt-3">
              <span className="font-semibold">Weakest topics: </span>
              {r.weakestTopics.length === 0
                ? 'Not enough answers yet to tell (each topic needs 3).'
                : r.weakestTopics.map((w) => `${w.topic} (${w.accuracy}%)`).join(', ')}
            </p>
            <div className="mt-3 overflow-x-auto rounded-2xl bg-surface shadow-card ring-1 ring-line">
              <table className="w-full min-w-[32rem] text-left">
                <thead className="border-b border-line text-sm text-muted">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Topic</th>
                    <th className="px-4 py-3 text-right font-semibold">Accuracy</th>
                    <th className="px-4 py-3 text-right font-semibold">Answers</th>
                    <th className="px-4 py-3 font-semibold">Struggling?</th>
                  </tr>
                </thead>
                <tbody className="tabular-nums">
                  {r.topics.map((t) => (
                    <tr key={t.topic} className="not-last:border-b not-last:border-line">
                      <td className="px-4 py-3 font-semibold">{t.topic}</td>
                      <td className="px-4 py-3 text-right">{t.accuracy}%</td>
                      <td className="px-4 py-3 text-right">{t.answers}</td>
                      <td className="px-4 py-3">
                        {t.struggling ? (
                          <span className="font-semibold text-warn">Yes</span>
                        ) : t.answers < 3 ? (
                          <span className="text-muted">Too few answers to tell</span>
                        ) : (
                          <span className="text-muted">No</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>

      {/* ---------- chapters ---------- */}
      <section>
        <h2 className="text-xl font-semibold">Chapters</h2>
        {r.chapters.length === 0 ? (
          <p className="card mt-3">No chapters are shown to this class yet.</p>
        ) : (
          <div className="mt-3 overflow-x-auto rounded-2xl bg-surface shadow-card ring-1 ring-line">
            <table className="w-full min-w-[40rem] text-left">
              <thead className="border-b border-line text-sm text-muted">
                <tr>
                  <th className="px-4 py-3 font-semibold">Chapter</th>
                  <th className="px-4 py-3 text-right font-semibold">Lessons</th>
                  <th className="px-4 py-3 text-right font-semibold">Best score</th>
                  <th className="px-4 py-3 text-right font-semibold">Accuracy (latest)</th>
                  <th className="px-4 py-3 font-semibold">Struggling?</th>
                </tr>
              </thead>
              <tbody className="tabular-nums">
                {r.chapters.map((c) => (
                  <tr key={c.id} className="not-last:border-b not-last:border-line">
                    <td className="px-4 py-3 font-semibold">{c.title}</td>
                    <td className="px-4 py-3 text-right">
                      {c.lessonsDone} of {c.lessonsTotal}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {c.bestScore === null ? <span className="text-muted">Not taken</span> : `${c.bestScore}% (${c.stars} stars)`}
                    </td>
                    <td className="px-4 py-3 text-right">{c.accuracy === null ? <span className="text-muted">No answers yet</span> : `${c.accuracy}%`}</td>
                    <td className="px-4 py-3">
                      {c.struggling ? <span className="font-semibold text-warn">Yes</span> : <span className="text-muted">{c.answers === 0 ? '' : 'No'}</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* ---------- badges and recent quizzes ---------- */}
      <div className="grid gap-6 md:grid-cols-2">
        <section className="card">
          <h2 className="text-lg font-semibold">Badges earned</h2>
          <p className="mt-2">{r.badges.length === 0 ? `${firstName} hasn’t earned a badge yet.` : r.badges.join(', ')}</p>
        </section>
        <section className="card">
          <h2 className="text-lg font-semibold">Recent quizzes</h2>
          {r.recentAttempts.length === 0 ? (
            <p className="mt-2 text-muted">No quizzes taken yet.</p>
          ) : (
            <ul className="mt-2 space-y-1">
              {r.recentAttempts.map((a) => (
                <li key={a.id} className="flex flex-wrap justify-between gap-x-4">
                  <span>
                    {a.chapterTitle} <span className="text-muted">{shortDate(a.date)}</span>
                  </span>
                  <span className="tabular-nums">
                    {a.score}%, {a.stars} stars, +{a.points} points
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  )
}
