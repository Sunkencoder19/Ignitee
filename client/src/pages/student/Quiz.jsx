// The chapter quiz: one question at a time, two tries each.
// When the last question is answered the attempt is saved and the student
// goes to the result page.

import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { getChapters, getQuiz, useData } from '../../api'
import { chapterStates, quizOpen } from '../../game'
import Question from '../../Question'
import { useSession } from '../../session'

export default function Quiz() {
  const { quizId } = useParams()
  const navigate = useNavigate()
  const { progress, submitQuiz } = useSession()
  const { data, error } = useData(() => Promise.all([getQuiz(quizId), getChapters()]), [quizId])

  const [index, setIndex] = useState(0)
  const [answers, setAnswers] = useState([]) // [{ questionId, outcome, given }]
  const [saving, setSaving] = useState(false)

  if (error) return <Back message={error} />
  if (!data) return <p className="text-muted">Loading...</p>

  const [quiz, chapters] = data
  const chapter = chapters.find((c) => c.id === quiz.chapterId)
  const state = chapterStates(chapters, progress).find((c) => c.chapter.id === chapter.id).state
  if (state === 'locked' || state === 'soon' || !quizOpen(chapter, progress)) {
    return <Back message="This quiz opens when you finish every lesson in the chapter." />
  }

  const question = quiz.questions[index]
  const answered = answers.length > index
  const isLast = index === quiz.questions.length - 1

  async function goNext() {
    if (!isLast) {
      setIndex(index + 1)
      return
    }
    setSaving(true)
    await submitQuiz(quiz.id, answers)
    navigate(`/student/quiz/${quiz.id}/result`, { replace: true })
  }

  function leave(e) {
    if (answers.length > 0 && !window.confirm("Leave the quiz? Your answers so far won't be saved.")) {
      e.preventDefault()
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div className="flex items-center justify-between text-muted">
        <Link to={`/student/learn/${chapter.id}`} onClick={leave} className="inline-flex min-h-12 items-center font-semibold hover:text-ink">
          Leave quiz
        </Link>
        <span>
          Question {index + 1} of {quiz.questions.length}
        </span>
      </div>

      <h1 className="mt-4 text-2xl font-semibold tracking-tight">{chapter.title} quiz</h1>

      <section className="card mt-4 p-6 md:p-8">
        <Question
          key={question.id}
          question={question}
          onDone={(result) => setAnswers([...answers, { questionId: question.id, ...result }])}
        />
      </section>

      {answered && (
        <button onClick={goNext} disabled={saving} className="btn btn-primary mt-6 w-full text-lg">
          {isLast ? 'See my score' : 'Next question'}
        </button>
      )}
    </div>
  )
}

function Back({ message }) {
  return (
    <div>
      <p className="text-lg font-semibold">{message}</p>
      <Link to="/student/learn" className="btn btn-secondary mt-4">
        Back to chapters
      </Link>
    </div>
  )
}
