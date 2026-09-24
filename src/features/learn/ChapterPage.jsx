import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  Check,
  CircleDashed,
  Lock,
  Play,
  RotateCcw,
  Star,
  TriangleAlert,
} from 'lucide-react'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import EmptyState from '@/components/ui/EmptyState'
import ProgressBar from '@/components/ui/ProgressBar'
import Spinner from '@/components/ui/Spinner'
import { useAuth } from '@/context/AuthContext'
import useDocumentTitle from '@/hooks/useDocumentTitle'
import useFetch from '@/hooks/useFetch'
import {
  getBestQuizStars,
  getChapterMapEntries,
  getLessonStates,
  isQuizUnlocked,
} from '@/lib/chapterProgress'
import { getTint } from '@/lib/tints'
import { getChapterDetail, getChapters } from '@/services/contentService'
import { getProgress } from '@/services/progressService'

// ---- LessonRow ----
// Kept in this file, not its own component: only this page uses it.
function LessonRow({ lesson, chapterId, state, tint }) {
  const badge = {
    done: (
      <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-full ${tint.solid}`}>
        <Check aria-hidden="true" className="h-5 w-5 text-white" />
      </span>
    ),
    next: (
      <span
        className={`grid h-10 w-10 shrink-0 place-items-center rounded-full ${tint.soft} ring-2 ${tint.ring}`}
      >
        <Play aria-hidden="true" className={`h-4 w-4 ${tint.text}`} />
      </span>
    ),
    'not-started': (
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-ink-900/5">
        <CircleDashed aria-hidden="true" className="h-5 w-5 text-ink-600" />
      </span>
    ),
  }[state]

  const statusText = { done: 'Done', next: 'Up next', 'not-started': 'Not started' }[state]

  return (
    <Link
      to={`/student/learn/${chapterId}/${lesson.id}`}
      className={[
        'flex min-h-tap items-center gap-3 rounded-2xl bg-paper p-3 shadow-soft transition',
        'hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ember-500/40',
        state === 'next' ? `ring-2 ${tint.ring}` : '',
      ].join(' ')}
    >
      {badge}
      <span className="min-w-0 flex-1">
        <span className="block truncate font-heading font-semibold text-ink-900">
          {lesson.title}
        </span>
        <span className="text-sm">{statusText}</span>
      </span>
    </Link>
  )
}

// ---- QuizCard ----
// Kept in this file, not its own component: only this page uses it.
function QuizCard({ quiz, unlocked, stars, tint }) {
  if (!unlocked) {
    return (
      <Card className="mt-6 flex items-center gap-3 opacity-80">
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-ink-900/5">
          <Lock aria-hidden="true" className="h-5 w-5 text-ink-600" />
        </span>
        <div>
          <p className="font-heading font-semibold text-ink-900">Chapter quiz</p>
          <p className="text-sm">Finish all the lessons above to unlock it.</p>
        </div>
      </Card>
    )
  }

  return (
    <Card tint={tint.name} className="mt-6">
      <div className="flex items-center gap-3">
        <span className={`grid h-12 w-12 shrink-0 place-items-center rounded-xl ${tint.soft}`}>
          <Star aria-hidden="true" className={`h-6 w-6 ${tint.text}`} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-heading font-semibold text-ink-900">Chapter quiz</p>
          <p className="text-sm">{quiz.questions.length} questions</p>
        </div>
        {stars > 0 && (
          <div className="flex gap-0.5" aria-label={`Best score: ${stars} stars`}>
            {[1, 2, 3].map((n) => (
              <Star
                key={n}
                aria-hidden="true"
                className={`h-5 w-5 ${n <= stars ? 'fill-sun-400 text-sun-400' : 'text-ink-900/15'}`}
              />
            ))}
          </div>
        )}
      </div>
      <Button as={Link} to={`/student/quiz/${quiz.id}`} fullWidth className="mt-4">
        {stars > 0 ? 'Retake quiz' : 'Start quiz'}
      </Button>
    </Card>
  )
}

// ---- ChapterPage ----
export default function ChapterPage() {
  const { chapterId } = useParams()
  const { user } = useAuth()
  const [retryKey, setRetryKey] = useState(0)

  const { data, loading, error } = useFetch(
    () =>
      Promise.all([
        getChapterDetail(chapterId).catch(() => null),
        getChapters(),
        getProgress(user.id),
      ]),
    [chapterId, user.id, retryKey]
  )

  useDocumentTitle(data?.[0]?.chapter.title ?? 'Chapter')

  // ---- render ----
  if (loading) {
    return (
      <div className="grid min-h-[50dvh] place-items-center">
        <Spinner size="lg" label="Loading chapter" />
      </div>
    )
  }

  if (error) {
    return (
      <EmptyState
        icon={TriangleAlert}
        title="Couldn't load this chapter"
        message={error.message}
        action={
          <Button icon={RotateCcw} onClick={() => setRetryKey((k) => k + 1)}>
            Try again
          </Button>
        }
      />
    )
  }

  const [detail, allChapters, progress] = data

  if (!detail) {
    return (
      <EmptyState
        title="We can't find that chapter"
        message="It might have moved."
        action={
          <Button as={Link} to="/student/learn" icon={ArrowLeft}>
            Back to map
          </Button>
        }
      />
    )
  }

  const { chapter, lessons, quiz } = detail
  const mapEntry = getChapterMapEntries(allChapters, progress).find(
    (e) => e.chapter.id === chapter.id
  )
  const tint = { ...getTint(chapter.tint), name: chapter.tint }

  // Guard against opening a locked chapter straight from the URL.
  if (mapEntry?.state === 'locked') {
    return (
      <EmptyState
        icon={Lock}
        title={`${chapter.title} isn't open yet`}
        message={mapEntry.lockedReason}
        action={
          <Button as={Link} to="/student/learn" icon={ArrowLeft}>
            Back to map
          </Button>
        }
      />
    )
  }

  if (lessons.length === 0) {
    return <EmptyState title="No lessons in this chapter yet" message="Check back soon." />
  }

  const lessonStates = getLessonStates(chapter, progress)
  const doneCount = lessonStates.filter((l) => l.state === 'done').length
  const quizUnlocked = isQuizUnlocked(chapter, progress)
  const stars = quiz ? getBestQuizStars(quiz.id, progress) : 0

  return (
    <div className="mx-auto max-w-xl">
      <Link
        to="/student/learn"
        className="inline-flex min-h-tap items-center gap-1 rounded-xl px-1 font-semibold text-ink-600 hover:text-ink-900"
      >
        <ArrowLeft aria-hidden="true" className="h-5 w-5" />
        Chapter map
      </Link>

      <p
        className={`mt-2 font-heading text-sm font-semibold uppercase tracking-widest ${tint.text}`}
      >
        Chapter {chapter.number}
      </p>
      <h1 className="text-3xl">{chapter.title}</h1>
      <ProgressBar
        className="mt-4"
        value={doneCount}
        max={lessons.length}
        tint={chapter.tint}
        label="Lessons"
        showValue
      />

      <div className="mt-6 flex flex-col gap-3">
        {lessons.map((lesson) => (
          <LessonRow
            key={lesson.id}
            lesson={lesson}
            chapterId={chapter.id}
            tint={tint}
            state={lessonStates.find((l) => l.lessonId === lesson.id)?.state ?? 'not-started'}
          />
        ))}
      </div>

      {quiz && <QuizCard quiz={quiz} unlocked={quizUnlocked} stars={stars} tint={tint} />}
    </div>
  )
}
