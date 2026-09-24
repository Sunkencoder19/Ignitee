import { useState } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import {
  ArrowRight,
  Check,
  Lightbulb,
  PartyPopper,
  RotateCcw,
  Star,
  TriangleAlert,
  Unlock,
} from 'lucide-react'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import EmptyState from '@/components/ui/EmptyState'
import LockedNotice from '@/components/ui/LockedNotice'
import Spinner from '@/components/ui/Spinner'
import { useAuth } from '@/context/AuthContext'
import useDocumentTitle from '@/hooks/useDocumentTitle'
import useFetch from '@/hooks/useFetch'
import { getChapterEntry } from '@/lib/chapterProgress'
import { quizAttemptPoints } from '@/lib/scoring'
import { getChapters, getQuiz } from '@/services/contentService'
import { getProgress } from '@/services/progressService'

const HEADLINES = {
  3: 'Brilliant! 3 stars.',
  2: 'Great work!',
  1: 'Good job, you passed!',
  0: "Nice try! Let's have another go.",
}

function formatGiven(given) {
  if (Array.isArray(given)) return given.join(', ')
  return given || '(no answer)'
}

// ---- StarRow ----
function StarRow({ stars }) {
  return (
    <div className="flex justify-center gap-2" aria-label={`${stars} out of 3 stars`}>
      {[1, 2, 3].map((n) => (
        <Star
          key={n}
          aria-hidden="true"
          className={`h-14 w-14 ${n <= stars ? 'fill-sun-400 text-sun-400' : 'text-ink-900/15'}`}
        />
      ))}
    </div>
  )
}

// ---- MistakeItem ----
function MistakeItem({ question, answer }) {
  const correctAnswer = Array.isArray(question.answer)
    ? question.answer.join(', ')
    : question.answer

  return (
    <li className="rounded-2xl bg-paper p-4 shadow-soft">
      <p className="font-heading font-semibold text-ink-900">{question.prompt}</p>
      {answer.outcome === 'hint' ? (
        <p className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-sky-500/10 px-3 py-1 text-sm font-semibold text-ink-900">
          <Lightbulb aria-hidden="true" className="h-4 w-4 text-sky-500" />
          Right after the hint
        </p>
      ) : (
        <p className="mt-2 text-amber-700">
          You said: <span className="font-semibold">{formatGiven(answer.given)}</span>
        </p>
      )}
      <p className="mt-2 flex items-start gap-1.5 text-ink-900">
        <Check aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-leaf-600" />
        <span>
          Answer: <span className="font-semibold">{correctAnswer}</span>
        </span>
      </p>
      <p className="mt-1">{question.explanation}</p>
    </li>
  )
}

// ---- ResultScreen ----
export default function ResultScreen() {
  const { quizId } = useParams()
  const { user } = useAuth()
  const [retryKey, setRetryKey] = useState(0)

  const { data, loading, error } = useFetch(
    () => Promise.all([getQuiz(quizId).catch(() => null), getChapters(), getProgress(user.id)]),
    [quizId, user.id, retryKey]
  )
  useDocumentTitle('Quiz result')

  // ---- render: loading / error / not found / locked / no attempt ----
  if (loading) {
    return (
      <div className="grid min-h-[50dvh] place-items-center">
        <Spinner size="lg" label="Loading your result" />
      </div>
    )
  }

  if (error) {
    return (
      <EmptyState
        icon={TriangleAlert}
        title="Couldn't load your result"
        message={error.message}
        action={
          <Button icon={RotateCcw} onClick={() => setRetryKey((k) => k + 1)}>
            Try again
          </Button>
        }
      />
    )
  }

  const [quiz, chapters, progress] = data
  const chapter = chapters.find((c) => c.id === quiz?.chapterId)

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

  const attempts = progress.quizAttempts.filter((a) => a.quizId === quiz.id)
  if (attempts.length === 0) return <Navigate to={`/student/quiz/${quiz.id}`} replace />

  // ---- derived ----
  const attempt = attempts[attempts.length - 1]
  const previous = attempts.slice(0, -1)
  const answers = attempt.answers ?? null
  const bestBefore = previous.length ? Math.max(...previous.map((a) => a.score)) : null

  // Rebuilt with the same function that worked out the saved total, so the
  // breakdown always matches. Older seed attempts have no answers to rebuild from.
  const breakdown = answers
    ? quizAttemptPoints({
        outcomes: answers.map((a) => a.outcome),
        previousAttempts: previous,
        questionCount: quiz.questions.length,
      }).lines
    : []

  const firstTryCount = answers?.filter((a) => a.outcome === 'first').length
  const mistakes = (answers ?? []).filter((a) => a.outcome !== 'first')

  const justUnlocked = attempt.stars >= 1 && previous.every((a) => a.stars === 0)
  const nextChapter = chapters.find((c) => c.number === chapter.number + 1)
  const unlockedTitle =
    justUnlocked && nextChapter && !nextChapter.locked ? nextChapter.title : null

  const passed = attempt.stars >= 1
  const retryTo = `/student/quiz/${quiz.id}`

  // ---- render: content ----
  return (
    <div className="mx-auto max-w-xl">
      <Card tint={chapter.tint} className="text-center">
        <p className="text-sm font-semibold uppercase tracking-widest text-ink-600">
          {chapter.title} quiz
        </p>
        <h1 className="mt-2 text-3xl">{HEADLINES[attempt.stars]}</h1>
        <div className="mt-5">
          <StarRow stars={attempt.stars} />
        </div>
        <p className="mt-4 font-heading text-4xl font-bold text-ink-900">{attempt.score}%</p>
        {answers && (
          <p className="mt-1">
            {firstTryCount} of {answers.length} right first time
          </p>
        )}

        <div className="mt-6 rounded-2xl bg-sun-400/15 p-4 text-left">
          <p className="flex items-center justify-between font-heading text-xl font-bold text-ink-900">
            <span className="flex items-center gap-2">
              <Star aria-hidden="true" className="h-6 w-6 fill-sun-400 text-sun-400" />
              Points earned
            </span>
            <span>+{attempt.points}</span>
          </p>
          {breakdown.length > 0 && (
            <ul className="mt-2 space-y-1 text-sm">
              {breakdown.map((line) => (
                <li key={line.label} className="flex justify-between">
                  <span>{line.label}</span>
                  <span className="font-semibold text-ink-900">+{line.points}</span>
                </li>
              ))}
            </ul>
          )}
          {attempt.points === 0 && bestBefore !== null && (
            <p className="mt-2 text-sm">
              No new points this time. Beat your best of {bestBefore}% to earn more.
            </p>
          )}
        </div>

        {unlockedTitle && (
          <p className="mt-4 flex items-center justify-center gap-2 rounded-2xl bg-leaf-600/10 p-3 font-semibold text-ink-900">
            <Unlock aria-hidden="true" className="h-5 w-5 text-leaf-600" />
            {unlockedTitle} is now open!
          </p>
        )}

        <div className="mt-6 flex flex-col gap-3">
          {passed ? (
            <>
              <Button as={Link} to="/student/learn" size="lg" fullWidth iconRight={ArrowRight}>
                Back to chapter map
              </Button>
              <Button as={Link} to={retryTo} variant="ghost" fullWidth icon={RotateCcw}>
                Try the quiz again
              </Button>
            </>
          ) : (
            <>
              <Button as={Link} to={retryTo} size="lg" fullWidth icon={RotateCcw}>
                Try again
              </Button>
              <Button as={Link} to={`/student/learn/${chapter.id}`} variant="ghost" fullWidth>
                Back to chapter
              </Button>
            </>
          )}
        </div>
      </Card>

      {answers && (
        <section className="mt-8">
          <h2 className="text-2xl">Review mistakes</h2>
          {mistakes.length === 0 ? (
            <p className="mt-3 flex items-center gap-2 rounded-2xl bg-leaf-600/10 p-4 font-semibold text-ink-900">
              <PartyPopper aria-hidden="true" className="h-6 w-6 shrink-0 text-leaf-600" />
              Nothing to review. Every answer was right first time!
            </p>
          ) : (
            <ul className="mt-3 space-y-3">
              {mistakes.map((answer) => {
                const question = quiz.questions.find((q) => q.id === answer.questionId)
                return question ? (
                  <MistakeItem key={answer.questionId} question={question} answer={answer} />
                ) : null
              })}
            </ul>
          )}
        </section>
      )}
    </div>
  )
}
