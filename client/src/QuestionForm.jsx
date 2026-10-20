// The form for writing one question. Used by the lesson editor (activity
// questions) and the quiz editor, so it lives here instead of in either page.
//
// It doesn't save anything: every change goes straight to onChange(newQuestion),
// and the page decides when to save. Problems (from questionProblems in
// game.js, the same check the server runs) show once `showProblems` is true,
// which pages switch on after the first Save, so a half-typed question isn't
// covered in red.
//
// Hindi and Marathi: the page shows <LanguageTabs> (also in this file) and
// passes `lang`. In 'hi' or 'mr' the form shows the translation boxes instead,
// each with the English beside it. Translations are optional; anything left
// empty falls back to English for students.

import { CountForm, MatchForm, NumberLineForm, PairsForm, PatternForm, PlaceValueForm, SortForm, TrueFalseForm, UnscrambleForm, blankGame } from './GameForm'
import { LIMITS, isGame, questionProblems, translatableLists } from './game'

const LANGUAGE_TABS = [
  { code: 'en', label: 'English' },
  { code: 'hi', label: 'हिन्दी (Hindi)' },
  { code: 'mr', label: 'मराठी (Marathi)' },
]

// English / Hindi / Marathi tabs for an editor page.
export function LanguageTabs({ lang, onChange }) {
  return (
    <div role="tablist" aria-label="Language to edit" className="inline-flex flex-wrap gap-1 rounded-full bg-bg p-1 ring-1 ring-line">
      {LANGUAGE_TABS.map((tab) => (
        <button
          key={tab.code}
          type="button"
          role="tab"
          aria-selected={lang === tab.code}
          onClick={() => onChange(tab.code)}
          className={`min-h-11 rounded-full px-4 font-semibold ${lang === tab.code ? 'bg-surface text-ink shadow-card' : 'text-muted hover:text-ink'}`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  )
}

const LANGUAGE_WORD = { hi: 'Hindi', mr: 'Marathi' }

// The kinds of question, in groups for the picker.
const TYPE_GROUPS = [
  {
    label: 'Questions',
    types: [
      { value: 'mcq', label: 'Multiple choice' },
      { value: 'input', label: 'Type the answer' },
      { value: 'order', label: 'Put in order' },
    ],
  },
  {
    label: 'Activities for any subject',
    types: [
      { value: 'truefalse', label: 'True or false' },
      { value: 'unscramble', label: 'Unscramble the word' },
      { value: 'pairs', label: 'Match pairs of words' },
      { value: 'sort', label: 'Sort into groups' },
    ],
  },
  {
    label: 'Maths activities',
    types: [
      { value: 'count', label: 'Count objects' },
      { value: 'pattern', label: 'Pattern puzzle' },
      { value: 'match', label: 'Match shapes and names' },
      { value: 'numberline', label: 'Number line jump' },
      { value: 'placevalue', label: 'Place value blocks' },
    ],
  },
]

// A blank question of each type.
export function blankQuestion(type = 'mcq') {
  const base = { type, prompt: '', hint: '', explanation: '', topic: '' }
  if (type === 'mcq') return { ...base, options: ['', '', ''], answer: '' }
  if (type === 'order') return { ...base, answer: ['', '', ''] }
  if (isGame(type)) return { ...base, ...blankGame(type) }
  return { ...base, answer: '' }
}

export default function QuestionForm({ question, onChange, idPrefix, needsTopic = false, topics = [], showProblems = false, lang = 'en' }) {
  const q = question
  const set = (changes) => onChange({ ...q, ...changes })
  const problems = showProblems ? questionProblems(q, { needsTopic }) : []
  const id = (name) => `${idPrefix}-${name}`

  if (lang !== 'en') return <TranslationFields q={q} onChange={onChange} lang={lang} id={id} problems={problems} />

  // Switching type keeps the shared fields and starts the answer part fresh.
  // Translated options or items no longer line up, so only the text translations stay.
  function changeType(type) {
    const fresh = blankQuestion(type)
    // (the `auto` stamps for these three fields stay, so the server still knows which ones it translated itself)
    const TEXT = ['prompt', 'hint', 'explanation']
    const keepText = (t) =>
      t ? { prompt: t.prompt, hint: t.hint, explanation: t.explanation, auto: t.auto && Object.fromEntries(Object.entries(t.auto).filter(([k]) => TEXT.includes(k))) } : undefined
    onChange({ ...fresh, id: q.id, prompt: q.prompt, hint: q.hint, explanation: q.explanation, topic: q.topic, hi: keepText(q.hi), mr: keepText(q.mr) })
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-[14rem_1fr]">
        <div>
          <label htmlFor={id('type')} className="label">
            Question type
          </label>
          <select id={id('type')} value={q.type} onChange={(e) => changeType(e.target.value)} className="field">
            {TYPE_GROUPS.map((group) => (
              <optgroup key={group.label} label={group.label}>
                {group.types.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor={id('prompt')} className="label">
            Question
          </label>
          <textarea
            id={id('prompt')}
            value={q.prompt}
            onChange={(e) => set({ prompt: e.target.value })}
            maxLength={LIMITS.prompt}
            rows={2}
            className="field py-3"
          />
        </div>
      </div>

      {q.type === 'mcq' && <McqOptions q={q} set={set} id={id} />}
      {q.type === 'input' && (
        <div>
          <label htmlFor={id('answer')} className="label">
            Right answer
          </label>
          <input
            id={id('answer')}
            value={q.answer}
            onChange={(e) => set({ answer: e.target.value })}
            maxLength={LIMITS.option}
            className="field"
          />
          <p className="mt-1 text-sm text-muted">Spaces, commas and capitals are ignored when checking, so 3,456 matches 3456.</p>
        </div>
      )}
      {q.type === 'order' && <OrderItems q={q} set={set} id={id} />}
      {q.type === 'count' && <CountForm q={q} onChange={onChange} id={id} />}
      {q.type === 'pattern' && <PatternForm q={q} onChange={onChange} />}
      {q.type === 'match' && <MatchForm q={q} onChange={onChange} />}
      {q.type === 'numberline' && <NumberLineForm q={q} onChange={onChange} />}
      {q.type === 'placevalue' && <PlaceValueForm q={q} onChange={onChange} />}
      {q.type === 'truefalse' && <TrueFalseForm q={q} onChange={onChange} />}
      {q.type === 'unscramble' && <UnscrambleForm q={q} onChange={onChange} />}
      {q.type === 'pairs' && <PairsForm q={q} onChange={onChange} />}
      {q.type === 'sort' && <SortForm q={q} onChange={onChange} />}

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor={id('hint')} className="label">
            Hint <span className="font-normal text-muted">(after the first wrong answer)</span>
          </label>
          <input id={id('hint')} value={q.hint} onChange={(e) => set({ hint: e.target.value })} maxLength={LIMITS.hint} className="field" />
        </div>
        <div>
          <label htmlFor={id('explanation')} className="label">
            Explanation <span className="font-normal text-muted">(after the second)</span>
          </label>
          <input
            id={id('explanation')}
            value={q.explanation}
            onChange={(e) => set({ explanation: e.target.value })}
            maxLength={LIMITS.explanation}
            className="field"
          />
        </div>
      </div>

      {needsTopic && (
        <div className="max-w-sm">
          <label htmlFor={id('topic')} className="label">
            Topic <span className="font-normal text-muted">(reports group answers by this)</span>
          </label>
          <input
            id={id('topic')}
            value={q.topic}
            onChange={(e) => set({ topic: e.target.value })}
            list={id('topics')}
            maxLength={LIMITS.topic}
            placeholder="For example, Place value"
            className="field"
          />
          {/* The browser suggests topics already used, so "place value" and "Place Value" don't split a report. */}
          <datalist id={id('topics')}>
            {topics.map((t) => (
              <option key={t} value={t} />
            ))}
          </datalist>
        </div>
      )}

      {problems.length > 0 && (
        <ul role="alert" className="rounded-xl bg-warn-soft p-4 text-warn">
          {problems.map((p) => (
            <li key={p} className="font-semibold">
              {p}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

// Options with a "right answer" radio next to each. The answer is stored as the
// option's text, so editing the chosen option's text updates the answer too.
function McqOptions({ q, set, id }) {
  const chosen = q.options.findIndex((o) => q.answer !== '' && o === q.answer)

  function editOption(i, text) {
    const options = q.options.map((o, j) => (j === i ? text : o))
    set({ options, answer: i === chosen ? text : q.answer })
  }

  function removeOption(i) {
    set({ options: q.options.filter((_, j) => j !== i), answer: i === chosen ? '' : q.answer })
  }

  return (
    <fieldset>
      <legend className="label">Options (choose the right one)</legend>
      <ul className="space-y-2">
        {q.options.map((option, i) => (
          <li key={i} className="flex items-center gap-3">
            <input
              type="radio"
              name={id('right')}
              checked={i === chosen}
              onChange={() => set({ answer: option })}
              disabled={!option.trim()}
              aria-label={`Option ${i + 1} is the right answer`}
              className="size-5 shrink-0 accent-[var(--color-accent)]"
            />
            <input
              value={option}
              onChange={(e) => editOption(i, e.target.value)}
              maxLength={LIMITS.option}
              aria-label={`Option ${i + 1}`}
              className="field"
            />
            <button
              type="button"
              onClick={() => removeOption(i)}
              disabled={q.options.length <= LIMITS.minOptions}
              className="inline-flex min-h-12 shrink-0 items-center px-2 font-semibold text-muted hover:text-ink disabled:opacity-30"
            >
              Remove
            </button>
          </li>
        ))}
      </ul>
      {q.options.length < LIMITS.maxOptions && (
        <button
          type="button"
          onClick={() => set({ options: [...q.options, ''] })}
          className="mt-2 inline-flex min-h-12 items-center font-semibold text-accent"
        >
          Add an option
        </button>
      )}
    </fieldset>
  )
}

// Items in the RIGHT order. Students see them shuffled and put them back in order.
function OrderItems({ q, set, id }) {
  const items = q.answer

  function move(i, by) {
    const next = [...items]
    ;[next[i], next[i + by]] = [next[i + by], next[i]]
    set({ answer: next })
  }

  return (
    <fieldset>
      <legend className="label">Items, in the right order</legend>
      <p className="-mt-1 mb-2 text-sm text-muted">Students see them shuffled.</p>
      <ol className="space-y-2">
        {items.map((item, i) => (
          <li key={i} className="flex items-center gap-2">
            <span className="w-6 shrink-0 text-right font-semibold text-muted">{i + 1}.</span>
            <input
              value={item}
              onChange={(e) => set({ answer: items.map((x, j) => (j === i ? e.target.value : x)) })}
              maxLength={LIMITS.option}
              aria-label={`Item ${i + 1}`}
              className="field"
            />
            <button type="button" onClick={() => move(i, -1)} disabled={i === 0} aria-label={`Move item ${i + 1} up`} className="inline-flex min-h-12 shrink-0 items-center px-2 font-semibold text-muted disabled:opacity-30">
              Up
            </button>
            <button
              type="button"
              onClick={() => move(i, 1)}
              disabled={i === items.length - 1}
              aria-label={`Move item ${i + 1} down`}
              className="inline-flex min-h-12 shrink-0 items-center px-2 font-semibold text-muted disabled:opacity-30"
            >
              Down
            </button>
            <button
              type="button"
              onClick={() => set({ answer: items.filter((_, j) => j !== i) })}
              disabled={items.length <= LIMITS.minItems}
              className="inline-flex min-h-12 shrink-0 items-center px-2 font-semibold text-muted hover:text-ink disabled:opacity-30"
            >
              Remove
            </button>
          </li>
        ))}
      </ol>
      {items.length < LIMITS.maxItems && (
        <button type="button" onClick={() => set({ answer: [...items, ''] })} className="mt-2 inline-flex min-h-12 items-center font-semibold text-accent">
          Add an item
        </button>
      )}
    </fieldset>
  )
}

// The Hindi or Marathi boxes for one question. Each shows the English it
// translates; options and order items get one box per English one, so they
// stay in the same order (the right answer is the same position).
function TranslationFields({ q, onChange, lang, id, problems }) {
  const t = q[lang] ?? {}
  const word = LANGUAGE_WORD[lang]
  const set = (changes) => onChange({ ...q, [lang]: { ...t, ...changes } })
  const lists = translatableLists(q)

  function Field({ field, label, english, max, rows }) {
    const props = {
      id: id(`${lang}-${field}`),
      lang,
      value: t[field] ?? '',
      onChange: (e) => set({ [field]: e.target.value }),
      maxLength: max,
      className: `field ${rows ? 'py-3' : ''}`,
    }
    return (
      <div>
        <label htmlFor={props.id} className="label">
          {label} in {word}
        </label>
        <p className="-mt-1 mb-2 text-sm text-muted">English: {english || '(empty)'}</p>
        {rows ? <textarea rows={rows} {...props} /> : <input {...props} />}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {Field({ field: 'prompt', label: 'Question', english: q.prompt, max: LIMITS.prompt, rows: 2 })}

      {lists.map(({ field, label, word: what, english: list }) => {
        const translatedList = Array.isArray(t[field]) ? t[field] : []
        return (
          <fieldset key={field}>
            <legend className="label">
              {label} in {word}
            </legend>
            <p className="-mt-1 mb-2 text-sm text-muted">
              Translate all of them, or leave all empty to use the English. Single words are not translated automatically (machine translation often gets them wrong), so type them here.
            </p>
            <ol className="space-y-2">
              {list.map((english, i) => (
                <li key={i} className="grid gap-1 sm:grid-cols-[12rem_1fr] sm:items-center sm:gap-3">
                  <span className="text-sm text-muted">
                    {i + 1}. {english || '(empty)'}
                    {q.type === 'mcq' && english && english === q.answer && ' (right answer)'}
                  </span>
                  <input
                    lang={lang}
                    value={translatedList[i] ?? ''}
                    onChange={(e) => {
                      const next = list.map((_, j) => (j === i ? e.target.value : translatedList[j] ?? ''))
                      set({ [field]: next })
                    }}
                    maxLength={LIMITS.option}
                    aria-label={`${word} for ${what} ${i + 1}`}
                    className="field"
                  />
                </li>
              ))}
            </ol>
          </fieldset>
        )
      })}
      {q.type === 'input' && <p className="text-muted">The right answer stays the same in every language: {q.answer || '(empty)'}.</p>}

      <div className="grid gap-4 sm:grid-cols-2">
        {Field({ field: 'hint', label: 'Hint', english: q.hint, max: LIMITS.hint })}
        {Field({ field: 'explanation', label: 'Explanation', english: q.explanation, max: LIMITS.explanation })}
      </div>

      {problems.length > 0 && (
        <ul role="alert" className="rounded-xl bg-warn-soft p-4 text-warn">
          {problems.map((p) => (
            <li key={p} className="font-semibold">
              {p}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
