// One question, used by the lesson page, the quiz page, the teacher's preview
// and the landing page.
//
// The two-tries rule:
//   first wrong answer  -> "Not quite" and the hint, try again
//   second wrong answer -> show the right answer and the explanation
// When the question is settled it calls onDone({ outcome, given }) once,
// where outcome is 'first', 'hint' or 'missed'.
//
// Who decides if an answer is right? The `check(given, tries)` prop:
//   - Student lessons and quizzes pass a function that asks the SERVER. The
//     question they get has no answer in it, so the hint, answer and
//     explanation only arrive in the server's reply.
//   - Without `check` (landing page, teacher preview) the question has its
//     answer, hint and explanation, and is checked right here.
// Either way, check returns one of:
//   { result: 'correct' }  |  { result: 'retry', hint }  |  { result: 'revealed', answer, explanation }
//
// Three kinds of question:
//   mcq   - tap one option
//   input - type the answer
//   order - tap the options in the right order

import { useState } from 'react'
import { checkAnswer } from './game'

// The local check, for questions that carry their own answer.
function checkHere(question, given, tries) {
  if (checkAnswer(question, given)) return { result: 'correct' }
  if (tries === 1) return { result: 'retry', hint: question.hint }
  return { result: 'revealed', answer: question.answer, explanation: question.explanation }
}

export default function Question({ question, onDone, check }) {
  const [status, setStatus] = useState('answering') // answering | retry | correct | revealed
  const [reply, setReply] = useState(null) // the last reply from check: hint, answer, explanation
  const [rightAnswer, setRightAnswer] = useState(null) // known once correct or revealed
  const [choice, setChoice] = useState(null) // mcq
  const [wrongChoices, setWrongChoices] = useState([]) // mcq
  const [text, setText] = useState('') // input
  const [order, setOrder] = useState([]) // order: indexes into question.options
  const [busy, setBusy] = useState(false) // waiting for the server
  const [error, setError] = useState(null)

  const settled = status === 'correct' || status === 'revealed'

  let given = choice
  if (question.type === 'input') given = text.trim()
  if (question.type === 'order') given = order.map((i) => question.options[i])

  const ready =
    (question.type === 'mcq' && choice !== null) ||
    (question.type === 'input' && text.trim() !== '') ||
    (question.type === 'order' && order.length === question.options.length)

  async function handleCheck(e) {
    e.preventDefault()
    if (!ready || settled || busy) return

    const tries = status === 'retry' ? 2 : 1
    setBusy(true)
    setError(null)
    let answer
    try {
      answer = check ? await check(given, tries) : checkHere(question, given, tries)
    } catch (err) {
      setError(err.message) // nothing changes; the child can press Check again
      setBusy(false)
      return
    }
    setBusy(false)
    setReply(answer)

    if (answer.result === 'correct') {
      setStatus('correct')
      setRightAnswer(given)
      onDone({ outcome: tries === 1 ? 'first' : 'hint', given })
    } else if (answer.result === 'retry') {
      setStatus('retry')
      setWrongChoices([choice])
      setChoice(null)
      setOrder([])
    } else {
      setStatus('revealed')
      setRightAnswer(answer.answer)
      if (question.type === 'mcq') setWrongChoices([...wrongChoices, choice])
      onDone({ outcome: 'missed', given })
    }
  }

  const answerText = Array.isArray(rightAnswer) ? rightAnswer.join(', ') : rightAnswer

  return (
    <form onSubmit={handleCheck}>
      <h2 className="text-xl font-semibold leading-snug sm:text-2xl">{question.prompt}</h2>

      {question.type === 'mcq' && (
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {question.options.map((option) => {
            let style = 'border-line bg-surface hover:border-accent'
            if (choice === option) style = 'border-accent bg-accent-soft'
            if (wrongChoices.includes(option)) style = 'border-line bg-surface opacity-40 line-through'
            if (settled && option === rightAnswer) style = 'border-good bg-good-soft'
            return (
              <button
                key={option}
                type="button"
                disabled={settled || busy || wrongChoices.includes(option)}
                onClick={() => setChoice(option)}
                className={`min-h-14 rounded-xl border-2 px-4 text-left text-lg font-semibold ${style}`}
              >
                {option}
              </button>
            )
          })}
        </div>
      )}

      {question.type === 'input' && (
        <input
          aria-label="Your answer"
          value={text}
          onChange={(e) => setText(e.target.value)}
          disabled={settled || busy}
          autoComplete="off"
          inputMode="text"
          placeholder="Type your answer"
          className="field mt-5 min-h-16 text-center text-2xl font-semibold"
        />
      )}

      {question.type === 'order' && (
        <div className="mt-5">
          <p className="font-semibold text-muted">Your order (tap to take one back)</p>
          <div className="mt-2 flex min-h-14 flex-wrap gap-2 rounded-xl border-2 border-dashed border-line p-2">
            {order.map((optionIndex, slot) => (
              <button
                key={slot}
                type="button"
                disabled={settled || busy}
                onClick={() => setOrder(order.filter((_, s) => s !== slot))}
                className="min-h-12 rounded-xl bg-accent-soft px-4 text-lg font-semibold"
              >
                {question.options[optionIndex]}
              </button>
            ))}
          </div>
          {!settled && (
            <div className="mt-3 flex flex-wrap gap-2">
              {question.options.map((option, i) => (
                <button
                  key={i}
                  type="button"
                  disabled={order.includes(i) || busy}
                  onClick={() => setOrder([...order, i])}
                  className="min-h-12 rounded-xl border-2 border-line bg-surface px-4 text-lg font-semibold hover:border-accent disabled:opacity-25"
                >
                  {option}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <div aria-live="polite">
        {status === 'correct' && (
          <p className="mt-5 rounded-xl bg-good-soft p-4 font-semibold text-good">Correct, well done!</p>
        )}
        {status === 'retry' && (
          <div className="mt-5 rounded-xl bg-warn-soft p-4">
            <p className="font-semibold text-warn">Not quite. Try once more.</p>
            {reply?.hint && <p className="mt-1">Hint: {reply.hint}</p>}
          </div>
        )}
        {status === 'revealed' && (
          <div className="mt-5 rounded-xl bg-accent-soft p-4">
            <p className="font-semibold">The answer is {answerText}.</p>
            {reply?.explanation && <p className="mt-1">{reply.explanation}</p>}
          </div>
        )}
        {error && (
          <p role="alert" className="mt-5 font-semibold text-warn">
            {error} Press Check to try again.
          </p>
        )}
      </div>

      {!settled && (
        <button type="submit" disabled={!ready || busy} className="btn btn-primary mt-6 w-full text-lg">
          {busy ? 'Checking...' : 'Check'}
        </button>
      )}
    </form>
  )
}
