import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  Award,
  BookOpenCheck,
  Flame,
  RotateCcw,
  Star,
  TriangleAlert,
  UserX,
} from 'lucide-react'
import BadgeIcon from '@/components/ui/BadgeIcon'
import Button from '@/components/ui/Button'
import EmptyState from '@/components/ui/EmptyState'
import ProgressBar from '@/components/ui/ProgressBar'
import Spinner from '@/components/ui/Spinner'
import { ChapterScoreChart, ChartCard } from '@/features/teacher-dashboard/Charts'
import ReasonChip from '@/features/teacher-dashboard/ReasonChip'
import StatTile from '@/features/teacher-dashboard/StatTile'
import useDocumentTitle from '@/hooks/useDocumentTitle'
import useFetch from '@/hooks/useFetch'
import { shortDate } from '@/lib/format'
import { getStudentDetail } from '@/services/classService'

const CARD = 'rounded-2xl bg-paper p-4 shadow-soft ring-1 ring-ink-900/5 md:p-5'

const backLink = (
  <Link
    to="/teacher/students"
    className="inline-flex min-h-tap items-center gap-1 rounded-xl font-semibold text-ink-600 hover:text-ink-900"
  >
    <ArrowLeft aria-hidden="true" className="h-5 w-5" />
    All students
  </Link>
)

function StarsOf({ stars }) {
  return (
    <span className="inline-flex gap-0.5" aria-label={`${stars} of 3 stars`}>
      {[1, 2, 3].map((n) => (
        <Star
          key={n}
          aria-hidden="true"
          className={`h-4 w-4 ${n <= stars ? 'fill-sun-400 text-sun-400' : 'text-ink-900/15'}`}
        />
      ))}
    </span>
  )
}

// ---- StudentDetail ----
export default function StudentDetail() {
  const { studentId } = useParams()
  const [retryKey, setRetryKey] = useState(0)

  // An unknown id is "not found", not an error.
  const { data, loading, error } = useFetch(
    () =>
      getStudentDetail(studentId).catch((err) =>
        err.message.startsWith('No student') ? null : Promise.reject(err)
      ),
    [studentId, retryKey]
  )
  useDocumentTitle(data?.name ?? 'Student')

  // ---- render ----
  if (loading) {
    return (
      <div className="grid min-h-[50dvh] place-items-center">
        <Spinner size="lg" label="Loading student" />
      </div>
    )
  }

  if (error) {
    return (
      <EmptyState
        icon={TriangleAlert}
        title="Couldn't load this student"
        message={error.message}
        action={
          <Button icon={RotateCcw} onClick={() => setRetryKey((k) => k + 1)}>
            Try again
          </Button>
        }
      />
    )
  }

  if (!data) {
    return (
      <div className="space-y-4">
        {backLink}
        <EmptyState
          icon={UserX}
          title="We can't find that student"
          message="They may have moved class."
        />
      </div>
    )
  }

  const s = data
  const firstName = s.name.split(' ')[0]
  const noScores = s.chapterRows.every((r) => r.best === null)

  return (
    <div className="space-y-6">
      {backLink}

      <header className="flex items-center gap-4">
        <span
          aria-hidden="true"
          className="grid h-16 w-16 shrink-0 place-items-center rounded-full bg-sky-500/10 font-heading text-2xl font-bold text-ink-900"
        >
          {s.name
            .split(' ')
            .map((p) => p[0])
            .join('')}
        </span>
        <div>
          <h1 className="text-3xl">{s.name}</h1>
          <p>Class {s.classId}</p>
        </div>
      </header>

      {s.reasons.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-semibold text-ink-900">Needs attention:</span>
          {s.reasons.map((r) => (
            <ReasonChip key={r.text} reason={r} />
          ))}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile icon={Star} label="Points" value={s.points} note={`Level: ${s.level}`} />
        <StatTile
          icon={Flame}
          label="Streak"
          value={s.streak}
          note={s.streak === 1 ? 'day' : 'days in a row'}
        />
        <StatTile
          icon={BookOpenCheck}
          label="Lessons done"
          value={s.lessonsDone}
          note={`of ${s.chapterRows.reduce((sum, r) => sum + r.lessonsTotal, 0)}`}
        />
        <StatTile
          icon={Award}
          label="Best score"
          value={s.bestScore === null ? null : `${s.bestScore}%`}
          note={s.bestScore === null ? 'No quizzes yet' : `Average of ${s.quizzesTaken} quizzes`}
        />
      </div>

      <section aria-labelledby="badges-heading" className={CARD}>
        <h2 id="badges-heading" className="text-lg">
          Badges
        </h2>
        {s.badges.length === 0 ? (
          <p className="mt-2">{firstName} hasn&apos;t earned a badge yet.</p>
        ) : (
          <ul className="mt-3 flex flex-wrap gap-2">
            {s.badges.map((b) => (
              <li
                key={b.id}
                className="inline-flex items-center gap-2 rounded-full bg-sun-400/20 py-1.5 pl-2 pr-3 text-sm font-semibold text-ink-900"
                title={b.description}
              >
                <BadgeIcon name={b.icon} className="h-4 w-4 text-ember-700" />
                {b.name}
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard
          title="Best score by chapter"
          subtitle="Best attempt on each chapter quiz"
          empty={noScores ? `${firstName} hasn't taken a quiz yet.` : null}
          table={{
            columns: ['Chapter', 'Best score', 'Stars'],
            rows: s.chapterRows.map((r) => [
              r.title,
              r.best === null ? 'Not taken yet' : `${r.best}%`,
              r.best === null ? '–' : r.stars,
            ]),
          }}
        >
          <ChapterScoreChart
            data={s.chapterRows.map((r) => ({
              label: `Ch ${r.number}`,
              title: r.title,
              value: r.best,
            }))}
          />
        </ChartCard>

        <section aria-labelledby="lessons-heading" className={CARD}>
          <h2 id="lessons-heading" className="text-lg">
            Lessons by chapter
          </h2>
          <ul className="mt-4 space-y-4">
            {s.chapterRows.map((r) => (
              <li key={r.chapterId}>
                <ProgressBar
                  label={`${r.number}. ${r.title}`}
                  value={r.lessonsDone}
                  max={r.lessonsTotal}
                  tint={r.tint}
                  showValue
                />
              </li>
            ))}
          </ul>
        </section>
      </div>

      <section aria-labelledby="attempts-heading" className={CARD}>
        <h2 id="attempts-heading" className="text-lg">
          Recent quiz attempts
        </h2>
        {s.recentAttempts.length === 0 ? (
          <p className="mt-2">No quiz attempts yet.</p>
        ) : (
          <ul className="mt-3 divide-y divide-ink-900/5">
            {s.recentAttempts.map((a, i) => (
              <li
                key={`${a.quizId}-${a.date}-${i}`}
                className="flex flex-wrap items-center gap-x-4 gap-y-1 py-3"
              >
                <span className="min-w-0 flex-1 font-semibold text-ink-900">{a.chapterTitle}</span>
                <span className="text-sm">{shortDate(a.date)}</span>
                <span className="w-12 text-right font-semibold tabular-nums text-ink-900">
                  {a.score}%
                </span>
                <StarsOf stars={a.stars} />
                <span className="w-14 text-right text-sm tabular-nums">+{a.points} pts</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
