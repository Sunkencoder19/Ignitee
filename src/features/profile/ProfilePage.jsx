import {
  BookOpenCheck,
  CircleCheck,
  ClipboardCheck,
  Flame,
  Lock,
  RotateCcw,
  Target,
  TriangleAlert,
} from 'lucide-react'
import Avatar from '@/components/ui/Avatar'
import BadgeIcon from '@/components/ui/BadgeIcon'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import EmptyState from '@/components/ui/EmptyState'
import ProgressBar from '@/components/ui/ProgressBar'
import Spinner from '@/components/ui/Spinner'
import StatTile from '@/components/ui/StatTile'
import { useAuth } from '@/context/AuthContext'
import { useProgress } from '@/context/ProgressContext'
import useDocumentTitle from '@/hooks/useDocumentTitle'
import { levelProgress, profileStats } from '@/lib/studentStats'

// ---- BadgeShelf ----
// Earned badges in colour; locked ones as outlines that say how to earn them.
function BadgeShelf({ badges, earnedIds }) {
  const earnedCount = badges.filter((b) => earnedIds.includes(b.id)).length

  return (
    <section aria-labelledby="shelf-heading">
      <div className="flex items-baseline justify-between gap-2">
        <h2 id="shelf-heading" className="text-2xl">
          Badges
        </h2>
        <p className="font-semibold text-ink-900">
          {earnedCount} of {badges.length}
        </p>
      </div>
      <ul className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {badges.map((b) => {
          const earned = earnedIds.includes(b.id)
          return (
            <li
              key={b.id}
              className={[
                'flex flex-col items-center rounded-2xl p-4 text-center',
                earned
                  ? 'bg-paper shadow-soft ring-2 ring-sun-400'
                  : 'border-2 border-dashed border-ink-900/20 bg-transparent',
              ].join(' ')}
            >
              <span
                className={[
                  'grid h-14 w-14 place-items-center rounded-full',
                  earned ? 'bg-sun-400/25' : 'bg-ink-900/5',
                ].join(' ')}
              >
                <BadgeIcon
                  name={b.icon}
                  className={`h-7 w-7 ${earned ? 'text-ember-700' : 'text-ink-600/60'}`}
                />
              </span>
              <p
                className={`mt-2 font-heading font-bold ${earned ? 'text-ink-900' : 'text-ink-600'}`}
              >
                {b.name}
              </p>
              <p className="mt-0.5 text-sm">{b.description}</p>
              <p
                className={`mt-2 inline-flex items-center gap-1 text-xs font-semibold ${earned ? 'text-ink-900' : 'text-ink-600'}`}
              >
                {/* Green icon, dark words: leaf-600 text is too faint at this size */}
                {earned ? (
                  <>
                    <CircleCheck aria-hidden="true" className="h-3.5 w-3.5 text-leaf-600" />
                    Earned
                  </>
                ) : (
                  <>
                    <Lock aria-hidden="true" className="h-3.5 w-3.5" />
                    Not yet
                  </>
                )}
              </p>
            </li>
          )
        })}
      </ul>
    </section>
  )
}

// ---- ProfilePage ----
export default function ProfilePage() {
  useDocumentTitle('My profile')
  const { user } = useAuth()
  const { progress, status, error, chapters, badges, reload } = useProgress()

  // ---- render ----
  if (status === 'idle' || status === 'loading') {
    return (
      <div className="grid min-h-[50dvh] place-items-center">
        <Spinner size="lg" label="Loading your profile" />
      </div>
    )
  }

  if (status === 'error') {
    return (
      <EmptyState
        icon={TriangleAlert}
        title="Couldn't load your profile"
        message={error}
        action={
          <Button icon={RotateCcw} onClick={reload}>
            Try again
          </Button>
        }
      />
    )
  }

  const stats = profileStats(progress, chapters)
  const level = levelProgress(progress.points)

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Card className="flex flex-col items-center gap-4 text-center sm:flex-row sm:text-left">
        <Avatar name={user.name} size="lg" className="bg-ember-500/15" />
        <div className="w-full min-w-0 flex-1">
          <h1 className="text-3xl">{user.name}</h1>
          <p>
            Class {user.classId} · Level{' '}
            <span className="font-semibold text-ink-900">{level.name}</span> · {progress.points}{' '}
            points
          </p>
          <ProgressBar
            className="mt-3"
            value={level.intoLevel}
            max={level.levelSize}
            size="sm"
            label={
              level.nextName
                ? `${level.pointsToNext} points to ${level.nextName}`
                : 'Top level reached'
            }
          />
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile
          accent="text-ember-500"
          icon={BookOpenCheck}
          label="Lessons"
          value={stats.lessonsDone}
          note={`of ${stats.lessonsTotal} done`}
        />
        <StatTile
          accent="text-ember-500"
          icon={ClipboardCheck}
          label="Quizzes"
          value={stats.quizAttempts}
          note={
            stats.quizAttempts === 0
              ? 'None taken yet'
              : `${stats.quizzesPassed} ${stats.quizzesPassed === 1 ? 'chapter' : 'chapters'} passed`
          }
        />
        <StatTile
          accent="text-ember-500"
          icon={Target}
          label="Average quiz score"
          value={stats.averageScore === null ? null : `${stats.averageScore}%`}
          note={stats.averageScore === null ? 'Take a quiz to see it' : 'Across all your tries'}
        />
        <StatTile
          accent="text-ember-500"
          icon={Flame}
          label="Best streak"
          value={stats.bestStreak}
          note={stats.bestStreak === 1 ? 'day' : 'days in a row'}
        />
      </div>

      <BadgeShelf badges={badges} earnedIds={progress.badges} />
    </div>
  )
}
