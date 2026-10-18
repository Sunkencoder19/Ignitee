// The chapter quiz: one question at a time, two tries each.
//
// "Start the quiz" asks the server for an attempt; the questions arrive
// WITHOUT answers. Each answer goes to the server, which checks it, counts
// the try and records the outcome. At the end the server works out the score
// from its own records; this page never sends a score.

import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { answerQuizQuestion, getStudentChapters, startQuiz, useData } from '../../api'
import Question from '../../Question'
import { useSession } from '../../session'

export default function Quiz() {
  const { quizId } = useParams()
  const navigate = useNavigate()
  const { finishQuiz } = useSession()
  const { data: chapters, error } = useData(() => getStudentChapters(), [quizId])

  const [attempt, setAttempt] = useState(null) // { attemptId, chapterTitle, questions } once started
  const [index, setIndex] = useState(0)
  const [answered, setAnswered] = useState(false)
  const [busy, setBusy] = useState(false)
  const [actionError, setActionError] = useState(null)

  if (error) return <Back message={error} />
  if (!chapters) return <p className="text-muted">Loading...</p>

  const chapter = chapters.find((c) => c.quiz?.id === quizId)
  if (!chapter || chapter.state === 'locked') return <Back message="This quiz isn’t open yet." />
  if (!chapter.quiz.open) return <Back message="This quiz opens when you finish every lesson in the chapter." to={`/student/learn/${chapter.id}`} />

  async function handleStart() {
    setBusy(true)
    setActionError(null)
    try {
      setAttempt(await startQuiz(quizId))
    } catch (err) {
      setActionError(err.message)
    }
    setBusy(false)
  }

  // ---- before starting ----
  if (!attempt) {
    return (
      <div className="card mx-auto max-w-xl p-8">
        <p className="text-muted">Chapter {chapter.number}</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">{chapter.title} quiz</h1>
        <p className="mt-4 text-lg">
          {chapter.quiz.questionCount} questions. You get two tries at each one, and a hint if the first try is wrong.
        </p>
        <p className="mt-2 text-lg text-muted">Get 1 star or more to open the next chapter.</p>
        {actionError && (
          <p role="alert" className="mt-4 font-semibold text-warn">
            {actionError}
          </p>
        )}
        <button onClick={handleStart} disabled={busy} className="btn btn-primary mt-8 w-full text-lg">
          {busy ? 'Starting...' : 'Start the quiz'}
        </button>
        <Link to={`/student/learn/${chapter.id}`} className="btn btn-secondary mt-3 w-full">
          Not now
        </Link>
      </div>
    )
  }

  // ---- one question ----
  const question = attempt.questions[index]
  const isLast = index === attempt.questions.length - 1

  async function goNext() {
    if (!isLast) {
      setIndex(index + 1)
      setAnswered(false)
      return
    }
    setBusy(true)
    setActionError(null)
    try {
      const result = await finishQuiz(attempt.attemptId)
      // The result page also gets what only finishing knows (points incl. the
      // daily bonus, new badges, a newly opened chapter).
      navigate(`/student/results/${attempt.attemptId}`, { replace: true, state: result })
    } catch (err) {
      setActionError(err.message)
      setBusy(false)
    }
  }

  function leave(e) {
    if (!window.confirm("Leave the quiz? You'll start again next time.")) e.preventDefault()
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div className="flex items-center justify-between text-muted">
        <Link to={`/student/learn/${chapter.id}`} onClick={leave} className="inline-flex min-h-12 items-center font-semibold hover:text-ink">
          Leave quiz
        </Link>
        <span>
          Question {index + 1} of {attempt.questions.length}
        </span>
      </div>

      <h1 className="mt-4 text-2xl font-semibold tracking-tight">{attempt.chapterTitle} quiz</h1>

      <section className="card mt-4 p-6 md:p-8">
        <Question
          key={question.id}
          question={question}
          check={(given) => answerQuizQuestion(attempt.attemptId, question.id, given)}
          onDone={() => setAnswered(true)}
        />
      </section>

      {actionError && (
        <p role="alert" className="mt-4 font-semibold text-warn">
          {actionError}
        </p>
      )}

      {answered && (
        <button onClick={goNext} disabled={busy} className="btn btn-primary mt-6 w-full text-lg">
          {busy ? 'Working out your score...' : isLast ? 'See my score' : 'Next question'}
        </button>
      )}
    </div>
  )
}

function Back({ message, to = '/student/learn' }) {
  return (
    <div>
      <p className="text-lg font-semibold">{message}</p>
      <Link to={to} className="btn btn-secondary mt-4">
        Go back
      </Link>
    </div>
  )
}
