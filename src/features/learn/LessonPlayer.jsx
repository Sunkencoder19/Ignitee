import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Flame,
  Lightbulb,
  PartyPopper,
  Pencil,
  RotateCcw,
  Star,
  TriangleAlert,
  X,
} from 'lucide-react'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import EmptyState from '@/components/ui/EmptyState'
import LockedNotice from '@/components/ui/LockedNotice'
import ProgressBar from '@/components/ui/ProgressBar'
import QuestionCard from '@/components/ui/QuestionCard'
import Spinner from '@/components/ui/Spinner'
import { useProgress } from '@/context/ProgressContext'
import useDocumentTitle from '@/hooks/useDocumentTitle'
import useFetch from '@/hooks/useFetch'
import useScrollIntoView from '@/hooks/useScrollIntoView'
import { getChapterEntry, isQuizUnlocked } from '@/lib/chapterProgress'
import { getTint } from '@/lib/tints'
import { getChapters, getLesson } from '@/services/contentService'

const STEP_LABELS = {
  explain: { label: 'Learn', icon: BookOpen },
  example: { label: 'Example', icon: Lightbulb },
  activity: { label: 'Try it', icon: Pencil },
}

// ---- FinishScreen ----
// Kept in this file: only the lesson player shows it.
function FinishScreen({ lesson, chapter, event, nextLessonId, quizReady }) {
  let primary = { to: `/student/learn/${chapter.id}`, label: 'Back to chapter' }
  if (nextLessonId) {
    primary = { to: `/student/learn/${chapter.id}/${nextLessonId}`, label: 'Next lesson' }
  } else if (quizReady) {
    primary = { to: `/student/quiz/${chapter.quizId}`, label: 'Take the chapter quiz' }
  }
  const lessonPoints = event?.lessonPoints ?? 0
  const streakPoints = event?.streakPoints ?? 0

  return (
    <div className="mx-auto max-w-xl">
      <Card className="text-center">
        <span className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-leaf-600/10">
          <PartyPopper aria-hidden="true" className="h-10 w-10 text-leaf-600" />
        </span>
        <h1 className="mt-4 text-3xl">Nice! You finished it.</h1>
        <p className="mt-1 text-lg">{lesson.title}</p>

        <div className="mt-5 flex flex-col items-center gap-2">
          {lessonPoints > 0 ? (
            <p className="inline-flex items-center gap-2 rounded-full bg-sun-400/20 px-4 py-2 font-heading text-xl font-bold text-ink-900">
              <Star aria-hidden="true" className="h-6 w-6 fill-sun-400 text-sun-400" />+
              {lessonPoints} points
            </p>
          ) : (
            <p>You had already finished this one, so no new lesson points. Great practice!</p>
          )}
          {streakPoints > 0 && (
            <p className="inline-flex items-center gap-2 rounded-full bg-ember-500/10 px-4 py-2 font-heading text-lg font-bold text-ink-900">
              <Flame aria-hidden="true" className="h-5 w-5 text-ember-500" />
              Day {event.streakDay} streak: +{streakPoints}
            </p>
          )}
        </div>

        <div className="mt-6 flex flex-col gap-3">
          <Button as={Link} to={primary.to} size="lg" fullWidth iconRight={ArrowRight}>
            {primary.label}
          </Button>
          {primary.to !== `/student/learn/${chapter.id}` && (
            <Button as={Link} to={`/student/learn/${chapter.id}`} variant="ghost" fullWidth>
              Back to chapter
            </Button>
          )}
        </div>
      </Card>
    </div>
  )
}

// ---- LessonPlayer ----
// "Next lesson" changes only the URL param, but StudentLayout keys its
// ErrorBoundary by pathname, so this remounts with fresh step state.
export default function LessonPlayer() {
  const { chapterId, lessonId } = useParams()
  const {
    progress,
    status: progressStatus,
    error: progressError,
    lastEvent,
    completeLesson,
    reload,
  } = useProgress()

  // ---- state ----
  const [retryKey, setRetryKey] = useState(0)
  const [stepIndex, setStepIndex] = useState(0)
  const [activityDone, setActivityDone] = useState(false)
  const [finished, setFinished] = useState(false)
  const nextRef = useScrollIntoView(activityDone)

  const { data, loading, error } = useFetch(
    () => Promise.all([getLesson(lessonId).catch(() => null), getChapters()]),
    [lessonId, retryKey]
  )
  const busy = loading || progressStatus === 'idle' || progressStatus === 'loading'
  const failed = error ?? (progressStatus === 'error' ? new Error(progressError) : null)
  function retry() {
    setRetryKey((k) => k + 1)
    if (progressStatus === 'error') reload()
  }

  const lesson = data?.[0]
  useDocumentTitle(lesson?.title ?? 'Lesson')

  // ---- render: loading / error / not found / locked ----
  if (busy) {
    return (
      <div className="grid min-h-[50dvh] place-items-center">
        <Spinner size="lg" label="Loading lesson" />
      </div>
    )
  }

  if (failed) {
    return (
      <EmptyState
        icon={TriangleAlert}
        title="Couldn't load this lesson"
        message={failed.message}
        action={
          <Button icon={RotateCcw} onClick={retry}>
            Try again
          </Button>
        }
      />
    )
  }

  const [, chapters] = data
  const chapter = chapters.find((c) => c.id === chapterId)

  if (!lesson || !chapter || lesson.chapterId !== chapter.id) {
    return (
      <EmptyState
        title="We can't find that lesson"
        message="It might have moved."
        action={
          <Button as={Link} to={chapter ? `/student/learn/${chapter.id}` : '/student/learn'}>
            {chapter ? 'Back to chapter' : 'Back to map'}
          </Button>
        }
      />
    )
  }

  const entry = getChapterEntry(chapter.id, chapters, progress)
  if (entry?.state === 'locked') {
    return (
      <LockedNotice
        title={`${chapter.title} isn't open yet`}
        message={entry.lockedReason}
        backTo="/student/learn"
        backLabel="Back to map"
      />
    )
  }

  if (lesson.steps.length === 0) {
    return <EmptyState title="This lesson is empty" message="Check back soon." />
  }

  if (finished) {
    const position = chapter.lessonIds.indexOf(lesson.id)
    const event =
      lastEvent?.type === 'LESSON_COMPLETED' && lastEvent.lessonId === lesson.id ? lastEvent : null
    return (
      <FinishScreen
        lesson={lesson}
        chapter={chapter}
        event={event}
        nextLessonId={chapter.lessonIds[position + 1] ?? null}
        quizReady={Boolean(chapter.quizId) && isQuizUnlocked(chapter, progress)}
      />
    )
  }

  // ---- handlers ----
  const step = lesson.steps[stepIndex]
  const isLast = stepIndex === lesson.steps.length - 1
  const needsAnswer = step.type === 'activity' && step.question && !activityDone

  // Finishing is one dispatch: ProgressContext adds the lesson, points and
  // streak, saves, checks badges, and the header pill updates straight away.
  function handleNext() {
    if (!isLast) {
      setStepIndex((i) => i + 1)
      setActivityDone(false)
      return
    }
    completeLesson(lesson.id)
    setFinished(true)
  }

  // ---- render: content ----
  const tint = getTint(chapter.tint)
  const { label, icon: StepIcon } = STEP_LABELS[step.type] ?? STEP_LABELS.explain

  return (
    <div className="mx-auto max-w-xl">
      <div className="flex items-center gap-3">
        <Link
          to={`/student/learn/${chapter.id}`}
          aria-label="Close lesson"
          className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl text-ink-600 hover:bg-ink-900/5 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ember-500/40"
        >
          <X aria-hidden="true" className="h-6 w-6" />
        </Link>
        <ProgressBar
          className="flex-1"
          value={stepIndex + 1}
          max={lesson.steps.length}
          tint={chapter.tint}
          size="lg"
          label={`Step ${stepIndex + 1} of ${lesson.steps.length}`}
        />
      </div>

      <p className="mt-5 text-sm font-semibold uppercase tracking-widest text-ink-600">
        {lesson.title}
      </p>

      <Card tint={chapter.tint} className="mt-2">
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 font-heading text-sm font-bold ${tint.soft} ${tint.text}`}
        >
          <StepIcon aria-hidden="true" className="h-4 w-4" />
          {label}
        </span>
        <p className="mt-4 text-xl leading-relaxed text-ink-900">{step.text}</p>

        {step.type === 'activity' && step.question && (
          <div className="mt-6 border-t border-ink-900/10 pt-6">
            <QuestionCard
              key={step.question.id}
              question={step.question}
              onResolved={() => setActivityDone(true)}
            />
          </div>
        )}
      </Card>

      {/* scroll-mb keeps the button clear of the bottom tab bar on phones */}
      <div ref={nextRef} className="scroll-mb-28 md:scroll-mb-8">
        {!needsAnswer && (
          <Button
            size="lg"
            fullWidth
            className="mt-6"
            iconRight={isLast ? undefined : ArrowRight}
            onClick={handleNext}
          >
            {isLast ? 'Finish lesson' : 'Next'}
          </Button>
        )}
      </div>
      {stepIndex > 0 && (
        <Button
          variant="ghost"
          fullWidth
          className="mt-3"
          icon={ArrowLeft}
          onClick={() => {
            setStepIndex((i) => i - 1)
            setActivityDone(false)
          }}
        >
          Back
        </Button>
      )}
    </div>
  )
}
