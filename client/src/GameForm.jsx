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
  const config =
    type === 'count'
      ? { groups: [{ object: 'mango', count: 5 }, { object: 'bird', count: 3 }], target: 0 }
      : { sequence: ['circle:red', 'square:blue', 'circle:red', 'square:blue', 'circle:red'], gaps: [3], extras: ['triangle:green'] }
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
