// A class report: who needs attention, which topics and chapters the class
// finds hardest, and each student's weakest topics.
//   /teacher/reports            goes to the teacher's first class
//   /teacher/reports/:classId   that class
//
// Accuracy counts right first time as 1, right after the hint as 0.5 and
// missed as 0, from each student's latest try at each quiz. "Struggling"
// means below 60% with at least 3 answers. Anything with no answers yet says
// so in words instead of showing a number.

import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { getClassReport, getClasses, useData } from '../../api'
import { daysAgoLabel, shortDate } from '../../game'

export default function Reports() {
  const { classId } = useParams()
  const navigate = useNavigate()
  const { data: classes, error: classesError } = useData(() => getClasses(), [])
  const { data: report, error } = useData(() => (classId ? getClassReport(classId) : Promise.resolve(null)), [classId])

  if (classesError) return <p className="text-warn">{classesError}</p>
  if (!classes) return <p className="text-muted">Loading...</p>
  if (classes.length === 0) {
    return (
      <div className="max-w-xl">
        <h1 className="text-3xl font-semibold tracking-tight">Reports</h1>
        <p className="mt-2 text-muted">
          Reports appear once you have a class.{' '}
          <Link to="/teacher" className="font-semibold text-accent underline">
            Create your first class
          </Link>
          .
        </p>
      </div>
    )
  }
  if (!classId) return <Navigate to={`/teacher/reports/${classes[0].id}`} replace />

  const header = (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <h1 className="text-3xl font-semibold tracking-tight">Reports</h1>
      <div>
        <label htmlFor="report-class" className="label">
          Class
        </label>
        <select
          id="report-class"
          value={classId}
          onChange={(e) => navigate(`/teacher/reports/${e.target.value}`)}
          className="field w-auto min-w-48"
        >
          {classes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>
    </div>
  )

  if (error) return <div className="space-y-6">{header}<p className="text-lg font-semibold">{error}</p></div>
  if (!report) return <div className="space-y-6">{header}<p className="text-muted">Loading the report...</p></div>

  if (report.summary.students === 0) {
    return (
      <div className="space-y-6">
        {header}
        <section className="card p-6">
          <h2 className="text-xl font-semibold">No students in {report.class.name} yet</h2>
          <p className="mt-1 text-muted">
            <Link to={`/teacher/classes/${report.class.id}`} className="font-semibold text-accent underline">
              Add students
            </Link>{' '}
            and the report fills in as they learn.
          </p>
        </section>
      </div>
    )
  }

  const s = report.summary
  const noAnswers = report.topics.length === 0
  const stats = [
    { label: 'Students', value: s.students },
    { label: 'Average quiz score', value: s.averageScore === null ? 'No quizzes yet' : `${s.averageScore}%` },
    { label: 'Lessons in the last 7 days', value: s.lessonsThisWeek },
    { label: 'Inactive 3+ days', value: s.inactive },
  ]

  return (
    <div className="space-y-10">
      {header}

      <dl className="grid grid-cols-2 gap-6 lg:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.label} className="card">
            <dt className="text-sm text-muted">{stat.label}</dt>
            <dd className="mt-1 text-2xl font-semibold">{stat.value}</dd>
          </div>
        ))}
      </dl>

      {/* ---------- needs attention ---------- */}
      <section>
        <h2 className="text-xl font-semibold">Needs attention</h2>
        <p className="text-muted">A best quiz score below 50%, or no learning for 3 days or more.</p>
        {report.needsAttention.length === 0 ? (
          <p className="mt-3">Nobody needs attention right now.</p>
        ) : (
          <ul className="mt-3 overflow-hidden rounded-2xl bg-surface shadow-card ring-1 ring-line">
            {report.needsAttention.map((st) => (
              <li key={st.id} className="not-last:border-b not-last:border-line">
                <Link to={`/teacher/students/${st.id}`} className="flex flex-col gap-1 px-4 py-3 hover:bg-bg sm:flex-row sm:gap-6">
                  <span className="font-semibold sm:w-48">{st.name}</span>
                  <span className="text-warn">{st.reasons.join('. ')}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* ---------- topics ---------- */}
      <section>
        <h2 className="text-xl font-semibold">Topics the class finds hardest</h2>
        <p className="text-muted">
          From each student’s latest try at each quiz. A student is struggling on a topic below 60%, once they have at least 3
          answers on it.
        </p>
        {noAnswers ? (
          <p className="card mt-3">No quiz answers yet. Topics appear here once students take a quiz.</p>
        ) : (
          <div className="mt-3 overflow-x-auto rounded-2xl bg-surface shadow-card ring-1 ring-line">
            <table className="w-full min-w-[40rem] text-left">
              <thead className="border-b border-line text-sm text-muted">
                <tr>
                  <th className="px-4 py-3 font-semibold">Topic</th>
                  <th className="px-4 py-3 font-semibold">Class accuracy</th>
                  <th className="px-4 py-3 text-right font-semibold">Answers</th>
                  <th className="px-4 py-3 font-semibold">Struggling</th>
                </tr>
              </thead>
              <tbody>
                {report.topics.map((t) => (
                  <tr key={t.topic} className="not-last:border-b not-last:border-line">
                    <td className="px-4 py-3 font-semibold">{t.topic}</td>
                    <td className="px-4 py-3">
                      <Accuracy value={t.accuracy} />
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">{t.answers}</td>
                    <td className="px-4 py-3">
                      {t.studentsJudged === 0 ? (
                        <span className="text-muted">Too few answers to tell</span>
                      ) : t.studentsStruggling.length === 0 ? (
                        <span className="text-muted">Nobody ({t.studentsJudged} checked)</span>
                      ) : (
                        <span className="text-warn">
                          {t.studentsStruggling.length} of {t.studentsJudged}: {t.studentsStruggling.join(', ')}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* ---------- chapters ---------- */}
      <section>
        <h2 className="text-xl font-semibold">Chapters</h2>
        {report.chapters.length === 0 ? (
          <p className="card mt-3">No chapters are shown to this class yet.</p>
        ) : (
          <div className="mt-3 overflow-x-auto rounded-2xl bg-surface shadow-card ring-1 ring-line">
            <table className="w-full min-w-[48rem] text-left">
              <thead className="border-b border-line text-sm text-muted">
                <tr>
                  <th className="px-4 py-3 font-semibold">Chapter</th>
                  <th className="px-4 py-3 font-semibold">Accuracy</th>
                  <th className="px-4 py-3 font-semibold">Average best score</th>
                  <th className="px-4 py-3 font-semibold">Best attempt stars</th>
                  <th className="px-4 py-3 font-semibold">Struggling</th>
                </tr>
              </thead>
              <tbody>
                {report.chapters.map((c) => (
                  <tr key={c.id} className="not-last:border-b not-last:border-line">
                    <td className="px-4 py-3">
                      <span className="font-semibold">{c.title}</span>
                      {c.status === 'draft' && <span className="block text-sm text-muted">Unpublished</span>}
                    </td>
                    {c.studentsTaken === 0 ? (
                      <td colSpan={4} className="px-4 py-3 text-muted">
                        No one has taken this quiz yet.
                      </td>
                    ) : (
                      <>
                        <td className="px-4 py-3">
                          <Accuracy value={c.accuracy} />
                        </td>
                        <td className="px-4 py-3">
                          {c.averageBestScore}%{' '}
                          <span className="text-muted">
                            ({c.studentsTaken} of {s.students} took it)
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm">
                          3 stars: {c.stars[3]}, 2 stars: {c.stars[2]}, 1 star: {c.stars[1]}, below 50%: {c.stars[0]}
                        </td>
                        <td className="px-4 py-3">
                          {c.studentsStruggling.length ? (
                            <span className="text-warn">{c.studentsStruggling.join(', ')}</span>
                          ) : (
                            <span className="text-muted">Nobody</span>
                          )}
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* ---------- students ---------- */}
      <section>
        <h2 className="text-xl font-semibold">Students</h2>
        <p className="text-muted">Weakest topics are those with 3 or more answers, lowest accuracy first.</p>
        <div className="mt-3 overflow-x-auto rounded-2xl bg-surface shadow-card ring-1 ring-line">
          <table className="w-full min-w-[48rem] text-left">
            <thead className="border-b border-line text-sm text-muted">
              <tr>
                <th className="px-4 py-3 font-semibold">Name</th>
                <th className="px-4 py-3 text-right font-semibold">Points</th>
                <th className="px-4 py-3 text-right font-semibold">Average score</th>
                <th className="px-4 py-3 font-semibold">Last active</th>
                <th className="px-4 py-3 font-semibold">Weakest topics</th>
              </tr>
            </thead>
            <tbody>
              {report.students.map((st) => (
                <tr key={st.id} className="not-last:border-b not-last:border-line">
                  <td className="px-4 py-3">
                    <Link to={`/teacher/students/${st.id}`} className="font-semibold text-accent hover:underline">
                      {st.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">{st.points}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{st.averageScore === null ? 'None yet' : `${st.averageScore}%`}</td>
                  <td className="px-4 py-3">{daysAgoLabel(st.daysInactive)}</td>
                  <td className="px-4 py-3">
                    {st.weakestTopics.length === 0 ? (
                      <span className="text-muted">{st.answers === 0 ? 'No quiz answers yet' : 'Too few answers to tell'}</span>
                    ) : (
                      st.weakestTopics.map((w, i) => (
                        <span key={w.topic} className={w.struggling ? 'font-semibold text-warn' : ''}>
                          {i > 0 && ', '}
                          {w.topic} {w.accuracy}%{w.struggling && ' (struggling)'}
                        </span>
                      ))
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <LessonsPerDay days={report.lessonsPerDay} />
    </div>
  )
}

// A percentage with a small bar (no grey track behind it), or words if there's nothing yet.
function Accuracy({ value }) {
  if (value === null) return <span className="text-muted">No answers yet</span>
  return (
    <span className="flex items-center gap-3">
      <span className="w-10 text-right tabular-nums">{value}%</span>
      <span className={`h-2 rounded-full ${value < 60 ? 'bg-warn' : 'bg-accent'}`} style={{ width: `${Math.max(value, 2) * 0.8}px` }} />
    </span>
  )
}

function LessonsPerDay({ days }) {
  const total = days.reduce((sum, d) => sum + d.count, 0)
  const busiest = Math.max(1, ...days.map((d) => d.count))
  return (
    <section className="card">
      <h2 className="text-lg font-semibold">Lessons finished per day</h2>
      <p className="text-sm text-muted">Last 14 days, today on the right.</p>
      {total === 0 ? (
        <p className="mt-4 text-muted">No lessons finished in the last 14 days.</p>
      ) : (
        <>
          <ol className="mt-5 flex h-40 items-end gap-1">
            {days.map((d) => (
              <li key={d.date} className="flex h-full flex-1 flex-col justify-end text-center" title={`${shortDate(d.date)}: ${d.count}`}>
                <span className="text-xs font-semibold">{d.count || ''}</span>
                <span className="mt-1 block rounded-t-md bg-accent" style={{ height: `${(d.count / busiest) * 100}%` }} />
              </li>
            ))}
          </ol>
          <div className="mt-2 flex justify-between text-xs text-muted">
            <span>{shortDate(days[0].date)}</span>
            <span>Today</span>
          </div>
        </>
      )}
    </section>
  )
}
