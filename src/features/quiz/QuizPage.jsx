import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowRight, RotateCcw, TriangleAlert, X } from 'lucide-react'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import EmptyState from '@/components/ui/EmptyState'
import LockedNotice from '@/components/ui/LockedNotice'
import ProgressBar from '@/components/ui/ProgressBar'
import QuestionCard from '@/components/ui/QuestionCard'
import Spinner from '@/components/ui/Spinner'
import { useAuth } from '@/context/AuthContext'
import useDocumentTitle from '@/hooks/useDocumentTitle'
import useFetch from '@/hooks/useFetch'
import useQuiz from '@/hooks/useQuiz'
import useScrollIntoView from '@/hooks/useScrollIntoView'
import { getChapterEntry, isQuizUnlocked } from '@/lib/chapterProgress'
import { answerPoints, quizAttemptPoints, scoreQuiz } from '@/lib/scoring'
import { getChapters, getQuiz } from '@/services/contentService'
import { getProgress, saveQuizAttempt } from '@/services/progressService'

export default function QuizPage() {
  const { quizId } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()

  // ---- state ----
  const [retryKey, setRetryKey] = useState(0)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState(null)

  const { data, loading, error } = useFetch(
    () => Promise.all([getQuiz(quizId).catch(() => null), getChapters(), getProgress(user.id)]),
    [quizId, user.id, retryKey]
  )
  const quiz = data?.[0] ?? null
  const run = useQuiz(quiz)
  const nextRef = useScrollIntoView(run.currentAnswered)

  const chapter = data?.[1].find((c) => c.id === quiz?.chapterId)
  useDocumentTitle(chapter ? `${chapter.title} quiz` : 'Quiz')

  // ---- render: loading / error / not found / locked ----
  if (loading) {
    return (
      <div className="grid min-h-[50dvh] place-items-center">
        <Spinner size="lg" label="Loading quiz" />
      </div>
    )
  }

  if (error) {
    return (
      <EmptyState
        icon={TriangleAlert}
        title="Couldn't load this quiz"
        message={error.message}
        action={
          <Button icon={RotateCcw} onClick={() => setRetryKey((k) => k + 1)}>
            Try again
          </Button>
        }
      />
    )
  }

  const [, chapters, progress] = data

  if (!quiz || !chapter) {
    return (
      <EmptyState
        title="We can't find that quiz"
        message="It might have moved."
        action={
          <Button as={Link} to="/student/learn">
            Back to map
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

  // Same guard as a locked chapter: the quiz opens only after every lesson.
  if (!isQuizUnlocked(chapter, progress)) {
    return (
      <LockedNotice
        title="This quiz isn't open yet"
        message={`Finish all ${chapter.lessonIds.length} lessons in ${chapter.title} first.`}
        backTo={`/student/learn/${chapter.id}`}
        backLabel="Back to chapter"
      />
    )
  }

  if (quiz.questions.length === 0) {
    return <EmptyState title="This quiz has no questions yet" message="Check back soon." />
  }

  // ---- handlers ----
  async function handleNext() {
    if (!run.isLast) {
      run.next()
      return
    }

    const outcomes = run.outcomes
    const { score, stars } = scoreQuiz(outcomes)
    const previousAttempts = progress.quizAttempts.filter((a) => a.quizId === quiz.id)
    const { total } = quizAttemptPoints({
      outcomes,
      previousAttempts,
      questionCount: quiz.questions.length,
    })

    setSaving(true)
    setSaveError(null)
    try {
      await saveQuizAttempt(user.id, {
        quizId: quiz.id,
        score,
        stars,
        points: total,
        answerPoints: answerPoints(outcomes),
        answers: run.answers.map((a, i) => ({ questionId: quiz.questions[i].id, ...a })),
      })
      navigate(`/student/quiz/${quiz.id}/result`, { replace: true })
    } catch (err) {
      setSaveError(err.message)
      setSaving(false)
    }
  }

  function handleQuit(e) {
    const started = run.answers.length > 0
    if (started && !window.confirm("Leave the quiz? Your answers so far won't be saved.")) {
      e.preventDefault()
    }
  }

  // ---- render: content ----
  return (
    <div className="mx-auto max-w-xl">
      <div className="flex items-center gap-3">
        <Link
          to={`/student/learn/${chapter.id}`}
          onClick={handleQuit}
          aria-label="Leave quiz"
          className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl text-ink-600 hover:bg-ink-900/5 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ember-500/40"
        >
          <X aria-hidden="true" className="h-6 w-6" />
        </Link>
        <ProgressBar
          className="flex-1"
          value={run.index + (run.currentAnswered ? 1 : 0)}
          max={run.total}
          tint={chapter.tint}
          size="lg"
          label={`Question ${run.index + 1} of ${run.total}`}
        />
      </div>

      <p className="mt-5 text-sm font-semibold uppercase tracking-widest text-ink-600">
        {chapter.title} quiz
      </p>

      <Card tint={chapter.tint} className="mt-2">
        <QuestionCard key={run.question.id} question={run.question} onResolved={run.answered} />
      </Card>

      {saveError && (
        <p role="alert" className="mt-4 font-semibold text-berry-600">
          Couldn&apos;t save your score. {saveError}
        </p>
      )}

      {/* scroll-mb keeps the button clear of the bottom tab bar on phones */}
      <div ref={nextRef} className="scroll-mb-28 md:scroll-mb-8">
        {run.currentAnswered && (
          <Button
            size="lg"
            fullWidth
            className="mt-6"
            iconRight={ArrowRight}
            onClick={handleNext}
            loading={saving}
          >
            {run.isLast ? 'See my score' : 'Next question'}
          </Button>
        )}
      </div>
    </div>
  )
}
