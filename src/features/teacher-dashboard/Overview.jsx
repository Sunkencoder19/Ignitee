import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  BookOpenCheck,
  CircleCheck,
  Clock,
  RotateCcw,
  Target,
  TriangleAlert,
  Users,
} from 'lucide-react'
import Button from '@/components/ui/Button'
import EmptyState from '@/components/ui/EmptyState'
import Spinner from '@/components/ui/Spinner'
import ClassPicker from '@/features/teacher-dashboard/ClassPicker'
import {
  ChapterScoreChart,
  ChartCard,
  DailyLessonsChart,
} from '@/features/teacher-dashboard/Charts'
import ReasonChip from '@/features/teacher-dashboard/ReasonChip'
import StatTile from '@/components/ui/StatTile'
import useClassChoice from '@/hooks/useClassChoice'
import useDocumentTitle from '@/hooks/useDocumentTitle'
import useFetch from '@/hooks/useFetch'
import { getClassSummary } from '@/services/classService'

function scopeLabel(classId) {
  return classId === 'all' ? 'All classes' : `Class ${classId}`
}

// ---- NeedsAttention ----
function NeedsAttention({ students, showClass }) {
  return (
    <section
      aria-labelledby="attention-heading"
      className="rounded-2xl bg-paper p-4 shadow-soft ring-1 ring-ink-900/5 md:p-5"
    >
      <h2 id="attention-heading" className="text-lg">
        Needs attention
      </h2>
      <p className="text-sm">Below 50% on a chapter quiz, or inactive for 3 or more days.</p>

      {students.length === 0 ? (
        <p className="mt-4 flex items-center gap-2 rounded-xl bg-leaf-600/10 p-3 font-semibold text-ink-900">
          <CircleCheck aria-hidden="true" className="h-5 w-5 shrink-0 text-leaf-600" />
          Nobody needs attention right now.
        </p>
      ) : (
        <ul className="mt-3 divide-y divide-ink-900/5">
          {students.map((s) => (
            <li key={s.id}>
              <Link
                to={`/teacher/students/${s.id}`}
                className="-mx-2 flex min-h-tap flex-col gap-2 rounded-xl px-2 py-3 hover:bg-ink-900/[0.03] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-sky-500/50 sm:flex-row sm:items-center"
              >
                <span className="font-semibold text-ink-900 sm:w-44 sm:shrink-0">
                  {s.name}
                  {showClass && <span className="font-normal text-ink-600"> · {s.classId}</span>}
                </span>
                <span className="flex flex-wrap gap-1.5">
                  {s.reasons.map((r) => (
                    <ReasonChip key={r.text} reason={r} />
                  ))}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

// ---- Overview ----
export default function Overview() {
  useDocumentTitle('Class overview')

  // ---- state ----
  const { classId, setClassId, ownClassId } = useClassChoice()
  const [retryKey, setRetryKey] = useState(0)
  const { data, loading, error } = useFetch(() => getClassSummary(classId), [classId, retryKey])

  // ---- render ----
  const header = (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-3xl">Class overview</h1>
        <p>
          {scopeLabel(classId)}
          {data && ` · ${data.studentCount} students`}
        </p>
      </div>
      <ClassPicker classId={classId} ownClassId={ownClassId} onChange={setClassId} />
    </div>
  )

  if (loading && !data) {
    return (
      <div className="space-y-6">
        {header}
        <div className="grid min-h-[40dvh] place-items-center">
          <Spinner size="lg" label="Loading class overview" />
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
          title="Couldn't load the class"
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

  if (data.studentCount === 0) {
    return (
      <div className="space-y-6">
        {header}
        <EmptyState icon={Users} title="No students in this class yet" />
      </div>
    )
  }

  const noScores = data.chapterAverages.every((c) => c.value === null)
  const lessonTotal = data.lessonsPerDay.reduce((sum, d) => sum + d.value, 0)
  const inactiveNames = data.inactive.map((s) => s.name.split(' ')[0])

  return (
    <div className="space-y-6">
      {header}

      {/* Refetching for another class keeps the last numbers on screen, dimmed */}
      <div
        aria-busy={loading}
        className={`space-y-6 transition-opacity ${loading ? 'opacity-60' : ''}`}
      >
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatTile
            icon={Users}
            label="Students"
            value={data.studentCount}
            note={scopeLabel(classId)}
          />
          <StatTile
            icon={Target}
            label="Average quiz score"
            value={data.averageScore === null ? null : `${data.averageScore}%`}
            note={data.averageScore === null ? 'No quiz attempts yet' : 'Best attempt per quiz'}
          />
          <StatTile
            icon={BookOpenCheck}
            label="Lessons this week"
            value={data.lessonsThisWeek}
            note="Last 7 days"
          />
          <StatTile
            icon={Clock}
            label="Inactive 3+ days"
            value={data.inactive.length}
            note={inactiveNames.length ? inactiveNames.join(', ') : 'Everyone is active'}
          />
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <ChartCard
            title="Class average by chapter"
            subtitle="Best attempt per student"
            empty={noScores ? 'No quiz attempts yet in this class.' : null}
            table={{
              columns: ['Chapter', 'Average', 'Students'],
              rows: data.chapterAverages.map((c) => [
                c.title,
                c.value === null ? 'No attempts yet' : `${c.value}%`,
                c.attempted,
              ]),
            }}
          >
            <ChapterScoreChart data={data.chapterAverages} />
          </ChartCard>

          <ChartCard
            title="Lessons completed per day"
            subtitle="Last 14 days"
            empty={lessonTotal === 0 ? 'No lessons completed in the last 14 days.' : null}
            table={{
              columns: ['Day', 'Lessons'],
              rows: data.lessonsPerDay.map((d) => [d.label, d.value]),
            }}
          >
            <DailyLessonsChart data={data.lessonsPerDay} />
          </ChartCard>
        </div>

        <NeedsAttention students={data.needsAttention} showClass={classId === 'all'} />
      </div>
    </div>
  )
}
