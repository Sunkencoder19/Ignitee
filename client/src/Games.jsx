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
import { ObjectArt, TileArt, objectName, tileName } from './GameArt'
import { useT } from './i18n/t'

export default function GameBoard(props) {
  if (props.type === 'count') return <CountBoard {...props} />
  if (props.type === 'pattern') return <PatternBoard {...props} />
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
