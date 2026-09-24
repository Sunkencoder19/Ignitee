import { useState } from 'react'
import { ClipboardList, RotateCcw, Star, TriangleAlert } from 'lucide-react'
import Button from '@/components/ui/Button'
import EmptyState from '@/components/ui/EmptyState'
import Spinner from '@/components/ui/Spinner'
import ClassPicker from '@/features/teacher-dashboard/ClassPicker'
import useClassChoice from '@/hooks/useClassChoice'
import useDocumentTitle from '@/hooks/useDocumentTitle'
import useFetch from '@/hooks/useFetch'
import { getTint } from '@/lib/tints'
import { getAssessments } from '@/services/classService'

// ---- StarSpread ----
// How each student's best attempt landed, 3 stars down to below 50%.
// Plain bars with the count written beside each one: sun-400 is too light on
// white to carry the number by itself.
function StarSpread({ stars, attempted }) {
  const rows = [
    { key: 3, label: '3 stars', count: stars[3] },
    { key: 2, label: '2 stars', count: stars[2] },
    { key: 1, label: '1 star', count: stars[1] },
    { key: 0, label: 'Below 50%', count: stars[0] },
  ]

  return (
    <dl className="space-y-2">
      {rows.map((row) => (
        <div key={row.key} className="grid grid-cols-[6.5rem_1fr_2rem] items-center gap-3 text-sm">
          <dt className="flex items-center gap-1 text-ink-900">
            {row.key > 0 ? (
              <>
                <span className="inline-flex" aria-hidden="true">
                  {Array.from({ length: row.key }, (_, i) => (
                    <Star key={i} className="h-3.5 w-3.5 fill-sun-400 text-sun-400" />
                  ))}
                </span>
                <span className="sr-only">{row.label}</span>
                <span aria-hidden="true" className="text-ink-600">
                  {row.label.replace(/^\d /, '')}
                </span>
              </>
            ) : (
              row.label
            )}
          </dt>
          <div aria-hidden="true" className="h-3 overflow-hidden rounded-full bg-ink-900/5">
            <div
              className="h-full rounded-full bg-sun-400"
              style={{ width: `${attempted ? (row.count / attempted) * 100 : 0}%` }}
            />
          </div>
          <dd className="text-right font-semibold tabular-nums text-ink-900">{row.count}</dd>
        </div>
      ))}
    </dl>
  )
}

// ---- ChapterCard ----
function ChapterCard({ stat }) {
  const tint = getTint(stat.tint)
  const notTried = stat.studentsTotal - stat.studentsAttempted

  return (
    <section
      aria-labelledby={`${stat.chapterId}-heading`}
      className="relative overflow-hidden rounded-2xl bg-paper p-4 shadow-soft ring-1 ring-ink-900/5 md:p-5"
    >
      <span aria-hidden="true" className={`absolute inset-x-0 top-0 h-1.5 ${tint.solid}`} />
      <p className={`text-sm font-semibold uppercase tracking-widest ${tint.text}`}>
        Chapter {stat.number}
      </p>
      <h2 id={`${stat.chapterId}-heading`} className="text-xl">
        {stat.title}
      </h2>

      {stat.studentsAttempted === 0 ? (
        <div className="mt-4 rounded-xl bg-ink-900/[0.03] p-4 text-center">
          <p className="font-semibold text-ink-900">No one has taken this quiz yet.</p>
          <p className="text-sm">
            {stat.studentsTotal} {stat.studentsTotal === 1 ? 'student' : 'students'} still to try
            it.
          </p>
        </div>
      ) : (
        <>
          <div className="mt-3 flex flex-wrap items-end gap-x-6 gap-y-1">
            <p>
              <span className="block font-heading text-4xl font-semibold text-ink-900">
                {stat.average}%
              </span>
              <span className="text-sm">class average (best attempt)</span>
            </p>
            <p className="text-sm">
              {stat.attempts} {stat.attempts === 1 ? 'attempt' : 'attempts'} by{' '}
              {stat.studentsAttempted} of {stat.studentsTotal} students
            </p>
          </div>
          <div className="mt-4">
            <StarSpread stars={stat.stars} attempted={stat.studentsAttempted} />
          </div>
          {notTried > 0 && (
            <p className="mt-3 text-sm">
              Not tried yet: <span className="font-semibold text-ink-900">{notTried}</span>
            </p>
          )}
        </>
      )}
    </section>
  )
}

// ---- Assessments ----
export default function Assessments() {
  useDocumentTitle('Assessments')

  // ---- state ----
  const { classId, setClassId, ownClassId } = useClassChoice()
  const [retryKey, setRetryKey] = useState(0)
  const { data, loading, error } = useFetch(() => getAssessments(classId), [classId, retryKey])

  // ---- render ----
  const header = (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-3xl">Assessments</h1>
        <p>Chapter quiz results. Each student counts once, with their best attempt.</p>
      </div>
      <ClassPicker classId={classId} ownClassId={ownClassId} onChange={setClassId} />
    </div>
  )

  if (loading && !data) {
    return (
      <div className="space-y-6">
        {header}
        <div className="grid min-h-[40dvh] place-items-center">
          <Spinner size="lg" label="Loading quiz results" />
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
          title="Couldn't load quiz results"
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

  if (data.length === 0) {
    return (
      <div className="space-y-6">
        {header}
        <EmptyState icon={ClipboardList} title="No chapter quizzes yet" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {header}
      <div
        aria-busy={loading}
        className={`grid gap-4 md:grid-cols-2 transition-opacity ${loading ? 'opacity-60' : ''}`}
      >
        {data.map((stat) => (
          <ChapterCard key={stat.chapterId} stat={stat} />
        ))}
      </div>
    </div>
  )
}
