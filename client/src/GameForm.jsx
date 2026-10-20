// The teacher's forms for setting up a game question. QuestionForm.jsx shows the
// one that matches the question's type, under the question text, hint and so on.
//
// A game has no "right answer" box: the answer is worked out from the board
// (gameAnswer in shared/game.js), so it can never disagree with what students see.
// Each form shows the board the way a student will see it, and the answer it works out.
// These screens are for teachers, so they are in English.

import { COLOURS, LIMITS, OBJECTS, SHAPES, TINTED, gameAnswer, gameProblems, gameView, parseTile, tileKey } from './game'
import { ObjectArt, TileArt } from './GameArt'
import GameBoard from './Games'

const cap = (word) => word.charAt(0).toUpperCase() + word.slice(1)

// A new question of a game type, with a small working example to start from.
export function blankGame(type) {
  const examples = {
    count: { groups: [{ object: 'mango', count: 5 }, { object: 'bird', count: 3 }], target: 0 },
    pattern: { sequence: ['circle:red', 'square:blue', 'circle:red', 'square:blue', 'circle:red'], gaps: [3], extras: ['triangle:green'] },
    match: { tiles: ['circle:red', 'square:blue', 'triangle:green'] },
    numberline: { ask: 'land', min: 0, max: 20, start: 2, step: 3, jumps: 4 },
    placevalue: { ask: 'build', places: 3, target: 246 },
    truefalse: { truth: true },
    unscramble: { word: 'apple' },
    pairs: { pairs: [{ a: 'Cow', b: 'Moo' }, { a: 'Cat', b: 'Meow' }, { a: 'Dog', b: 'Woof' }] },
    sort: { groups: [{ name: 'Living', items: ['Dog', 'Tree'] }, { name: 'Non-living', items: ['Stone', 'Chair'] }] },
  }
  const config = examples[type]
  return { config, answer: gameAnswer({ type, config }) }
}

// Shows the board as students will see it, switched off (so a click does nothing).
function Preview({ q }) {
  if (gameProblems(q).length) {
    return <p className="rounded-xl bg-bg p-4 text-muted">Finish the setup above to see the board.</p>
  }
  return (
    <div className="max-w-md rounded-2xl bg-bg p-4">
      <p className="font-semibold text-muted">What students see</p>
      <GameBoard type={q.type} view={gameView(q)} value={null} onChange={() => {}} locked result={null} answer={null} />
    </div>
  )
}

const selectClass = 'field min-h-12'

// ---------- count ----------

export function CountForm({ q, onChange, id }) {
  const config = q.config
  const setConfig = (next) => onChange({ ...q, config: next, answer: gameAnswer({ type: 'count', config: next }) })
  const setGroup = (i, changes) => setConfig({ ...config, groups: config.groups.map((g, j) => (j === i ? { ...g, ...changes } : g)) })

  function changeObject(i, object) {
    const { colour, ...rest } = config.groups[i]
    setGroup(i, TINTED.includes(object) ? { ...rest, object, colour: colour ?? 'blue' } : { ...rest, object, colour: undefined })
  }

  function addGroup() {
    const used = config.groups.map((g) => g.object)
    const object = OBJECTS.find((o) => !used.includes(o)) ?? 'tile'
    setConfig({ ...config, groups: [...config.groups, { object, ...(TINTED.includes(object) ? { colour: 'blue' } : {}), count: 3 }] })
  }

  function removeGroup(i) {
    const target = config.target === i ? 0 : config.target > i ? config.target - 1 : config.target
    setConfig({ groups: config.groups.filter((_, j) => j !== i), target })
  }

  const problems = gameProblems(q)

  return (
    <div className="space-y-4">
      <fieldset>
        <legend className="label">Objects on the board</legend>
        <p className="-mt-1 mb-2 text-sm text-muted">
          Students count the group you choose. Add a second group to make it harder (for example, count only the birds).
        </p>
        <ul className="space-y-3">
          {config.groups.map((g, i) => (
            <li key={i} className="flex flex-wrap items-center gap-3 rounded-xl bg-bg p-3">
              <ObjectArt object={g.object} colour={g.colour} size={44} />
              <select aria-label={`Group ${i + 1} object`} value={g.object} onChange={(e) => changeObject(i, e.target.value)} className={`${selectClass} w-32`}>
                {OBJECTS.map((o) => (
                  <option key={o} value={o}>
                    {cap(o)}
                  </option>
                ))}
              </select>
              {TINTED.includes(g.object) && (
                <select aria-label={`Group ${i + 1} colour`} value={g.colour ?? ''} onChange={(e) => setGroup(i, { colour: e.target.value })} className={`${selectClass} w-32`}>
                  {COLOURS.map((c) => (
                    <option key={c} value={c}>
                      {cap(c)}
                    </option>
                  ))}
                </select>
              )}
              <input
                type="number"
                inputMode="numeric"
                min={1}
                max={LIMITS.maxPerGroup}
                aria-label={`Group ${i + 1} how many`}
                value={g.count ?? ''}
                onChange={(e) => setGroup(i, { count: e.target.value === '' ? null : Number(e.target.value) })}
                className={`${selectClass} w-20 text-center`}
              />
              <label className="inline-flex min-h-12 items-center gap-2 font-semibold">
                <input
                  type="radio"
                  name={id('target')}
                  checked={config.target === i}
                  onChange={() => setConfig({ ...config, target: i })}
                  className="size-5 accent-[var(--color-accent)]"
                />
                Students count this
              </label>
              <button
                type="button"
                onClick={() => removeGroup(i)}
                disabled={config.groups.length <= 1}
                className="ml-auto inline-flex min-h-12 items-center px-2 font-semibold text-muted hover:text-ink disabled:opacity-30"
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
        {config.groups.length < LIMITS.maxGroups && (
          <button type="button" onClick={addGroup} className="mt-2 inline-flex min-h-12 items-center font-semibold text-accent">
            Add a group
          </button>
        )}
      </fieldset>

      <p className="font-semibold">
        Right answer: <span className="text-accent">{q.answer || 'not set yet'}</span>
      </p>
      {problems.length === 0 && <Preview q={q} />}
    </div>
  )
}

// ---------- pattern ----------

// One tile's two pickers: shape and colour.
function TilePicker({ tile, onChange, label }) {
  const parsed = parseTile(tile) ?? { shape: 'circle', colour: 'red' }
  return (
    <>
      <TileArt tile={tileKey(parsed.shape, parsed.colour)} size={44} />
      <select aria-label={`${label} shape`} value={parsed.shape} onChange={(e) => onChange(tileKey(e.target.value, parsed.colour))} className={`${selectClass} w-32`}>
        {SHAPES.map((s) => (
          <option key={s} value={s}>
            {cap(s)}
          </option>
        ))}
      </select>
      <select aria-label={`${label} colour`} value={parsed.colour} onChange={(e) => onChange(tileKey(parsed.shape, e.target.value))} className={`${selectClass} w-32`}>
        {COLOURS.map((c) => (
          <option key={c} value={c}>
            {cap(c)}
          </option>
        ))}
      </select>
    </>
  )
}

export function PatternForm({ q, onChange }) {
  const config = q.config
  const setConfig = (next) => onChange({ ...q, config: next, answer: gameAnswer({ type: 'pattern', config: next }) })

  function setTile(i, tile) {
    setConfig({ ...config, sequence: config.sequence.map((t, j) => (j === i ? tile : t)) })
  }

  function toggleGap(i) {
    const gaps = config.gaps.includes(i) ? config.gaps.filter((g) => g !== i) : [...config.gaps, i].sort((a, b) => a - b)
    setConfig({ ...config, gaps })
  }

  function removeTile(i) {
    setConfig({
      ...config,
      sequence: config.sequence.filter((_, j) => j !== i),
      gaps: config.gaps.filter((g) => g !== i).map((g) => (g > i ? g - 1 : g)),
    })
  }

  const problems = gameProblems(q)

  return (
    <div className="space-y-4">
      <fieldset>
        <legend className="label">The row of tiles</legend>
        <p className="-mt-1 mb-2 text-sm text-muted">
          Tick &ldquo;Hidden&rdquo; on the tile or tiles (at most {LIMITS.maxGaps}) students must find. They drag the right tile into the gap.
        </p>
        <ol className="space-y-2">
          {config.sequence.map((tile, i) => (
            <li key={i} className="flex flex-wrap items-center gap-3 rounded-xl bg-bg p-3">
              <span className="w-6 text-right font-semibold text-muted">{i + 1}.</span>
              <TilePicker tile={tile} onChange={(next) => setTile(i, next)} label={`Tile ${i + 1}`} />
              <label className="inline-flex min-h-12 items-center gap-2 font-semibold">
                <input
                  type="checkbox"
                  checked={config.gaps.includes(i)}
                  disabled={!config.gaps.includes(i) && config.gaps.length >= LIMITS.maxGaps}
                  onChange={() => toggleGap(i)}
                  className="size-5 accent-[var(--color-accent)]"
                />
                Hidden
              </label>
              <button
                type="button"
                onClick={() => removeTile(i)}
                disabled={config.sequence.length <= LIMITS.minPattern}
                className="ml-auto inline-flex min-h-12 items-center px-2 font-semibold text-muted hover:text-ink disabled:opacity-30"
              >
                Remove
              </button>
            </li>
          ))}
        </ol>
        {config.sequence.length < LIMITS.maxPattern && (
          <button
            type="button"
            onClick={() => setConfig({ ...config, sequence: [...config.sequence, config.sequence[config.sequence.length - 1] ?? 'circle:red'] })}
            className="mt-2 inline-flex min-h-12 items-center font-semibold text-accent"
          >
            Add a tile
          </button>
        )}
      </fieldset>

      <fieldset>
        <legend className="label">Extra tiles that don&rsquo;t belong (optional)</legend>
        <p className="-mt-1 mb-2 text-sm text-muted">They are mixed in with the right tiles to choose from. An extra can&rsquo;t match a hidden tile.</p>
        <ul className="space-y-2">
          {config.extras.map((tile, i) => (
            <li key={i} className="flex flex-wrap items-center gap-3 rounded-xl bg-bg p-3">
              <TilePicker tile={tile} onChange={(next) => setConfig({ ...config, extras: config.extras.map((t, j) => (j === i ? next : t)) })} label={`Extra tile ${i + 1}`} />
              <button
                type="button"
                onClick={() => setConfig({ ...config, extras: config.extras.filter((_, j) => j !== i) })}
                className="ml-auto inline-flex min-h-12 items-center px-2 font-semibold text-muted hover:text-ink"
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
        {config.extras.length < LIMITS.maxDecoys && (
          <button type="button" onClick={() => setConfig({ ...config, extras: [...config.extras, 'triangle:green'] })} className="mt-2 inline-flex min-h-12 items-center font-semibold text-accent">
            Add an extra tile
          </button>
        )}
      </fieldset>

      <p className="font-semibold">
        Hidden tiles, in order:{' '}
        <span className="inline-flex items-center gap-1 align-middle">
          {q.answer.length ? q.answer.map((k, i) => <TileArt key={i} tile={k} size={32} />) : <span className="text-accent">not set yet</span>}
        </span>
      </p>
      {problems.length === 0 && <Preview q={q} />}
    </div>
  )
}

// ---------- match ----------

export function MatchForm({ q, onChange }) {
  const tiles = q.config.tiles
  const setTiles = (next) => onChange({ ...q, config: { tiles: next }, answer: gameAnswer({ type: 'match', config: { tiles: next } }) })
  const problems = gameProblems(q)

  return (
    <div className="space-y-4">
      <fieldset>
        <legend className="label">Pictures to match with their names</legend>
        <p className="-mt-1 mb-2 text-sm text-muted">
          Students see each picture and a list of names (like &ldquo;red circle&rdquo;, written in their language) and pair them up. Pictures that share a shape need different
          colours, so every name fits only one picture.
        </p>
        <ol className="space-y-2">
          {tiles.map((tile, i) => (
            <li key={i} className="flex flex-wrap items-center gap-3 rounded-xl bg-bg p-3">
              <span className="w-6 text-right font-semibold text-muted">{i + 1}.</span>
              <TilePicker tile={tile} onChange={(next) => setTiles(tiles.map((x, j) => (j === i ? next : x)))} label={`Picture ${i + 1}`} />
              <button
                type="button"
                onClick={() => setTiles(tiles.filter((_, j) => j !== i))}
                disabled={tiles.length <= LIMITS.minMatch}
                className="ml-auto inline-flex min-h-12 items-center px-2 font-semibold text-muted hover:text-ink disabled:opacity-30"
              >
                Remove
              </button>
            </li>
          ))}
        </ol>
        {tiles.length < LIMITS.maxMatch && (
          <button
            type="button"
            onClick={() => setTiles([...tiles, SHAPES.map((s) => tileKey(s, 'yellow')).find((k) => !tiles.includes(k)) ?? 'diamond:purple'])}
            className="mt-2 inline-flex min-h-12 items-center font-semibold text-accent"
          >
            Add a picture
          </button>
        )}
      </fieldset>
      {problems.length === 0 && <Preview q={q} />}
    </div>
  )
}

// ---------- number line ----------

function NumberField({ label, value, onChange, min, max }) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      <input
        type="number"
        inputMode="numeric"
        min={min}
        max={max}
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value === '' ? null : Number(e.target.value))}
        className="field text-center"
      />
    </label>
  )
}

export function NumberLineForm({ q, onChange }) {
  const c = q.config
  const setConfig = (changes) => {
    const next = { ...c, ...changes }
    onChange({ ...q, config: next, answer: gameAnswer({ type: 'numberline', config: next }) })
  }
  const problems = gameProblems(q)

  function changeAsk(ask) {
    if (ask === c.ask) return
    const { jumps, target, ...rest } = c
    setConfig(ask === 'count' ? { ...rest, ask, target: c.start + c.step * Math.max(1, Math.min(4, jumps ?? 4)) } : { ...rest, ask, jumps: 4 })
  }

  return (
    <div className="space-y-4">
      <div className="max-w-md">
        <label htmlFor="numberline-ask" className="label">
          What do students work out?
        </label>
        <select id="numberline-ask" value={c.ask} onChange={(e) => changeAsk(e.target.value)} className="field">
          <option value="land">Where the frog lands after some jumps</option>
          <option value="count">How many jumps it takes to reach the flag</option>
        </select>
      </div>

      <div className="grid max-w-xl grid-cols-2 gap-3 sm:grid-cols-4">
        <NumberField label="First number" value={c.min} onChange={(v) => setConfig({ min: v })} />
        <NumberField label="Last number" value={c.max} onChange={(v) => setConfig({ max: v })} />
        <NumberField label="Start at" value={c.start} onChange={(v) => setConfig({ start: v })} />
        <NumberField label="Jump size" value={c.step} onChange={(v) => setConfig({ step: v })} />
        {c.ask === 'land' ? (
          <NumberField label="Number of jumps" value={c.jumps} onChange={(v) => setConfig({ jumps: v })} />
        ) : (
          <NumberField label="Flag at" value={c.target} onChange={(v) => setConfig({ target: v })} />
        )}
      </div>
      <p className="text-sm text-muted">A negative jump size makes the frog jump backwards. The line can hold up to {LIMITS.maxSpan + 1} numbers.</p>

      <p className="font-semibold">
        Right answer: <span className="text-accent">{q.answer || 'not set yet'}</span>
      </p>
      {problems.length === 0 && <Preview q={q} />}
    </div>
  )
}

// ---------- place value ----------

export function PlaceValueForm({ q, onChange }) {
  const c = q.config
  const setConfig = (changes) => {
    const next = { ...c, ...changes }
    onChange({ ...q, config: next, answer: gameAnswer({ type: 'placevalue', config: next }) })
  }
  const problems = gameProblems(q)

  return (
    <div className="space-y-4">
      <div className="grid max-w-xl gap-3 sm:grid-cols-3">
        <div>
          <label htmlFor="placevalue-ask" className="label">
            Students
          </label>
          <select id="placevalue-ask" value={c.ask} onChange={(e) => setConfig({ ask: e.target.value })} className="field">
            <option value="build">Build the number shown</option>
            <option value="read">Read the blocks shown</option>
          </select>
        </div>
        <div>
          <label htmlFor="placevalue-places" className="label">
            Places
          </label>
          <select id="placevalue-places" value={c.places} onChange={(e) => setConfig({ places: Number(e.target.value) })} className="field">
            <option value={2}>2 (tens and ones)</option>
            <option value={3}>3 (up to hundreds)</option>
            <option value={4}>4 (up to thousands)</option>
          </select>
        </div>
        <NumberField label="The number" value={c.target} onChange={(v) => setConfig({ target: v })} min={1} />
      </div>
      <p className="font-semibold">
        Right answer: <span className="text-accent">{q.answer || 'not set yet'}</span>
      </p>
      {problems.length === 0 && <Preview q={q} />}
    </div>
  )
}

// ---------- activities for any subject ----------

export function TrueFalseForm({ q, onChange }) {
  const setTruth = (truth) => onChange({ ...q, config: { truth }, answer: gameAnswer({ type: 'truefalse', config: { truth } }) })
  return (
    <div className="space-y-4">
      <fieldset>
        <legend className="label">Is the statement true?</legend>
        <p className="-mt-1 mb-2 text-sm text-muted">Write the statement in the question box above. Students tap True or False.</p>
        <div className="flex flex-wrap gap-3">
          {[
            [true, 'True'],
            [false, 'False'],
          ].map(([value, label]) => (
            <label key={label} className="inline-flex min-h-12 items-center gap-2 rounded-full bg-bg px-5 font-semibold">
              <input type="radio" name="truth" checked={q.config.truth === value} onChange={() => setTruth(value)} className="size-5 accent-[var(--color-accent)]" />
              {label}
            </label>
          ))}
        </div>
      </fieldset>
      <Preview q={q} />
    </div>
  )
}

export function UnscrambleForm({ q, onChange }) {
  const problems = gameProblems(q)
  const setWord = (word) => onChange({ ...q, config: { word }, answer: gameAnswer({ type: 'unscramble', config: { word } }) })
  return (
    <div className="space-y-4">
      <div className="max-w-sm">
        <label htmlFor="unscramble-word" className="label">
          The word students spell
        </label>
        <input id="unscramble-word" value={q.config.word} onChange={(e) => setWord(e.target.value)} maxLength={LIMITS.maxWord * 2} className="field text-xl font-semibold" />
        <p className="mt-1 text-sm text-muted">One word, 2 to {LIMITS.maxWord} letters, in any language. Its letters are mixed up and students tap them back in order. Use the hint to describe the word.</p>
      </div>
      {problems.length === 0 && <Preview q={q} />}
    </div>
  )
}

export function PairsForm({ q, onChange }) {
  const pairs = q.config.pairs
  const setPairs = (next) => onChange({ ...q, config: { pairs: next }, answer: gameAnswer({ type: 'pairs', config: { pairs: next } }) })
  const problems = gameProblems(q)
  return (
    <div className="space-y-4">
      <fieldset>
        <legend className="label">Pairs to match</legend>
        <p className="-mt-1 mb-2 text-sm text-muted">For example an animal and its sound, a word and its meaning, or a country and its capital. Students see both columns mixed up and pair them.</p>
        <ol className="space-y-2">
          {pairs.map((pair, i) => (
            <li key={i} className="flex flex-wrap items-center gap-2 rounded-xl bg-bg p-3">
              <span className="w-6 text-right font-semibold text-muted">{i + 1}.</span>
              <input aria-label={`Pair ${i + 1} left`} value={pair.a} maxLength={LIMITS.option} onChange={(e) => setPairs(pairs.map((x, j) => (j === i ? { ...x, a: e.target.value } : x)))} className="field min-w-0 flex-1" />
              <span aria-hidden="true" className="font-semibold text-muted">=</span>
              <input aria-label={`Pair ${i + 1} right`} value={pair.b} maxLength={LIMITS.option} onChange={(e) => setPairs(pairs.map((x, j) => (j === i ? { ...x, b: e.target.value } : x)))} className="field min-w-0 flex-1" />
              <button type="button" disabled={pairs.length <= LIMITS.minPairs} onClick={() => setPairs(pairs.filter((_, j) => j !== i))} className="inline-flex min-h-12 items-center px-2 font-semibold text-muted hover:text-ink disabled:opacity-30">
                Remove
              </button>
            </li>
          ))}
        </ol>
        {pairs.length < LIMITS.maxPairs && (
          <button type="button" onClick={() => setPairs([...pairs, { a: '', b: '' }])} className="mt-2 inline-flex min-h-12 items-center font-semibold text-accent">
            Add a pair
          </button>
        )}
      </fieldset>
      {problems.length === 0 && <Preview q={q} />}
    </div>
  )
}

export function SortForm({ q, onChange }) {
  const groups = q.config.groups
  const setGroups = (next) => onChange({ ...q, config: { groups: next }, answer: gameAnswer({ type: 'sort', config: { groups: next } }) })
  const setGroup = (i, changes) => setGroups(groups.map((g, j) => (j === i ? { ...g, ...changes } : g)))
  const problems = gameProblems(q)
  return (
    <div className="space-y-4">
      <fieldset>
        <legend className="label">Groups and what belongs in each</legend>
        <p className="-mt-1 mb-2 text-sm text-muted">For example Living and Non-living, or Nouns and Verbs. Students get all the items mixed up and sort them into the groups.</p>
        <div className="space-y-3">
          {groups.map((group, g) => (
            <div key={g} className="rounded-xl bg-bg p-3">
              <div className="flex items-center gap-2">
                <input aria-label={`Group ${g + 1} name`} value={group.name} maxLength={LIMITS.groupName} onChange={(e) => setGroup(g, { name: e.target.value })} className="field flex-1 font-semibold" placeholder="Group name" />
                <button type="button" disabled={groups.length <= LIMITS.minSortGroups} onClick={() => setGroups(groups.filter((_, j) => j !== g))} className="inline-flex min-h-12 items-center px-2 font-semibold text-muted hover:text-ink disabled:opacity-30">
                  Remove group
                </button>
              </div>
              <ul className="mt-2 space-y-2">
                {group.items.map((item, i) => (
                  <li key={i} className="flex items-center gap-2 pl-4">
                    <input aria-label={`Group ${g + 1} item ${i + 1}`} value={item} maxLength={LIMITS.sortItem} onChange={(e) => setGroup(g, { items: group.items.map((x, j) => (j === i ? e.target.value : x)) })} className="field flex-1" />
                    <button type="button" disabled={group.items.length <= 1} onClick={() => setGroup(g, { items: group.items.filter((_, j) => j !== i) })} className="inline-flex min-h-12 items-center px-2 font-semibold text-muted hover:text-ink disabled:opacity-30">
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
              {group.items.length < LIMITS.maxSortPerGroup && (
                <button type="button" onClick={() => setGroup(g, { items: [...group.items, ''] })} className="mt-1 ml-4 inline-flex min-h-12 items-center font-semibold text-accent">
                  Add an item
                </button>
              )}
            </div>
          ))}
        </div>
        {groups.length < LIMITS.maxSortGroups && (
          <button type="button" onClick={() => setGroups([...groups, { name: '', items: [''] }])} className="mt-2 inline-flex min-h-12 items-center font-semibold text-accent">
            Add a group
          </button>
        )}
      </fieldset>
      {problems.length === 0 && <Preview q={q} />}
    </div>
  )
}
