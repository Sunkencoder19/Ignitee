import { useId, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ChevronRight, RotateCcw, Search, SearchX, Star, TriangleAlert, Users } from 'lucide-react'
import Avatar from '@/components/ui/Avatar'
import Button from '@/components/ui/Button'
import EmptyState from '@/components/ui/EmptyState'
import Spinner from '@/components/ui/Spinner'
import ClassPicker from '@/features/teacher-dashboard/ClassPicker'
import useClassChoice from '@/hooks/useClassChoice'
import useDocumentTitle from '@/hooks/useDocumentTitle'
import useFetch from '@/hooks/useFetch'
import { daysAgoLabel } from '@/lib/format'
import { getStudents } from '@/services/classService'

// Nulls (no quizzes yet, never active) always sort to the bottom.
function byNumber(pick, direction) {
  return (a, b) => {
    const x = pick(a)
    const y = pick(b)
    if (x === null && y === null) return 0
    if (x === null) return 1
    if (y === null) return -1
    return direction === 'desc' ? y - x : x - y
  }
}

const SORTS = {
  points: { label: 'Most points', column: 'points', compare: byNumber((s) => s.points, 'desc') },
  score: { label: 'Best score', column: 'score', compare: byNumber((s) => s.bestScore, 'desc') },
  active: {
    label: 'Last active',
    column: 'active',
    compare: byNumber((s) => s.daysInactive, 'asc'),
  },
}

function AttentionFlag({ student }) {
  if (student.reasons.length === 0) return null
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-xs font-semibold text-amber-700">
      <TriangleAlert aria-hidden="true" className="h-3.5 w-3.5" />
      Needs attention
    </span>
  )
}

function scoreText(student) {
  return student.bestScore === null ? 'No quizzes yet' : `${student.bestScore}%`
}

// ---- ClassTable ----
export default function ClassTable() {
  useDocumentTitle('Students')
  const navigate = useNavigate()
  const searchId = useId()
  const sortId = useId()

  // ---- state ----
  const { classId, setClassId, ownClassId } = useClassChoice()
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState('points')
  const [retryKey, setRetryKey] = useState(0)
  const { data, loading, error } = useFetch(() => getStudents(classId), [classId, retryKey])

  const visible = useMemo(() => {
    if (!data) return []
    const q = query.trim().toLowerCase()
    return data
      .filter((s) => s.name.toLowerCase().includes(q))
      .sort((a, b) => SORTS[sort].compare(a, b) || a.name.localeCompare(b.name))
  }, [data, query, sort])

  // ---- render ----
  const filters = (
    <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
      <ClassPicker classId={classId} ownClassId={ownClassId} onChange={setClassId} />
      <div className="flex flex-1 flex-col gap-3 sm:flex-row">
        <div className="flex-1">
          <label htmlFor={searchId} className="text-sm font-semibold text-ink-900">
            Search by name
          </label>
          <div className="relative mt-1">
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-ink-600"
            />
            <input
              id={searchId}
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="e.g. Priya"
              className="min-h-tap w-full rounded-xl bg-paper pl-10 pr-3 text-ink-900 ring-2 ring-inset ring-ink-900/10 focus:outline-none focus:ring-sky-500"
            />
          </div>
        </div>
        <div>
          <label htmlFor={sortId} className="text-sm font-semibold text-ink-900">
            Sort by
          </label>
          <select
            id={sortId}
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            className="mt-1 min-h-tap w-full rounded-xl bg-paper px-3 text-ink-900 ring-2 ring-inset ring-ink-900/10 focus:outline-none focus:ring-sky-500 sm:w-44"
          >
            {Object.entries(SORTS).map(([key, s]) => (
              <option key={key} value={key}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  )

  const header = (
    <div className="space-y-4">
      <h1 className="text-3xl">Students</h1>
      {filters}
    </div>
  )

  if (loading && !data) {
    return (
      <div className="space-y-6">
        {header}
        <div className="grid min-h-[40dvh] place-items-center">
          <Spinner size="lg" label="Loading students" />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        {header}
        <EmptyState
          icon={TriangleAlert}
          title="Couldn't load the students"
          message={error.message}
          action={
            <Button icon={RotateCcw} onClick={() => setRetryKey((k) => k + 1)}>
              Try again
            </Button>
          }
        />
      </div>
    )
  }

  const ariaSort = (column) => (SORTS[sort].column === column ? 'descending' : undefined)

  return (
    <div className="space-y-6">
      {header}

      <p aria-live="polite" className="text-sm font-semibold text-ink-600">
        {visible.length} {visible.length === 1 ? 'student' : 'students'}
        {query.trim() && ` matching "${query.trim()}"`}
      </p>

      {data.length === 0 ? (
        <EmptyState icon={Users} title="No students in this class yet" />
      ) : visible.length === 0 ? (
        <EmptyState
          icon={SearchX}
          title={`No one called "${query.trim()}"`}
          message="Check the spelling, or try the first name only."
          action={
            <Button variant="secondary" onClick={() => setQuery('')}>
              Clear search
            </Button>
          }
        />
      ) : (
        <div className={`transition-opacity ${loading ? 'opacity-60' : ''}`} aria-busy={loading}>
          {/* Phones: one card per student */}
          <ul className="space-y-3 md:hidden">
            {visible.map((s) => (
              <li key={s.id}>
                <Link
                  to={`/teacher/students/${s.id}`}
                  className="block rounded-2xl bg-paper p-4 shadow-soft ring-1 ring-ink-900/5 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-sky-500/50"
                >
                  <div className="flex items-center gap-3">
                    <Avatar name={s.name} />
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-ink-900">{s.name}</p>
                      <p className="text-sm">Class {s.classId}</p>
                    </div>
                    <ChevronRight aria-hidden="true" className="h-5 w-5 text-ink-600" />
                  </div>
                  <dl className="mt-3 grid grid-cols-3 gap-2 text-sm">
                    <div>
                      <dt className="text-ink-600">Points</dt>
                      <dd className="font-semibold text-ink-900">
                        {s.points} <span className="font-normal text-ink-600">{s.level}</span>
                      </dd>
                    </div>
                    <div>
                      <dt className="text-ink-600">Best score</dt>
                      <dd className="font-semibold text-ink-900">{scoreText(s)}</dd>
                    </div>
                    <div>
                      <dt className="text-ink-600">Last active</dt>
                      <dd className="font-semibold text-ink-900">{daysAgoLabel(s.daysInactive)}</dd>
                    </div>
                  </dl>
                  {s.reasons.length > 0 && (
                    <div className="mt-3">
                      <AttentionFlag student={s} />
                    </div>
                  )}
                </Link>
              </li>
            ))}
          </ul>

          {/* md and up: a real table */}
          <div className="hidden overflow-hidden rounded-2xl bg-paper shadow-soft ring-1 ring-ink-900/5 md:block">
            <table className="w-full text-left">
              <thead className="border-b border-ink-900/10 bg-ink-900/[0.02] text-sm">
                <tr>
                  <th scope="col" className="px-4 py-3 font-semibold text-ink-900">
                    Student
                  </th>
                  <th scope="col" className="px-4 py-3 font-semibold text-ink-900">
                    Class
                  </th>
                  <th
                    scope="col"
                    aria-sort={ariaSort('points')}
                    className="px-4 py-3 text-right font-semibold text-ink-900"
                  >
                    Points
                  </th>
                  <th
                    scope="col"
                    aria-sort={ariaSort('score')}
                    className="px-4 py-3 text-right font-semibold text-ink-900"
                  >
                    Best score
                  </th>
                  <th scope="col" className="px-4 py-3 text-right font-semibold text-ink-900">
                    Lessons
                  </th>
                  <th
                    scope="col"
                    aria-sort={ariaSort('active')}
                    className="px-4 py-3 font-semibold text-ink-900"
                  >
                    Last active
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-900/5 tabular-nums">
                {visible.map((s) => (
                  // The name is the real link (keyboard, screen readers);
                  // the row click is a bigger target for a mouse.
                  <tr
                    key={s.id}
                    onClick={() => navigate(`/teacher/students/${s.id}`)}
                    className="cursor-pointer hover:bg-sky-500/[0.04]"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <Avatar name={s.name} />
                        <div>
                          <Link
                            to={`/teacher/students/${s.id}`}
                            onClick={(e) => e.stopPropagation()}
                            className="font-semibold text-ink-900 hover:underline focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-sky-500/50"
                          >
                            {s.name}
                          </Link>
                          <div>
                            <AttentionFlag student={s} />
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">{s.classId}</td>
                    <td className="px-4 py-3 text-right">
                      <span className="inline-flex items-center gap-1 font-semibold text-ink-900">
                        <Star aria-hidden="true" className="h-4 w-4 fill-sun-400 text-sun-400" />
                        {s.points}
                      </span>
                      <span className="block text-sm">{s.level}</span>
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-ink-900">
                      {s.bestScore === null ? (
                        <span className="font-normal text-ink-600">No quizzes yet</span>
                      ) : (
                        `${s.bestScore}%`
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">{s.lessonsDone}</td>
                    <td className="px-4 py-3">{daysAgoLabel(s.daysInactive)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
