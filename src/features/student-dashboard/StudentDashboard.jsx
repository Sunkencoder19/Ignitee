import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowRight,
  Award,
  Flame,
  Map as MapIcon,
  RotateCcw,
  Star,
  TriangleAlert,
} from 'lucide-react'
import BadgeIcon from '@/components/ui/BadgeIcon'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import EmptyState from '@/components/ui/EmptyState'
import ProgressBar from '@/components/ui/ProgressBar'
import Spinner from '@/components/ui/Spinner'
import { useAuth } from '@/context/AuthContext'
import { useProgress } from '@/context/ProgressContext'
import useDocumentTitle from '@/hooks/useDocumentTitle'
import useFetch from '@/hooks/useFetch'
import { todayISO } from '@/lib/format'
import { currentStreak } from '@/lib/scoring'
import {
  activityStrip,
  isBrandNew,
  levelProgress,
  nextStep,
  recentBadges,
} from '@/lib/studentStats'
import { getTint } from '@/lib/tints'
import { getLesson } from '@/services/contentService'

// ---- FirstLessonArt ----
// A small drawing for a brand-new student: an open book with a flame above it.
// Drawn with palette classes, so it follows the theme like everything else.
function FirstLessonArt() {
  return (
    <svg viewBox="0 0 160 120" aria-hidden="true" className="h-32 w-40">
      <ellipse cx="80" cy="108" rx="58" ry="7" className="fill-ink-900/5" />
      <path
        d="M80 40 C60 30 35 32 22 38 V98 C35 92 60 92 80 102 Z"
        className="fill-paper stroke-ink-900"
        strokeWidth="3"
        strokeLinejoin="round"
      />
      <path
        d="M80 40 C100 30 125 32 138 38 V98 C125 92 100 92 80 102 Z"
        className="fill-paper stroke-ink-900"
        strokeWidth="3"
        strokeLinejoin="round"
      />
      <path d="M80 40 V102" className="stroke-ink-900" strokeWidth="3" />
      <path
        d="M34 54 H66 M34 66 H62 M94 54 H126 M98 66 H126"
        className="stroke-sky-500"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <path
        d="M80 6 C84 16 94 20 94 30 A14 14 0 0 1 66 30 C66 24 70 20 73 17 C74 21 76 23 78 24 C77 18 78 11 80 6 Z"
        className="fill-ember-500"
      />
      <path
        d="M80 20 C82 25 87 27 87 31 A7 7 0 0 1 73 31 C73 28 75 26 77 25 C78 27 79 28 80 28 Z"
        className="fill-sun-400"
      />
    </svg>
  )
}

// ---- ContinueCard ----
// The most important thing on the page: one big button to the next step.
function ContinueCard({ step, lessonTitle }) {
  const tint = getTint(step.chapter.tint)
  const quizTo = `/student/quiz/${step.chapter.quizId}`

  const copy = {
    lesson: {
      eyebrow: 'Continue where you left off',
      title: lessonTitle ?? 'Your next lesson',
      detail: step.chapter.title,
      to: `/student/learn/${step.chapter.id}/${step.lessonId}`,
      button: 'Continue lesson',
    },
    quiz: {
      eyebrow: 'Ready for the quiz',
      title: `${step.chapter.title} quiz`,
      detail: 'You finished every lesson. Show what you know!',
      to: quizTo,
      button: 'Take the quiz',
    },
    improve: {
      eyebrow: 'Every open chapter done',
      title: `Go for 3 stars on ${step.chapter.title}`,
      detail: `You have ${step.stars} ${step.stars === 1 ? 'star' : 'stars'} there so far.`,
      to: quizTo,
      button: 'Try the quiz again',
    },
    'all-done': {
      eyebrow: 'Amazing',
      title: 'You have 3 stars on every open chapter!',
      detail: 'New chapters are coming soon.',
      to: '/student/learn',
      button: 'See the chapter map',
    },
  }[step.kind]

  return (
    <Card tint={step.chapter.tint} className="p-6 md:p-8">
      <p className={`font-heading text-sm font-semibold uppercase tracking-widest ${tint.text}`}>
        {copy.eyebrow}
      </p>
      <h2 className="mt-1 text-2xl md:text-3xl">{copy.title}</h2>
      <p className="mt-1 text-lg">{copy.detail}</p>
      <Button
        as={Link}
        to={copy.to}
        size="lg"
        fullWidth
        iconRight={ArrowRight}
        className="mt-6 md:w-auto"
      >
        {copy.button}
      </Button>
    </Card>
  )
}

// ---- ActivityStrip ----
function ActivityStrip({ days }) {
  const activeCount = days.filter((d) => d.active).length
  return (
    <Card>
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="text-lg">This week</h2>
        <p className="text-sm">
          {activeCount} of {days.length} days
        </p>
      </div>
      <ol className="mt-4 grid grid-cols-7 gap-1 text-center">
        {days.map((d) => (
          <li key={d.date} className="flex flex-col items-center gap-1.5">
            <span
              className={[
                'grid h-9 w-9 place-items-center rounded-full',
                d.active ? 'bg-ember-500 text-white' : 'bg-ink-900/5 text-ink-600',
                d.isToday ? 'ring-2 ring-ink-900 ring-offset-2' : '',
              ].join(' ')}
            >
              {d.active && <Flame aria-hidden="true" className="h-4 w-4" />}
            </span>
            <span
              aria-hidden="true"
              className={`text-xs ${d.isToday ? 'font-bold text-ink-900' : ''}`}
            >
              {d.initial}
            </span>
            <span className="sr-only">
              {d.isToday ? `Today (${d.name})` : d.name}: {d.active ? 'you learned' : 'no activity'}
            </span>
          </li>
        ))}
      </ol>
    </Card>
  )
}

// ---- StudentDashboard ----
export default function StudentDashboard() {
  useDocumentTitle('Home')
  const { user } = useAuth()
  const { progress, status, error, chapters, badges, reload } = useProgress()
  const ready = status === 'ready'
  const today = todayISO()

  // ---- derived ----
  const step = useMemo(
    () => (ready ? nextStep(chapters, progress) : null),
    [ready, chapters, progress]
  )
  const { data: lesson } = useFetch(
    () => (step?.kind === 'lesson' ? getLesson(step.lessonId) : Promise.resolve(null)),
    [step?.kind, step?.lessonId]
  )

  // ---- render ----
  if (status === 'idle' || status === 'loading') {
    return (
      <div className="grid min-h-[50dvh] place-items-center">
        <Spinner size="lg" label="Loading your dashboard" />
      </div>
    )
  }

  if (status === 'error') {
    return (
      <EmptyState
        icon={TriangleAlert}
        title="Couldn't load your progress"
        message={error}
        action={
          <Button icon={RotateCcw} onClick={reload}>
            Try again
          </Button>
        }
      />
    )
  }

  const firstName = user.firstName

  if (isBrandNew(progress)) {
    return (
      <div className="mx-auto max-w-xl">
        <Card className="flex flex-col items-center py-10 text-center">
          <FirstLessonArt />
          <h1 className="mt-4 text-3xl">Hi {firstName}! Let&apos;s start.</h1>
          <p className="mt-2 max-w-xs text-lg">
            Your first lesson takes about five minutes. You&apos;ll earn your first points and your
            first badge.
          </p>
          {step?.kind === 'lesson' && (
            <Button
              as={Link}
              to={`/student/learn/${step.chapter.id}/${step.lessonId}`}
              size="lg"
              iconRight={ArrowRight}
              className="mt-6"
            >
              Start your first lesson
            </Button>
          )}
        </Card>
      </div>
    )
  }

  const level = levelProgress(progress.points)
  const streak = currentStreak(progress, today)
  const days = activityStrip(progress, today)
  const recent = recentBadges(progress, badges)

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <header>
        <h1 className="text-3xl">Hi {firstName}!</h1>
        <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-lg">
          <span className="inline-flex items-center gap-1 font-semibold text-ink-900">
            <Star aria-hidden="true" className="h-5 w-5 fill-sun-400 text-sun-400" />
            {progress.points} points
          </span>
          <span aria-hidden="true">·</span>
          <span>
            Level <span className="font-semibold text-ink-900">{level.name}</span>
          </span>
          <span aria-hidden="true">·</span>
          <span className="inline-flex items-center gap-1">
            <Flame aria-hidden="true" className="h-5 w-5 text-ember-500" />
            {streak} day streak
          </span>
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
      </header>

      {step && <ContinueCard step={step} lessonTitle={lesson?.title} />}

      <div className="grid gap-5 md:grid-cols-2">
        <ActivityStrip days={days} />

        <Card>
          <div className="flex items-baseline justify-between gap-2">
            <h2 className="text-lg">Recent badges</h2>
            <Link to="/student/profile" className="text-sm font-semibold text-ink-900 underline">
              See all
            </Link>
          </div>
          {recent.length === 0 ? (
            <p className="mt-4 flex items-center gap-2">
              <Award aria-hidden="true" className="h-5 w-5 shrink-0 text-ink-600" />
              Your first badge is one lesson away.
            </p>
          ) : (
            <ul className="mt-4 space-y-2">
              {recent.map((b) => (
                <li key={b.id} className="flex items-center gap-3">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-sun-400/20">
                    <BadgeIcon name={b.icon} className="h-5 w-5 text-ember-700" />
                  </span>
                  <span>
                    <span className="block font-semibold text-ink-900">{b.name}</span>
                    <span className="block text-sm">{b.description}</span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <Link
        to="/student/learn"
        className="flex min-h-tap items-center justify-center gap-2 rounded-2xl font-semibold text-ink-900 hover:bg-ink-900/5"
      >
        <MapIcon aria-hidden="true" className="h-5 w-5" />
        Open the chapter map
      </Link>
    </div>
  )
}
