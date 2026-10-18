// Every student in the chosen class, with search and sort.
// Click a name to see that student in detail.

import { useState } from 'react'
import { Link, useOutletContext } from 'react-router-dom'
import { getChapters, getClass, useData } from '../../api'
import { daysAgoLabel, studentSummary, today } from '../../game'

// "Nothing yet" (null) always sorts to the bottom.
const SORTS = {
  points: { label: 'Most points', value: (s) => s.points, highFirst: true },
  score: { label: 'Best average score', value: (s) => s.averageScore, highFirst: true },
  active: { label: 'Most recently active', value: (s) => s.daysInactive, highFirst: false },
}

export default function Students() {
  const { classId } = useOutletContext()
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState('points')
  const { data, error } = useData(() => Promise.all([getClass(classId), getChapters()]), [classId])

  if (error) return <p className="text-warn">{error}</p>
  if (!data) return <p className="text-muted">Loading...</p>

  const [rows, chapters] = data
  const { value, highFirst } = SORTS[sort]
  const students = rows
    .map((r) => studentSummary(r.student, r.progress, chapters, today()))
    .filter((s) => s.name.toLowerCase().includes(search.trim().toLowerCase()))
    .sort((a, b) => {
      const x = value(a)
      const y = value(b)
      if (x === y) return a.name.localeCompare(b.name)
      if (x === null) return 1
      if (y === null) return -1
      return highFirst ? y - x : x - y
    })

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-semibold tracking-tight">Students</h1>

      <div className="grid gap-4 sm:grid-cols-[1fr_16rem]">
        <div>
          <label htmlFor="search" className="label">
            Search by name
          </label>
          <input
            id="search"
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="field"
          />
        </div>
        <div>
          <label htmlFor="sort" className="label">
            Sort by
          </label>
          <select id="sort" value={sort} onChange={(e) => setSort(e.target.value)} className="field">
            {Object.entries(SORTS).map(([key, s]) => (
              <option key={key} value={key}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {students.length === 0 ? (
        <p className="text-muted">No students match &quot;{search.trim()}&quot;.</p>
      ) : (
        <div className="overflow-x-auto rounded-2xl bg-surface shadow-card ring-1 ring-line">
          <table className="w-full min-w-[40rem] text-left">
            <thead className="border-b border-line text-sm text-muted">
              <tr>
                <th className="px-4 py-3 font-semibold">Name</th>
                <th className="px-4 py-3 font-semibold">Class</th>
                <th className="px-4 py-3 text-right font-semibold">Points</th>
                <th className="px-4 py-3 text-right font-semibold">Average score</th>
                <th className="px-4 py-3 text-right font-semibold">Lessons</th>
                <th className="px-4 py-3 font-semibold">Last active</th>
              </tr>
            </thead>
            <tbody className="tabular-nums">
              {students.map((s) => (
                <tr key={s.id} className="not-last:border-b not-last:border-line">
                  <td className="px-4 py-3">
                    <Link to={`/teacher/students/${s.id}`} className="font-semibold text-accent hover:underline">
                      {s.name}
                    </Link>
                    {s.reasons.length > 0 && <span className="block text-sm text-warn">Needs attention</span>}
                  </td>
                  <td className="px-4 py-3">{s.classId}</td>
                  <td className="px-4 py-3 text-right">{s.points}</td>
                  <td className="px-4 py-3 text-right">{s.averageScore === null ? 'None yet' : `${s.averageScore}%`}</td>
                  <td className="px-4 py-3 text-right">{s.lessonsDone}</td>
                  <td className="px-4 py-3">{daysAgoLabel(s.daysInactive)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
