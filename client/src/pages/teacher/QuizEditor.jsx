// Writing a chapter's quiz: a list of questions, saved all together.
// Every question needs a topic, because reports show accuracy by topic.
// "Save quiz" checks everything first (quizProblems, the same check the server
// runs) and lists what to fix, question by question.

import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getChapterForEditing, getTopics, saveQuiz, useData } from '../../api'
import { LIMITS, quizProblems } from '../../game'
import QuestionForm, { blankQuestion } from '../../QuestionForm'

export default function QuizEditor() {
  const { chapterId } = useParams()
  const { data, error, reload } = useData(() => Promise.all([getChapterForEditing(chapterId), getTopics()]), [chapterId])
  const [questions, setQuestions] = useState(null) // the version being edited
  const [checked, setChecked] = useState(false)
  const [status, setStatus] = useState(null) // { kind: 'saved' | 'error', message }
  const [busy, setBusy] = useState(false)

  // When the saved quiz arrives (or is reloaded after saving), start editing from it.
  const saved = data?.[0].quiz?.questions ?? []
  useEffect(() => {
    if (data) setQuestions(data[0].quiz ? data[0].quiz.questions : [blankQuestion()])
  }, [data])

  if (error && !data) {
    return (
      <div>
        <p className="text-lg font-semibold">{error}</p>
        <Link to="/teacher/content" className="btn btn-secondary mt-4">
          Back to content
        </Link>
      </div>
    )
  }
  if (!data || !questions) return <p className="text-muted">Loading the quiz...</p>

  const [chapter, topicsUsed] = data
  // Suggest topics already used anywhere, plus ones typed in this quiz so far.
  const topics = [...new Set([...topicsUsed, ...questions.map((q) => q.topic.trim()).filter(Boolean)])].sort()
  const unsaved = JSON.stringify(questions) !== JSON.stringify(data[0].quiz ? saved : [blankQuestion()])
  const problems = checked ? quizProblems(questions) : []

  function setQuestion(i, q) {
    setQuestions(questions.map((x, j) => (j === i ? q : x)))
    setStatus(null)
  }

  function move(i, by) {
    const next = [...questions]
    ;[next[i], next[i + by]] = [next[i + by], next[i]]
    setQuestions(next)
  }

  async function handleSave() {
    setChecked(true)
    setStatus(null)
    if (quizProblems(questions).length) return
    setBusy(true)
    try {
      await saveQuiz(chapter.id, questions)
      await reload()
      setChecked(false)
      setStatus({ kind: 'saved', message: 'Quiz saved.' })
    } catch (err) {
      setStatus({ kind: 'error', message: err.message })
    }
    setBusy(false)
  }

  return (
    <div className="max-w-4xl space-y-8">
      <div>
        <Link
          to={`/teacher/content/${chapter.id}`}
          onClick={(e) => unsaved && !window.confirm('Leave without saving? Your changes to the quiz will be lost.') && e.preventDefault()}
          className="inline-flex min-h-12 items-center font-semibold text-muted hover:text-ink"
        >
          {chapter.title}
        </Link>
        <h1 className="text-3xl font-semibold tracking-tight">Chapter quiz</h1>
        <p className="mt-1 text-muted">
          Students get two tries at each question: the hint after the first miss, the answer and explanation after the second.
        </p>
      </div>

      <ol className="space-y-5">
        {questions.map((q, i) => (
          <li key={i} className="card p-5">
            <div className="mb-3 flex flex-wrap items-center gap-x-2">
              <h2 className="mr-auto text-lg font-semibold">Question {i + 1}</h2>
              <button onClick={() => move(i, -1)} disabled={i === 0} className="inline-flex min-h-12 items-center px-2 font-semibold text-muted disabled:opacity-30">
                Up
              </button>
              <button
                onClick={() => move(i, 1)}
                disabled={i === questions.length - 1}
                className="inline-flex min-h-12 items-center px-2 font-semibold text-muted disabled:opacity-30"
              >
                Down
              </button>
              <button
                onClick={() => setQuestions(questions.filter((_, j) => j !== i))}
                disabled={questions.length === 1}
                className="inline-flex min-h-12 items-center px-2 font-semibold text-warn disabled:opacity-30"
              >
                Remove
              </button>
            </div>
            <QuestionForm question={q} onChange={(next) => setQuestion(i, next)} idPrefix={`q${i}`} needsTopic topics={topics} showProblems={checked} />
          </li>
        ))}
      </ol>

      {questions.length < LIMITS.maxQuestions && (
        <button onClick={() => setQuestions([...questions, blankQuestion()])} className="btn btn-secondary">
          Add a question
        </button>
      )}

      {/* Sticky so Save is always in reach on a long quiz. */}
      <div className="sticky bottom-0 -mx-4 border-t border-line bg-bg/90 px-4 py-4 backdrop-blur">
        {problems.length > 0 && (
          <div role="alert" className="mb-3 max-h-40 overflow-y-auto rounded-xl bg-warn-soft p-4 text-warn">
            <p className="font-semibold">Fix these before saving:</p>
            <ul className="mt-1 list-inside list-disc">
              {problems.map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ul>
          </div>
        )}
        <div className="flex flex-wrap items-center gap-4">
          <button onClick={handleSave} disabled={busy} className="btn btn-primary">
            {busy ? 'Saving...' : 'Save quiz'}
          </button>
          {unsaved ? (
            <span className="text-muted">Save your changes to preview them.</span>
          ) : (
            data[0].quiz && (
              <Link to={`/teacher/preview/${chapter.id}/quiz`} className="inline-flex min-h-12 items-center font-semibold text-accent">
                Preview as student
              </Link>
            )
          )}
          {status && (
            <span role="status" className={`font-semibold ${status.kind === 'saved' ? 'text-good' : 'text-warn'}`}>
              {status.message}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
