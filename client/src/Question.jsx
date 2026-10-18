// One question, used by both the lesson page and the quiz page.
//
// The two-tries rule:
//   first wrong answer  -> "Not quite" and the hint, try again
//   second wrong answer -> show the right answer and the explanation
// When the question is settled it calls onDone({ outcome, given }) once,
// where outcome is 'first', 'hint' or 'missed'.
//
// Three kinds of question:
//   mcq   - tap one option
//   input - type the answer
//   order - tap the options in the right order

import { useState } from 'react'
import { checkAnswer } from './game'

export default function Question({ question, onDone }) {
  const [status, setStatus] = useState('answering') // answering | retry | correct | revealed
  const [choice, setChoice] = useState(null) // mcq
  const [wrongChoices, setWrongChoices] = useState([]) // mcq
  const [text, setText] = useState('') // input
  const [order, setOrder] = useState([]) // order: indexes into question.options

  const settled = status === 'correct' || status === 'revealed'

  let given = choice
  if (question.type === 'input') given = text.trim()
  if (question.type === 'order') given = order.map((i) => question.options[i])

  const ready =
    (question.type === 'mcq' && choice !== null) ||
    (question.type === 'input' && text.trim() !== '') ||
    (question.type === 'order' && order.length === question.options.length)

  function check(e) {
    e.preventDefault()
    if (!ready || settled) return

    if (checkAnswer(question, given)) {
      setStatus('correct')
      onDone({ outcome: status === 'retry' ? 'hint' : 'first', given })
    } else if (status === 'answering') {
      setStatus('retry')
      setWrongChoices([choice])
      setChoice(null)
      setOrder([])
    } else {
      setStatus('revealed')
      onDone({ outcome: 'missed', given })
    }
  }

  const answerText = Array.isArray(question.answer) ? question.answer.join(', ') : question.answer

  return (
    <form onSubmit={check}>
      <h2 className="text-xl font-bold leading-snug sm:text-2xl">{question.prompt}</h2>

      {question.type === 'mcq' && (
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {question.options.map((option) => {
            let style = 'border-line bg-surface hover:border-accent'
            if (choice === option) style = 'border-accent bg-accent-soft'
            if (wrongChoices.includes(option)) style = 'border-line bg-surface opacity-40 line-through'
            if (settled && option === question.answer) style = 'border-good bg-good-soft'
            return (
              <button
                key={option}
                type="button"
                disabled={settled || wrongChoices.includes(option)}
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
          disabled={settled}
          autoComplete="off"
          inputMode={/^[\d,]+$/.test(question.answer) ? 'numeric' : 'text'}
          placeholder="Type your answer"
          className="field mt-5 min-h-16 text-center text-2xl font-bold"
        />
      )}

      {question.type === 'order' && (
        <div className="mt-5">
          <p className="text-sm font-bold text-muted">Your order (tap to take one back)</p>
          <div className="mt-2 flex min-h-14 flex-wrap gap-2 rounded-xl border-2 border-dashed border-line p-2">
            {order.map((optionIndex, slot) => (
              <button
                key={slot}
                type="button"
                disabled={settled}
                onClick={() => setOrder(order.filter((_, s) => s !== slot))}
                className="min-h-12 rounded-xl bg-accent-soft px-4 text-lg font-bold"
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
                  disabled={order.includes(i)}
                  onClick={() => setOrder([...order, i])}
                  className="min-h-12 rounded-xl border-2 border-line bg-surface px-4 text-lg font-bold hover:border-accent disabled:opacity-25"
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
          <p className="mt-5 rounded-xl bg-good-soft p-4 font-bold text-good">Correct, well done!</p>
        )}
        {status === 'retry' && (
          <div className="mt-5 rounded-xl bg-warn-soft p-4">
            <p className="font-bold text-warn">Not quite. Try once more.</p>
            <p className="mt-1">Hint: {question.hint}</p>
          </div>
        )}
        {status === 'revealed' && (
          <div className="mt-5 rounded-xl bg-accent-soft p-4">
            <p className="font-bold">The answer is {answerText}.</p>
            <p className="mt-1">{question.explanation}</p>
          </div>
        )}
      </div>

      {!settled && (
        <button type="submit" disabled={!ready} className="btn btn-primary mt-6 w-full text-lg">
          Check
        </button>
      )}
    </form>
  )
}
