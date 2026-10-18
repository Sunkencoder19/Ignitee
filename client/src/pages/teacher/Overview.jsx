// Teacher overview for the chosen class: headline numbers, quiz results per
// chapter, lessons per day, and the students who need attention.

import { Link, useOutletContext } from 'react-router-dom'
import { getChapters, getClass, useData } from '../../api'
import {
  bestScores,
  chapterResults,
  daysBetween,
  INACTIVE_DAYS,
  lessonsPerDay,
  shortDate,
  studentSummary,
  today,
} from '../../game'

export default function Overview() {
  const { classId } = useOutletContext()
  const { data, error } = useData(() => Promise.all([getClass(classId), getChapters()]), [classId])

  if (error) return <p className="text-warn">{error}</p>
  if (!data) return <p className="text-muted">Loading...</p>

  const [rows, chapters] = data
  const summaries = rows.map((r) => studentSummary(r.student, r.progress, chapters, today()))
  const results = chapterResults(rows, chapters)
  const perDay = lessonsPerDay(rows, today(), 14)
  const busiestDay = Math.max(1, ...perDay.map((d) => d.count))

  const allBest = rows.flatMap((r) => Object.values(bestScores(r.progress)))
  const classAverage = allBest.length
    ? `${Math.round(allBest.reduce((a, b) => a + b, 0) / allBest.length)}%`
    : 'None yet'
  const lessonsThisWeek = rows
    .flatMap((r) => r.progress.lessons)
    .filter((l) => daysBetween(l.date, today()) < 7).length
  const inactive = summaries.filter((s) => s.daysInactive === null || s.daysInactive >= INACTIVE_DAYS)
  const needsHelp = summaries.filter((s) => s.reasons.length > 0)

  const stats = [
    { label: 'Students', value: rows.length },
    { label: 'Average quiz score', value: classAverage },
    { label: 'Lessons in the last 7 days', value: lessonsThisWeek },
    { label: `Inactive ${INACTIVE_DAYS}+ days`, value: inactive.length },
  ]

  return (
    <div className="space-y-10">
      <h1 className="text-3xl font-extrabold tracking-tight">
        {classId === 'all' ? 'All classes' : `Class ${classId}`}
      </h1>

      <dl className="grid grid-cols-2 gap-6 lg:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="card">
            <dt className="text-sm text-muted">{s.label}</dt>
            <dd className="mt-1 text-3xl font-extrabold">{s.value}</dd>
          </div>
        ))}
      </dl>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card">
          <h2 className="text-lg font-extrabold">Quiz results by chapter</h2>
          <p className="text-sm text-muted">Each student counts once, with their best attempt.</p>
          <ul className="mt-5 space-y-5">
            {results.map((r) => (
              <li key={r.chapter.id}>
                <div className="flex justify-between gap-4">
                  <span className="font-bold">
                    {r.chapter.number}. {r.chapter.title}
                  </span>
                  <span className="font-bold tabular-nums">{r.average === null ? 'Not taken' : `${r.average}%`}</span>
                </div>
                {r.average !== null && (
                  <div className="mt-2 h-2 rounded-full bg-accent" style={{ width: `${r.average}%` }} />
                )}
                <p className="mt-1 text-sm text-muted">
                  Taken by {r.taken} of {rows.length}. Stars: 3 stars {r.stars[3]}, 2 stars {r.stars[2]}, 1
                  star {r.stars[1]}, below 50% {r.stars[0]}.
                </p>
              </li>
            ))}
          </ul>
        </section>

        <section className="card">
          <h2 className="text-lg font-extrabold">Lessons finished per day</h2>
          <p className="text-sm text-muted">Last 14 days, today on the right.</p>
          <ol className="mt-5 flex h-48 items-end gap-1">
            {perDay.map((d) => (
              <li key={d.date} className="flex h-full flex-1 flex-col justify-end text-center" title={`${shortDate(d.date)}: ${d.count}`}>
                <span className="text-xs font-bold">{d.count || ''}</span>
                <span
                  className="mt-1 block rounded-t-md bg-accent"
                  style={{ height: `${(d.count / busiestDay) * 100}%` }}
                />
              </li>
            ))}
          </ol>
          <div className="mt-2 flex justify-between text-xs text-muted">
            <span>{shortDate(perDay[0].date)}</span>
            <span>Today</span>
          </div>
        </section>
      </div>

      <section>
        <h2 className="text-lg font-extrabold">Needs attention</h2>
        <p className="text-sm text-muted">
          Below 50% on a quiz, or no learning for {INACTIVE_DAYS} days or more.
        </p>
        {needsHelp.length === 0 ? (
          <p className="mt-4">Nobody needs attention right now.</p>
        ) : (
          <ul className="mt-4 overflow-hidden rounded-xl border border-line bg-surface">
            {needsHelp.map((s) => (
              <li key={s.id} className="not-last:border-b not-last:border-line">
                <Link
                  to={`/teacher/students/${s.id}`}
                  className="flex flex-col gap-1 px-4 py-3 hover:bg-bg sm:flex-row sm:gap-6"
                >
                  <span className="font-bold sm:w-48">{s.name}</span>
                  <span className="text-warn">{s.reasons.join('. ')}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
