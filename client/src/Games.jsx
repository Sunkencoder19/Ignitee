// The play area of each game, shown by Question.jsx under the question text.
//
//   <GameBoard type view value onChange locked result answer />
//
//   view     what the student received (gameView in shared/game.js): the board only, never the answer
//   value    what the student has done so far: a count as text ('7') or a list of tile keys
//   onChange called with the new value every time the student does something
//   locked   true while the answer is being checked or once it is settled
//   result   null, 'correct' or 'revealed' (the app showing the right answer)
//   answer   the right answer, once the app has revealed it
//
// Built with plain React, CSS and SVG, and pointer events (one code path for
// finger, pen and mouse), so it runs on cheap phones with no library.
// Every move also works by a simple tap, and every piece is a real button,
// so a child who cannot drag, or uses a keyboard, can still play.
// All words come from the language files (games.*).

import { useEffect, useRef, useState } from 'react'
import { FlagArt, FrogArt, ObjectArt, PLACES, PLACE_HEX, PlaceBlock, TileArt, objectName, tileName } from './GameArt'
import { useT } from './i18n/t'

export default function GameBoard(props) {
  if (props.type === 'count') return <CountBoard {...props} />
  if (props.type === 'pattern') return <PatternBoard {...props} />
  if (props.type === 'match') return <MatchBoard {...props} />
  if (props.type === 'pairs') return <PairsBoard {...props} />
  if (props.type === 'sort') return <SortBoard {...props} />
  if (props.type === 'truefalse') return <TrueFalseBoard {...props} />
  if (props.type === 'unscramble') return <UnscrambleBoard {...props} />
  if (props.type === 'numberline') return <NumberLineBoard {...props} />
  if (props.type === 'placevalue') return <PlaceValueBoard {...props} />
  return null
}

// ---------- count ----------

// The same board always lays out the same way: a small seeded shuffle, so
// objects of different kinds are mixed and the picture doesn't jump when the page redraws.
function seeded(text) {
  let a = 0
  for (const ch of text) a = (Math.imul(a, 31) + ch.charCodeAt(0)) >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function layOut(groups) {
  const random = seeded(JSON.stringify(groups))
  const items = groups.flatMap((g, group) => Array.from({ length: g.count }, () => ({ object: g.object, colour: g.colour, group })))
  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    ;[items[i], items[j]] = [items[j], items[i]]
  }
  // A little push and tilt so it looks like things on a table, not a spreadsheet.
  return items.map((item) => ({ ...item, dx: (random() - 0.5) * 14, dy: (random() - 0.5) * 14, turn: (random() - 0.5) * 20 }))
}

const MAX_COUNT = 20

function CountBoard({ view, value, onChange, locked, result }) {
  const t = useT()
  const [marked, setMarked] = useState([]) // positions the child has tapped while counting
  const items = layOut(view.groups)
  const columns = items.length <= 3 ? items.length : items.length <= 8 ? 4 : 5
  const n = Number(value ?? 0)
  const set = (next) => onChange(String(Math.max(0, Math.min(MAX_COUNT, next))))

  function toggle(i) {
    setMarked(marked.includes(i) ? marked.filter((m) => m !== i) : [...marked, i])
  }

  return (
    <div className="mt-5">
      <div className="flex items-center gap-3">
        <span className="text-lg font-semibold">{t('games.count.howMany')}</span>
        <ObjectArt object={view.ask.object} colour={view.ask.colour} size={48} label={objectName(view.ask.object, view.ask.colour, t)} />
      </div>

      <div className="game-board mt-3 grid gap-1 p-2" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>
        {items.map((item, i) => {
          const name = objectName(item.object, item.colour, t)
          const isMarked = marked.includes(i)
          const asked = locked && item.object === view.ask.object && item.colour === view.ask.colour
          return (
            <button
              key={i}
              type="button"
              disabled={locked}
              aria-pressed={isMarked}
              aria-label={isMarked ? t('games.count.marked', { name }) : t('games.count.tapToMark', { name })}
              onClick={() => toggle(i)}
              className={`relative aspect-square min-h-14 rounded-xl p-1.5 motion-safe:transition-transform motion-safe:active:scale-95 ${asked ? 'ring-4 ring-[#c2410c]' : ''}`}
            >
              <span className={`block size-full motion-safe:transition-opacity ${isMarked ? 'opacity-40' : ''}`} style={{ transform: `translate(${item.dx}%, ${item.dy}%) rotate(${item.turn}deg)` }}>
                <ObjectArt object={item.object} colour={item.colour} size="100%" />
              </span>
              {isMarked && (
                <svg viewBox="0 0 24 24" className="absolute right-1 top-1 size-6" aria-hidden="true" focusable="false">
                  <circle cx="12" cy="12" r="11" fill="#0e7a4f" />
                  <path d="M6.5 12.5 L10.5 16.5 L17.5 8" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </button>
          )
        })}
      </div>

      <p className="mt-3 text-muted">{t('games.count.tapHint')}</p>
      <p className="font-semibold" aria-live="polite">
        {t('games.count.counted', { count: marked.length })}
      </p>

      <div className="mt-4 flex items-center gap-3" role="group" aria-label={t('games.count.yourCount')}>
        <button
          type="button"
          disabled={locked || n <= 0}
          onClick={() => set(n - 1)}
          aria-label={t('games.count.fewer')}
          className="grid size-14 shrink-0 place-items-center rounded-full border-2 border-line bg-surface text-3xl font-semibold hover:border-accent disabled:opacity-40"
        >
          <span aria-hidden="true">&minus;</span>
        </button>
        <output
          aria-live="polite"
          className={`grid min-h-14 min-w-24 flex-1 place-items-center rounded-xl border-2 text-3xl font-semibold ${
            result === 'correct' ? 'border-good bg-good-soft' : 'border-line bg-surface'
          }`}
        >
          {n}
        </output>
        <button
          type="button"
          disabled={locked || n >= MAX_COUNT}
          onClick={() => set(n + 1)}
          aria-label={t('games.count.more')}
          className="grid size-14 shrink-0 place-items-center rounded-full border-2 border-line bg-surface text-3xl font-semibold hover:border-accent disabled:opacity-40"
        >
          <span aria-hidden="true">+</span>
        </button>
      </div>
    </div>
  )
}

// ---------- pattern ----------

const MOVE_BEFORE_DRAG = 8 // pixels: less than this is a tap, more is a drag

function PatternBoard({ view, onChange, locked, result, answer }) {
  const t = useT()
  // slots[g] is which tile of view.choices sits in gap g (or null)
  const [slots, setSlots] = useState(() => view.gaps.map(() => null))
  const [drag, setDrag] = useState(null) // { tray } while a tile is being dragged
  const [hover, setHover] = useState(null) // the gap under the dragged tile
  const gapEls = useRef([])
  const ghost = useRef(null)
  const press = useRef(null) // the pointer that is down: { tray, x0, y0, moved }
  const pointer = useRef({ x: 0, y: 0 })

  const used = new Set(slots.filter((s) => s !== null))
  const shownKeys = result === 'revealed' && answer ? answer : slots.map((s) => (s === null ? null : view.choices[s]))

  // Tell the page what is in each gap, as tile keys (never positions in the tray).
  function change(next) {
    setSlots(next)
    onChange(next.map((s) => (s === null ? null : view.choices[s])))
  }

  function put(tray, gap) {
    const next = slots.map((s) => (s === tray ? null : s)) // a tile can only be in one place
    next[gap] = tray
    change(next)
  }

  function putInFirstEmpty(tray) {
    const gap = slots.findIndex((s) => s === null)
    if (gap !== -1) put(tray, gap)
  }

  function gapAt(x, y) {
    const slack = 10 // a drop close to a gap counts
    const found = gapEls.current.findIndex((el) => {
      if (!el) return false
      const b = el.getBoundingClientRect()
      return x >= b.left - slack && x <= b.right + slack && y >= b.top - slack && y <= b.bottom + slack
    })
    return found === -1 ? null : found
  }

  function onDown(e, tray) {
    if (locked || used.has(tray)) return
    e.currentTarget.setPointerCapture(e.pointerId)
    press.current = { tray, x0: e.clientX, y0: e.clientY, moved: false }
    pointer.current = { x: e.clientX, y: e.clientY }
  }

  function onMove(e) {
    const p = press.current
    if (!p) return
    pointer.current = { x: e.clientX, y: e.clientY }
    if (!p.moved && Math.hypot(e.clientX - p.x0, e.clientY - p.y0) > MOVE_BEFORE_DRAG) {
      p.moved = true
      setDrag({ tray: p.tray })
    }
    if (p.moved) {
      // The floating copy follows the finger directly, without redrawing React on every move.
      if (ghost.current) ghost.current.style.transform = `translate(${e.clientX - 36}px, ${e.clientY - 36}px)`
      const over = gapAt(e.clientX, e.clientY)
      setHover((old) => (old === over ? old : over))
    }
  }

  function onUp(e) {
    const p = press.current
    press.current = null
    if (!p) return
    setDrag(null)
    setHover(null)
    if (p.moved) {
      const gap = gapAt(e.clientX, e.clientY)
      if (gap !== null) put(p.tray, gap)
    } else {
      putInFirstEmpty(p.tray) // a tap
    }
  }

  function onCancel() {
    press.current = null
    setDrag(null)
    setHover(null)
  }

  // A drag that ends outside the window should not leave the tile stuck.
  useEffect(() => {
    window.addEventListener('blur', onCancel)
    return () => window.removeEventListener('blur', onCancel)
  }, [])

  // Up to 5 tiles share one row; more are split into two even rows. Each tile is as
  // wide as the row allows, up to 64px, and never narrower than 48px on a 375px phone.
  const columns = view.sequence.length <= 5 ? view.sequence.length : Math.ceil(view.sequence.length / 2)
  const cell = 'relative grid aspect-square w-full max-w-16 justify-self-center place-items-center rounded-xl p-1'

  return (
    <div className="mt-5">
      <div role="group" aria-label={t('games.pattern.row')} className="game-board grid gap-1.5 p-2" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>
        {view.sequence.map((tile, i) => {
          if (tile !== null) {
            return (
              <span key={i} className={`${cell} border border-[#d3e0f5] bg-white`}>
                <TileArt tile={tile} size="100%" label={tileName(tile, t)} />
              </span>
            )
          }
          const g = view.gaps.indexOf(i)
          const key = shownKeys[g]
          const style =
            result === 'correct' || result === 'revealed'
              ? 'border-2 border-[#0e7a4f] bg-[#e6f7ef]'
              : hover === g
                ? 'border-2 border-[#c2410c] bg-[#ffe9d6]'
                : key
                  ? 'border-2 border-[#0b1f3a]/30 bg-white'
                  : 'border-2 border-dashed border-[#6f86ad] bg-white/70'
          return (
            <button
              key={i}
              type="button"
              ref={(el) => (gapEls.current[g] = el)}
              disabled={locked || !key}
              aria-label={key ? t('games.pattern.gapFilled', { number: g + 1, tile: tileName(key, t) }) : t('games.pattern.gapEmpty', { number: g + 1 })}
              onClick={() => change(slots.map((s, j) => (j === g ? null : s)))}
              className={`${cell} ${style} disabled:opacity-100 ${!key && !locked ? 'motion-safe:animate-pulse' : ''}`}
            >
              {key && <TileArt tile={key} size="100%" />}
            </button>
          )
        })}
      </div>

      {!result && <p className="mt-3 text-muted">{t('games.pattern.help')}</p>}

      <div role="group" aria-label={t('games.pattern.tray')} className="game-board mt-3 flex flex-wrap justify-center gap-3 p-3">
        {view.choices.map((tile, i) => (
          <button
            key={i}
            type="button"
            disabled={locked || used.has(i)}
            aria-label={t('games.pattern.choose', { tile: tileName(tile, t) })}
            onPointerDown={(e) => onDown(e, i)}
            onPointerMove={onMove}
            onPointerUp={onUp}
            onPointerCancel={onCancel}
            // Mouse and touch are handled by the pointer events above; a click with no
            // pointer (detail 0) is a keyboard or screen reader pressing the button.
            onClick={(e) => e.detail === 0 && putInFirstEmpty(i)}
            style={{ touchAction: 'none' }}
            className={`grid size-16 place-items-center rounded-xl border-2 border-[#d3e0f5] bg-white p-1.5 select-none motion-safe:transition-opacity ${
              used.has(i) || drag?.tray === i ? 'opacity-25' : 'cursor-grab motion-safe:active:scale-95'
            }`}
          >
            <TileArt tile={tile} size="100%" />
          </button>
        ))}
      </div>

      {drag && (
        <div
          ref={ghost}
          aria-hidden="true"
          className="pointer-events-none fixed left-0 top-0 z-50 size-[72px] rounded-xl bg-white p-1.5 shadow-float ring-2 ring-[#c2410c]"
          style={{ transform: `translate(${pointer.current.x - 36}px, ${pointer.current.y - 36}px)` }}
        >
          <TileArt tile={view.choices[drag.tray]} size="100%" />
        </div>
      )}
    </div>
  )
}

// ---------- match and pairs ----------
// Two columns; tap one thing, then tap its partner to pair them (a number and a
// colour show which go together); tap a pair again to undo it. Used for:
//   match: shape pictures and their names
//   pairs: words and their partners (animal and sound, word and meaning, ...)
// A pair is written 'leftKey|rightKey'.

const PAIR_COLOURS = ['#ff5d73', '#2f6fed', '#1fa36a', '#a06bff', '#ff8a00']

function PairBoard({ lefts, rights, value, onChange, locked, result, answer, titles, labels }) {
  const t = useT()
  const [picked, setPicked] = useState(null) // the one waiting for its partner: { side, key }
  const made = value ?? []
  const shown = (labels.reveal && result === 'revealed' && answer ? answer : made).map((pair) => pair.split('|'))
  const pairOf = (side, key) => shown.findIndex(([left, right]) => (side === 'left' ? left : right) === key)

  function press(side, key) {
    if (locked) return
    const at = pairOf(side, key)
    if (at !== -1) {
      onChange(made.filter((_, i) => i !== at))
      setPicked(null)
    } else if (!picked || picked.side === side) {
      setPicked({ side, key })
    } else {
      const left = side === 'left' ? key : picked.key
      const right = side === 'right' ? key : picked.key
      onChange([...made, `${left}|${right}`])
      setPicked(null)
    }
  }

  const item = (side, { key, name, art }) => {
    const at = pairOf(side, key)
    const colour = at === -1 ? null : PAIR_COLOURS[at % PAIR_COLOURS.length]
    const waiting = picked && picked.side === side && picked.key === key
    return (
      <button
        key={`${side}-${key}`}
        type="button"
        disabled={locked}
        aria-pressed={at !== -1 || Boolean(waiting)}
        aria-label={at !== -1 ? t(labels.paired, { name, number: at + 1 }) : t(side === 'left' ? labels.pick : labels.match, { name })}
        onClick={() => press(side, key)}
        style={colour ? { borderColor: colour } : undefined}
        className={`relative flex min-h-16 items-center justify-center rounded-xl border-4 bg-white p-2 text-center text-base font-semibold motion-safe:transition-transform motion-safe:active:scale-95 disabled:opacity-100 ${
          waiting ? 'border-[#c2410c] bg-[#fff1e6]' : at === -1 ? 'border-[#d3e0f5]' : ''
        }`}
      >
        {art ?? name}
        {at !== -1 && (
          <span style={{ background: colour }} className="absolute -right-2 -top-2 grid size-7 place-items-center rounded-full text-base font-bold leading-none text-white">
            {at + 1}
          </span>
        )}
      </button>
    )
  }

  return (
    <div className="mt-5">
      <div className="game-board grid grid-cols-2 gap-x-3 gap-y-3 p-3">
        {titles && <p className="font-semibold text-[#3b4a66]">{t(titles[0])}</p>}
        {titles && <p className="font-semibold text-[#3b4a66]">{t(titles[1])}</p>}
        <div className="grid content-start gap-3">{lefts.map((x) => item('left', x))}</div>
        <div className="grid content-start gap-3">{rights.map((x) => item('right', x))}</div>
      </div>
      {!result && <p className="mt-3 text-muted">{t(labels.help)}</p>}
    </div>
  )
}

function MatchBoard({ view, ...rest }) {
  const t = useT()
  return (
    <PairBoard
      {...rest}
      lefts={view.tiles.map((key) => ({ key, name: tileName(key, t), art: <TileArt tile={key} size={44} /> }))}
      rights={view.words.map((key) => ({ key, name: tileName(key, t) }))}
      titles={['games.match.pictures', 'games.match.names']}
      labels={{ pick: 'games.match.tile', match: 'games.match.word', paired: 'games.match.paired', help: 'games.match.help', reveal: true }}
    />
  )
}

function PairsBoard({ view, ...rest }) {
  return (
    <PairBoard
      {...rest}
      lefts={view.lefts.map((x) => ({ key: String(x.id), name: x.text }))}
      rights={view.rights.map((x) => ({ key: String(x.id), name: x.text }))}
      labels={{ pick: 'games.pairs.pick', match: 'games.pairs.match', paired: 'games.pairs.paired', help: 'games.pairs.help' }}
    />
  )
}

// ---------- number line ----------
// A frog on a number line. "Jump" hops it one step along (and Undo takes the last hop back).
//   ask 'land':  jump the stated number of times and read where the frog lands
//   ask 'count': jump until the frog reaches the flag, and count the jumps
// The answer given is the landing number or the number of jumps.

const LINE_W = 340
const LINE_PAD = 20
const LINE_Y = 104

function NumberLineBoard({ view, onChange, locked }) {
  const t = useT()
  const [jumps, setJumps] = useState(0)
  const { min, max, start, step, ask } = view
  const at = (jumpCount) => start + step * jumpCount
  const position = at(jumps)
  const next = position + step
  const canJump = !locked && next >= min && next <= max && jumps < 20
  const x = (value) => LINE_PAD + ((value - min) / (max - min)) * (LINE_W - LINE_PAD * 2)
  const count = max - min + 1
  const labelEvery = count <= 11 ? 1 : count <= 21 ? 2 : 5

  function setJumpCount(n) {
    setJumps(n)
    onChange(n === 0 ? null : String(ask === 'count' ? n : at(n)))
  }

  const numbers = Array.from({ length: count }, (_, i) => min + i)

  return (
    <div className="mt-5">
      <div className="flex flex-wrap gap-2">
        <span className="pill">{t('games.numberline.start', { n: start })}</span>
        <span className="pill">{t(step > 0 ? 'games.numberline.stepForward' : 'games.numberline.stepBack', { n: Math.abs(step) })}</span>
        <span className="pill">
          {ask === 'count'
            ? t('games.numberline.goal', { n: view.target })
            : t('games.numberline.jumpsOf', { count: jumps, total: view.jumps })}
        </span>
        {ask === 'count' && <span className="pill">{t('games.numberline.jumps', { count: jumps })}</span>}
      </div>

      <div className="game-board mt-3 p-1">
        <svg viewBox={`0 0 ${LINE_W} 150`} className="block w-full" role="img" aria-label={t('games.numberline.line', { min, max })}>
          <line x1={LINE_PAD - 8} y1={LINE_Y} x2={LINE_W - LINE_PAD + 8} y2={LINE_Y} stroke="#0b1f3a" strokeWidth="4" strokeLinecap="round" />
          {numbers.map((value) => (
            <g key={value}>
              <line x1={x(value)} y1={LINE_Y - 8} x2={x(value)} y2={LINE_Y + 8} stroke="#0b1f3a" strokeWidth="3" strokeLinecap="round" />
              {((value - min) % labelEvery === 0 || value === position || value === start) && (
                <text x={x(value)} y={LINE_Y + 32} textAnchor="middle" fontSize="19" fontWeight={value === position ? 800 : 600} fill={value === position ? '#c2410c' : '#0b1f3a'}>
                  {value}
                </text>
              )}
            </g>
          ))}
          {/* the hops so far, as arcs */}
          {Array.from({ length: jumps }, (_, k) => (
            <path
              key={k}
              d={`M${x(at(k))} ${LINE_Y - 10} Q${(x(at(k)) + x(at(k + 1))) / 2} ${LINE_Y - 56} ${x(at(k + 1))} ${LINE_Y - 10}`}
              fill="none"
              stroke="#6c3df0"
              strokeWidth="4"
              strokeLinecap="round"
              strokeDasharray="1 9"
            />
          ))}
          {ask === 'count' && (
            <g transform={`translate(${x(view.target) - 14} ${LINE_Y - 56})`}>
              <FlagArt size={44} />
            </g>
          )}
          <circle cx={x(start)} cy={LINE_Y} r="7" fill="#1fa36a" stroke="#0b1f3a" strokeWidth="2.5" />
          <g className="frog-hop" style={{ transform: `translate(${x(position) - 25}px, ${LINE_Y - 56}px)` }}>
            <FrogArt size={50} />
          </g>
        </svg>
      </div>

      <p className="mt-3 font-semibold" aria-live="polite">
        {t('games.numberline.frogOn', { n: position })}
      </p>
      {jumps === 0 && !locked && <p className="text-muted">{t('games.numberline.tapJump')}</p>}

      <div className="mt-3 grid grid-cols-[1fr_2fr] gap-3">
        <button type="button" disabled={locked || jumps === 0} onClick={() => setJumpCount(jumps - 1)} className="btn btn-secondary min-h-14">
          {t('games.numberline.undo')}
        </button>
        <button type="button" disabled={!canJump} onClick={() => setJumpCount(jumps + 1)} className="btn btn-primary min-h-14 text-lg">
          {t('games.numberline.jump')}
        </button>
      </div>
    </div>
  )
}

// ---------- place value ----------
// Columns for ones, tens, hundreds and thousands. + and - add or take away a block in
// a column; the number they make is shown underneath.
//   ask 'build': make the number that is shown
//   ask 'read':  the blocks are shown; set the columns to the number they make

function Blocks({ place, count }) {
  return (
    <div className="flex min-h-[5.5rem] flex-wrap content-start gap-1">
      {Array.from({ length: count }, (_, i) => (
        <PlaceBlock key={i} place={place} size={26} />
      ))}
    </div>
  )
}

function PlaceValueBoard({ view, onChange, locked }) {
  const t = useT()
  const [digits, setDigits] = useState(() => Array(view.places).fill(0)) // digits[0] is the ones
  const valueOf = (list) => list.reduce((sum, d, i) => sum + d * 10 ** i, 0)
  const order = Array.from({ length: view.places }, (_, i) => view.places - 1 - i) // thousands first
  const columns = view.places === 4 ? 2 : view.places
  const shownDigits = String(view.target).padStart(view.places, '0').split('').reverse().map(Number) // for 'read'

  function change(place, by) {
    const next = digits.map((d, i) => (i === place ? Math.max(0, Math.min(9, d + by)) : d))
    setDigits(next)
    onChange(String(valueOf(next)))
  }

  const grid = { gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }

  return (
    <div className="mt-5 space-y-4">
      {view.ask === 'build' ? (
        <p className="font-semibold">
          {t('games.place.target')} <span className="font-display text-4xl text-accent">{view.target}</span>
        </p>
      ) : (
        <div>
          <p className="font-semibold">{t('games.place.look')}</p>
          <div className="game-board mt-2 grid gap-2 p-2" style={grid}>
            {order.map((place) => (
              <div key={place} className="rounded-xl bg-white p-2">
                <p className="font-semibold" style={{ color: PLACE_HEX[PLACES[place]] }}>
                  {t(`games.place.${PLACES[place]}`)}
                </p>
                <Blocks place={PLACES[place]} count={shownDigits[place]} />
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="game-board grid gap-2 p-2" style={grid}>
        {order.map((place) => {
          const name = t(`games.place.${PLACES[place]}`)
          return (
            <div key={place} className="rounded-xl bg-white p-2">
              <p className="font-semibold" style={{ color: PLACE_HEX[PLACES[place]] }}>
                {name}
              </p>
              <Blocks place={PLACES[place]} count={digits[place]} />
              <div className="mt-1 grid gap-1">
                <button
                  type="button"
                  disabled={locked || digits[place] === 9}
                  onClick={() => change(place, 1)}
                  aria-label={t('games.place.plus', { place: name })}
                  className="grid h-12 w-full place-items-center rounded-xl border-2 border-[#d3e0f5] bg-white text-2xl font-bold motion-safe:active:scale-95 disabled:opacity-35"
                >
                  <span aria-hidden="true">+</span>
                </button>
                <span className="text-center font-display text-3xl leading-none" aria-label={t('games.place.count', { place: name, count: digits[place] })}>
                  {digits[place]}
                </span>
                <button
                  type="button"
                  disabled={locked || digits[place] === 0}
                  onClick={() => change(place, -1)}
                  aria-label={t('games.place.minus', { place: name })}
                  className="grid h-12 w-full place-items-center rounded-xl border-2 border-[#d3e0f5] bg-white text-2xl font-bold motion-safe:active:scale-95 disabled:opacity-35"
                >
                  <span aria-hidden="true">&minus;</span>
                </button>
              </div>
            </div>
          )
        })}
      </div>

      <p className="font-semibold" aria-live="polite">
        {t('games.place.yourNumber')}: <span className="font-display text-4xl text-accent">{valueOf(digits)}</span>
      </p>
    </div>
  )
}

// ---------- true or false ----------
// The question is a statement. Two big buttons: True and False.

function TrueFalseBoard({ value, onChange, locked }) {
  const t = useT()
  const options = [
    { key: 'true', colour: '#0f7a4d', soft: '#dff7ea', mark: <path d="M5 12.5 10 17.5 19 7" /> },
    { key: 'false', colour: '#c23b3b', soft: '#fdeaea', mark: <path d="M6 6 18 18M18 6 6 18" /> },
  ]
  return (
    <div className="mt-5 grid grid-cols-2 gap-3">
      {options.map((o) => {
        const on = value === o.key
        return (
          <button
            key={o.key}
            type="button"
            disabled={locked}
            aria-pressed={on}
            onClick={() => onChange(o.key)}
            style={{ borderColor: o.colour, background: on ? o.colour : o.soft, color: on ? '#fff' : o.colour }}
            className="flex min-h-24 flex-col items-center justify-center gap-1 rounded-3xl border-4 font-display text-2xl shadow-[0_5px_0_rgb(0_0_0/0.18)] motion-safe:transition-transform motion-safe:active:translate-y-1 motion-safe:active:shadow-none disabled:opacity-100"
          >
            <svg viewBox="0 0 24 24" width="34" height="34" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round">
              {o.mark}
            </svg>
            {t(`games.truefalse.${o.key}`)}
          </button>
        )
      })}
    </div>
  )
}

// ---------- unscramble ----------
// The letters of a word are mixed up. Tap them in the right order to spell it;
// tap a letter in the row to take it back.

function UnscrambleBoard({ view, onChange, locked }) {
  const t = useT()
  const [picked, setPicked] = useState([]) // tray positions, in the order they were tapped
  const word = (list) => list.map((i) => view.letters[i]).join('')

  function change(next) {
    setPicked(next)
    onChange(word(next))
  }

  return (
    <div className="mt-5">
      <p className="font-semibold">{t('games.unscramble.yourWord')}</p>
      <div className="game-board mt-2 flex flex-wrap justify-center gap-2 p-3">
        {view.letters.map((_, slot) => {
          const at = picked[slot]
          return at === undefined ? (
            <span key={slot} aria-hidden="true" className="size-14 rounded-xl border-2 border-dashed border-[#6f86ad] bg-white/70" />
          ) : (
            <button
              key={slot}
              type="button"
              disabled={locked}
              aria-label={t('games.unscramble.takeBack', { letter: view.letters[at] })}
              onClick={() => change(picked.filter((_, i) => i !== slot))}
              className="grid size-14 place-items-center rounded-xl border-2 border-[#0b1f3a]/30 bg-white font-display text-3xl disabled:opacity-100"
            >
              {view.letters[at]}
            </button>
          )
        })}
      </div>

      <div className="game-board mt-3 flex flex-wrap justify-center gap-2 p-3">
        {view.letters.map((letter, i) => (
          <button
            key={i}
            type="button"
            disabled={locked || picked.includes(i)}
            aria-label={t('games.unscramble.letter', { letter })}
            onClick={() => change([...picked, i])}
            className={`grid size-14 place-items-center rounded-xl border-2 border-[#d3e0f5] bg-[#ffe9a8] font-display text-3xl shadow-[0_4px_0_#d9b44a] motion-safe:active:translate-y-1 motion-safe:active:shadow-none ${picked.includes(i) ? 'opacity-25' : ''}`}
          >
            {letter}
          </button>
        ))}
      </div>

      <div className="mt-3 flex items-center justify-between gap-3">
        {!locked && <p className="text-muted">{t('games.unscramble.help')}</p>}
        <button type="button" disabled={locked || picked.length === 0} onClick={() => change([])} className="btn btn-secondary ml-auto min-h-12 px-5">
          {t('games.unscramble.clear')}
        </button>
      </div>
    </div>
  )
}

// ---------- sort ----------
// Items to sort into groups. Tap an item, then tap the group it belongs to;
// tap an item that is already in a group to take it out.

const GROUP_COLOURS = ['#2f6fed', '#1fa36a', '#a06bff']

function SortBoard({ view, value, onChange, locked }) {
  const t = useT()
  const [picked, setPicked] = useState(null) // an item id waiting for its group
  const placed = new Map((value ?? []).map((pair) => pair.split('|').map(Number)))
  const textOf = (id) => view.items.find((x) => x.id === id).text
  const waiting = view.items.filter((x) => !placed.has(x.id))

  function put(group) {
    if (picked === null || locked) return
    onChange([...(value ?? []), `${picked}|${group}`])
    setPicked(null)
  }

  function takeOut(id) {
    if (locked) return
    onChange((value ?? []).filter((pair) => Number(pair.split('|')[0]) !== id))
  }

  return (
    <div className="mt-5 space-y-3">
      <div className="grid gap-3">
        {view.groups.map((name, g) => (
          <div key={g} className="game-board p-2" style={{ borderColor: GROUP_COLOURS[g % GROUP_COLOURS.length] }}>
            <button
              type="button"
              disabled={locked || picked === null}
              onClick={() => put(g)}
              aria-label={picked === null ? name : t('games.sort.putIn', { item: textOf(picked), group: name })}
              className="flex min-h-12 w-full items-center justify-between gap-2 rounded-xl px-3 text-left font-display text-xl text-white disabled:opacity-100"
              style={{ background: GROUP_COLOURS[g % GROUP_COLOURS.length], opacity: picked === null ? 0.95 : 1, outline: picked === null ? 'none' : '3px solid #c2410c' }}
            >
              <span>{name}</span>
              {picked !== null && <span className="text-base font-semibold">{t('games.sort.putHere')}</span>}
            </button>
            <div className="mt-2 flex min-h-14 flex-wrap gap-2">
              {view.items
                .filter((x) => placed.get(x.id) === g)
                .map((x) => (
                  <button
                    key={x.id}
                    type="button"
                    disabled={locked}
                    onClick={() => takeOut(x.id)}
                    aria-label={t('games.sort.remove', { item: x.text, group: name })}
                    className="min-h-12 rounded-xl border-2 border-[#d3e0f5] bg-white px-4 text-base font-bold disabled:opacity-100"
                  >
                    {x.text}
                  </button>
                ))}
            </div>
          </div>
        ))}
      </div>

      <div className="game-board p-3">
        <p className="font-semibold text-[#3b4a66]">{t('games.sort.pool')}</p>
        <div className="mt-2 flex min-h-14 flex-wrap gap-2">
          {waiting.length === 0 && <p className="self-center font-semibold text-[#3b4a66]">{t('games.sort.allSorted')}</p>}
          {waiting.map((x) => (
            <button
              key={x.id}
              type="button"
              disabled={locked}
              aria-pressed={picked === x.id}
              aria-label={t('games.sort.pick', { item: x.text })}
              onClick={() => setPicked(picked === x.id ? null : x.id)}
              className={`min-h-12 rounded-xl border-4 bg-white px-4 text-base font-bold motion-safe:active:scale-95 ${picked === x.id ? 'border-[#c2410c] bg-[#fff1e6]' : 'border-[#d3e0f5]'}`}
            >
              {x.text}
            </button>
          ))}
        </div>
      </div>
      {!locked && <p className="text-muted">{t('games.sort.help')}</p>}
    </div>
  )
}
