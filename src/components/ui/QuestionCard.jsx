import { useId, useRef, useState } from 'react'
import { Check, Lightbulb, RotateCcw, Undo2 } from 'lucide-react'
import Button from '@/components/ui/Button'
import { checkAnswer } from '@/lib/scoring'

// Shared by the lesson player and the quiz. Owns the two-tries rule:
//   first miss  -> amber "Try again" plus the hint
//   second miss -> show the right answer and the explanation, then move on
// When the question is settled it calls onResolved({ outcome, given }) once,
// with outcome 'first' | 'hint' | 'missed'. The parent shows the Next button.
// Wrong answers are amber, never red: red feels like punishment to a 9-year-old.

const OPTION =
  'flex min-h-[56px] w-full items-center gap-3 rounded-2xl px-4 py-2 text-left text-lg font-semibold ring-2 ring-inset transition'

function formatAnswer(question) {
  return Array.isArray(question.answer) ? question.answer.join(', ') : question.answer
}

// ---- mcq ----
function McqOptions({ question, selected, missed, resolved, onSelect }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {question.options.map((option) => {
        const isAnswer = option === question.answer
        const isMissed = missed.includes(option)
        let tone = 'bg-paper text-ink-900 ring-ink-900/10 hover:ring-ember-500/60'
        if (selected === option) tone = 'bg-ember-500/10 text-ink-900 ring-ember-500'
        if (isMissed) tone = 'bg-amber-500/10 text-amber-700 ring-amber-500'
        if (resolved && isAnswer) tone = 'bg-leaf-600/10 text-ink-900 ring-leaf-600'
        if (resolved && !isAnswer && !isMissed)
          tone = 'bg-paper text-ink-600 ring-ink-900/10 opacity-60'

        return (
          <button
            key={option}
            type="button"
            onClick={() => onSelect(option)}
            disabled={resolved || isMissed}
            aria-pressed={selected === option}
            className={`${OPTION} ${tone} focus-visible:outline-none focus-visible:ring-4`}
          >
            <span className="min-w-0 flex-1">{option}</span>
            {/* Words, not just colour: amber alone looks too close to "selected" */}
            {isMissed && !(resolved && isAnswer) && (
              <span className="shrink-0 text-sm font-semibold">Not this one</span>
            )}
            {resolved && isAnswer && (
              <Check aria-hidden="true" className="h-6 w-6 shrink-0 text-leaf-600" />
            )}
          </button>
        )
      })}
    </div>
  )
}

// ---- order (tap to arrange) ----
// Tap an item to add it to your row; tap it in the row to send it back.
// Items are tracked by position, not value, so "Red, Yellow, Red" works.
function OrderPicker({ question, placed, resolved, onPlace, onRemove }) {
  const slots = question.options.map((_, i) => placed[i])

  return (
    <div>
      <p className="text-sm font-semibold text-ink-900">Your order</p>
      <ol className="mt-2 flex flex-wrap gap-2">
        {slots.map((optionIndex, slot) =>
          optionIndex === undefined ? (
            <li
              key={slot}
              className="grid min-h-[56px] min-w-[72px] place-items-center rounded-2xl border-2 border-dashed border-ink-900/15 px-3 text-ink-600"
            >
              {slot + 1}
            </li>
          ) : (
            <li key={slot}>
              <button
                type="button"
                onClick={() => onRemove(slot)}
                disabled={resolved}
                aria-label={`${question.options[optionIndex]}, place ${slot + 1}. Tap to take it back.`}
                className="flex min-h-[56px] min-w-[72px] items-center justify-center gap-1 rounded-2xl bg-ember-500/10 px-3 text-lg font-semibold text-ink-900 ring-2 ring-inset ring-ember-500 focus-visible:outline-none focus-visible:ring-4"
              >
                {question.options[optionIndex]}
                {!resolved && <Undo2 aria-hidden="true" className="h-4 w-4 text-ink-600" />}
              </button>
            </li>
          )
        )}
      </ol>

      {!resolved && (
        <>
          <p className="mt-5 text-sm font-semibold text-ink-900">Tap to place</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {question.options.map((option, i) => {
              const used = placed.includes(i)
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => onPlace(i)}
                  disabled={used}
                  className="min-h-[56px] min-w-[72px] rounded-2xl bg-paper px-3 text-lg font-semibold text-ink-900 ring-2 ring-inset ring-ink-900/10 transition hover:ring-ember-500/60 focus-visible:outline-none focus-visible:ring-4 disabled:opacity-25"
                >
                  {option}
                </button>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}

// ---- QuestionCard ----
export default function QuestionCard({ question, onResolved }) {
  // ---- state ----
  const [tries, setTries] = useState(0)
  const [status, setStatus] = useState('answering') // answering | retry | correct | revealed
  const [selected, setSelected] = useState(null)
  const [missed, setMissed] = useState([])
  const [text, setText] = useState('')
  const [placed, setPlaced] = useState([])
  const inputRef = useRef(null)
  const inputId = useId()
  const feedbackId = useId()

  const resolved = status === 'correct' || status === 'revealed'
  const numeric = question.type === 'input' && /^[\d,]+$/.test(String(question.answer))

  let given = selected
  if (question.type === 'input') given = text
  if (question.type === 'order') given = placed.map((i) => question.options[i])

  const canCheck =
    (question.type === 'mcq' && selected !== null) ||
    (question.type === 'input' && text.trim() !== '') ||
    (question.type === 'order' && placed.length === question.options.length)

  // ---- handlers ----
  function handleCheck(e) {
    e?.preventDefault()
    if (!canCheck || resolved) return

    if (checkAnswer(question, given)) {
      setStatus('correct')
      onResolved({ outcome: tries === 0 ? 'first' : 'hint', given })
      return
    }

    if (tries === 0) {
      setTries(1)
      setStatus('retry')
      if (question.type === 'mcq') {
        setMissed([selected])
        setSelected(null)
      }
      if (question.type === 'order') setPlaced([])
      if (question.type === 'input') inputRef.current?.select()
      return
    }

    setStatus('revealed')
    if (question.type === 'mcq') setMissed((m) => [...m, selected])
    onResolved({ outcome: 'missed', given })
  }

  // ---- render ----
  return (
    <div>
      <h2 className="text-2xl">{question.prompt}</h2>

      <div className="mt-5">
        {question.type === 'mcq' && (
          <McqOptions
            question={question}
            selected={selected}
            missed={missed}
            resolved={resolved}
            onSelect={setSelected}
          />
        )}

        {question.type === 'input' && (
          <form onSubmit={handleCheck}>
            <label htmlFor={inputId} className="sr-only">
              Your answer
            </label>
            <input
              ref={inputRef}
              id={inputId}
              type="text"
              inputMode={numeric ? 'numeric' : 'text'}
              autoComplete="off"
              autoCapitalize="characters"
              value={text}
              onChange={(e) => setText(e.target.value)}
              disabled={resolved}
              aria-describedby={feedbackId}
              placeholder="Type your answer"
              className={[
                'min-h-[64px] w-full rounded-2xl bg-paper px-4 text-center font-heading text-3xl font-bold text-ink-900 ring-2 ring-inset focus:outline-none placeholder:text-lg placeholder:font-normal placeholder:text-ink-600/60',
                status === 'retry' ? 'ring-amber-500' : '',
                status === 'correct' ? 'ring-leaf-600' : '',
                status === 'answering' || status === 'revealed'
                  ? 'ring-ink-900/15 focus:ring-ember-500'
                  : '',
              ].join(' ')}
            />
          </form>
        )}

        {question.type === 'order' && (
          <OrderPicker
            question={question}
            placed={placed}
            resolved={resolved}
            onPlace={(i) => setPlaced((p) => [...p, i])}
            onRemove={(slot) => setPlaced((p) => p.filter((_, s) => s !== slot))}
          />
        )}
      </div>

      <div id={feedbackId} aria-live="polite">
        {status === 'correct' && (
          <p className="mt-5 flex items-center gap-2 rounded-2xl bg-leaf-600/10 p-4 font-semibold text-ink-900">
            <Check aria-hidden="true" className="h-6 w-6 shrink-0 text-leaf-600" />
            {tries === 0 ? "Nice! That's right." : 'You got it! Well done for trying again.'}
          </p>
        )}

        {status === 'retry' && (
          <div className="mt-5 rounded-2xl bg-amber-500/10 p-4 ring-2 ring-inset ring-amber-500">
            <p className="flex items-center gap-2 font-semibold text-amber-700">
              <RotateCcw aria-hidden="true" className="h-5 w-5 shrink-0" />
              Not quite. Try again.
            </p>
            <p className="mt-2 flex gap-2 text-ink-900">
              <Lightbulb aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-sky-500" />
              <span>
                <span className="font-semibold">Hint:</span> {question.hint}
              </span>
            </p>
          </div>
        )}

        {status === 'revealed' && (
          <div className="mt-5 rounded-2xl bg-sky-500/10 p-4">
            <p className="font-semibold text-ink-900">
              The answer is{' '}
              <span className="rounded bg-leaf-600/15 px-1.5 font-bold">
                {formatAnswer(question)}
              </span>
              .
            </p>
            <p className="mt-1">{question.explanation}</p>
          </div>
        )}
      </div>

      {!resolved && (
        <Button size="lg" fullWidth className="mt-6" onClick={handleCheck} disabled={!canCheck}>
          Check
        </Button>
      )}
    </div>
  )
}
