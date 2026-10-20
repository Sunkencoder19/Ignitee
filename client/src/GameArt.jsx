// The pictures used by the games, drawn as inline SVG so they look the same on
// every phone (emoji change shape from one phone to the next). Every picture is
// drawn on a 100 x 100 grid and scales to whatever size it is given.
//
//   <ObjectArt object="mango" />                a thing to count: mango, bird, tile, block
//   <TileArt tile="star:red" />                 a pattern tile: 'shape:colour'
//   objectName / tileName                       the same things in words, in the student's language
//
// Colours are fixed (not theme colours): games are played on a light board in both
// light and dark mode, so a red tile is the same red everywhere. Colours that are
// easy to mix up for a colour-blind child (red and green) also differ by a small
// mark in the middle of a tile, so no tile depends on colour alone.

import { parseTile } from './game'

export const COLOUR_HEX = {
  red: '#e5484d',
  blue: '#2f6fed',
  green: '#2ea36b',
  yellow: '#ffc83d',
  purple: '#8b5cf6',
}

const INK = '#0b1f3a' // the outline of everything

const outline = { stroke: INK, strokeWidth: 4, strokeLinejoin: 'round', strokeLinecap: 'round' }

// ---------- the words ----------

// "red tile" in English, "टाइल (लाल)" in Hindi: the order of the words is in the language files.
export function objectName(object, colour, t) {
  const name = t(`games.object.${object}`)
  return colour ? t('games.named', { colour: t(`games.colour.${colour}`), object: name }) : name
}

export function tileName(key, t) {
  const tile = parseTile(key)
  return tile ? t('games.tileName', { colour: t(`games.colour.${tile.colour}`), shape: t(`games.shape.${tile.shape}`) }) : ''
}

// The right answer of a game, or a student's answer, as words.
export function answerText(type, value, t) {
  if (type === 'pattern') return (Array.isArray(value) ? value : []).filter(Boolean).map((k) => tileName(k, t)).join(', ')
  if (type === 'truefalse') return t(`games.truefalse.${value}`)
  if (type === 'match') return (Array.isArray(value) ? value : []).map((pair) => tileName(String(pair).split('|')[0], t)).join(', ')
  return Array.isArray(value) ? value.join(', ') : value
}

// ---------- pattern tiles ----------

// A five-pointed star as polygon points.
const STAR = Array.from({ length: 10 }, (_, i) => {
  const radius = i % 2 === 0 ? 44 : 19
  const angle = (Math.PI / 5) * i - Math.PI / 2
  return `${(50 + radius * Math.cos(angle)).toFixed(1)},${(54 + radius * Math.sin(angle)).toFixed(1)}`
}).join(' ')

function Shape({ shape, fill }) {
  const common = { fill, ...outline }
  if (shape === 'circle') return <circle cx="50" cy="50" r="40" {...common} />
  if (shape === 'square') return <rect x="12" y="12" width="76" height="76" rx="12" {...common} />
  if (shape === 'triangle') return <path d="M50 10 L92 86 H8 Z" {...common} />
  if (shape === 'star') return <polygon points={STAR} {...common} />
  if (shape === 'diamond') return <polygon points="50,6 94,50 50,94 6,50" {...common} />
  return <path d="M50 88 C20 66 8 48 8 32 C8 18 19 10 30 10 C40 10 47 16 50 24 C53 16 60 10 70 10 C81 10 92 18 92 32 C92 48 80 66 50 88 Z" {...common} />
}

// The small mark in the middle that tells colours apart without colour.
function Mark({ colour }) {
  if (colour === 'blue') return <circle cx="50" cy="52" r="7" fill="#fff" />
  if (colour === 'green') return <rect x="36" y="48" width="28" height="8" rx="4" fill="#fff" />
  if (colour === 'yellow') return <circle cx="50" cy="52" r="7" fill={INK} />
  if (colour === 'purple') return <circle cx="50" cy="52" r="9" fill="none" stroke="#fff" strokeWidth="5" />
  return null
}

export function TileArt({ tile, size = 56, label }) {
  const parsed = parseTile(tile)
  if (!parsed) return null
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} role={label ? 'img' : undefined} aria-label={label} aria-hidden={label ? undefined : true} focusable="false">
      <Shape shape={parsed.shape} fill={COLOUR_HEX[parsed.colour]} />
      <Mark colour={parsed.colour} />
    </svg>
  )
}

// ---------- things to count ----------

function Mango() {
  // A slanted, slightly pointed fruit with a stem and a leaf, so it is not mistaken for an orange.
  return (
    <g transform="translate(6 6) scale(0.88) rotate(-32 50 52)">
      <path d="M50 8 C71 8 84 30 84 54 C84 77 68 95 50 95 C32 95 16 77 16 54 C16 30 29 8 50 8 Z" fill="#ffb020" {...outline} />
      <path d="M62 14 C78 24 84 42 82 60 C80 78 68 90 54 94 C70 78 74 36 62 14 Z" fill="#ff6f3c" opacity="0.65" />
      <path d="M28 50 C27 38 32 28 40 22" fill="none" stroke="#fff" strokeWidth="5" strokeLinecap="round" opacity="0.85" />
      <path d="M50 8 C50 2 52 -2 56 -4" fill="none" {...outline} />
      <path d="M52 8 C56 -4 70 -6 82 0 C78 12 62 14 52 8 Z" fill="#2ea36b" {...outline} />
    </g>
  )
}

function Bird() {
  return (
    <>
      <path d="M16 62 L2 50 L4 74 Z" fill="#1d4fc4" {...outline} />
      <circle cx="52" cy="54" r="34" fill="#4c8bff" {...outline} />
      <ellipse cx="58" cy="66" rx="20" ry="15" fill="#d8e6ff" />
      <path d="M34 56 C40 70 52 72 60 62 C54 50 42 48 34 56 Z" fill="#2f6fed" {...outline} />
      <path d="M82 44 L98 50 L82 58 Z" fill="#ff9d2e" {...outline} />
      <circle cx="70" cy="42" r="8" fill="#fff" stroke={INK} strokeWidth="3" />
      <circle cx="72" cy="42" r="3.5" fill={INK} />
      <path d="M46 88 V96 M60 88 V96" fill="none" stroke="#ff9d2e" strokeWidth="5" strokeLinecap="round" />
    </>
  )
}

function SquareTile({ colour }) {
  return (
    <>
      <rect x="10" y="10" width="80" height="80" rx="14" fill={COLOUR_HEX[colour]} {...outline} />
      <rect x="24" y="24" width="52" height="52" rx="8" fill="#fff" opacity="0.28" />
      <Mark colour={colour} />
    </>
  )
}

function Block({ colour }) {
  const fill = COLOUR_HEX[colour]
  return (
    <>
      <polygon points="10,30 50,50 50,92 10,72" fill={fill} {...outline} />
      <polygon points="90,30 50,50 50,92 90,72" fill={fill} {...outline} />
      <polygon points="90,30 50,50 50,92 90,72" fill="#000" opacity="0.22" />
      <polygon points="50,8 90,30 50,50 10,30" fill={fill} {...outline} />
      <polygon points="50,8 90,30 50,50 10,30" fill="#fff" opacity="0.34" />
      <g transform="translate(0 14)">
        <Mark colour={colour} />
      </g>
    </>
  )
}

export function ObjectArt({ object, colour = 'blue', size = 56, label }) {
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} role={label ? 'img' : undefined} aria-label={label} aria-hidden={label ? undefined : true} focusable="false">
      {object === 'mango' && <Mango />}
      {object === 'bird' && <Bird />}
      {object === 'tile' && <SquareTile colour={colour} />}
      {object === 'block' && <Block colour={colour} />}
    </svg>
  )
}

// ---------- number line and place value ----------

// The frog that jumps along the number line (drawn here, not taken from anywhere).
export function FrogArt({ size = 56 }) {
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} aria-hidden="true" focusable="false">
      <ellipse cx="22" cy="86" rx="14" ry="7" fill="#3eaf5c" {...outline} />
      <ellipse cx="78" cy="86" rx="14" ry="7" fill="#3eaf5c" {...outline} />
      <ellipse cx="50" cy="64" rx="35" ry="27" fill="#4cc36b" {...outline} />
      <ellipse cx="50" cy="72" rx="21" ry="13" fill="#c1f2cb" />
      <circle cx="32" cy="36" r="15" fill="#4cc36b" {...outline} />
      <circle cx="68" cy="36" r="15" fill="#4cc36b" {...outline} />
      <circle cx="32" cy="35" r="9" fill="#fff" stroke={INK} strokeWidth="3" />
      <circle cx="68" cy="35" r="9" fill="#fff" stroke={INK} strokeWidth="3" />
      <circle cx="34" cy="36" r="4.5" fill={INK} />
      <circle cx="66" cy="36" r="4.5" fill={INK} />
      <path d="M34 62 Q50 76 66 62" fill="none" stroke={INK} strokeWidth="4" strokeLinecap="round" />
      <circle cx="26" cy="58" r="5" fill="#ff8fa3" opacity="0.7" />
      <circle cx="74" cy="58" r="5" fill="#ff8fa3" opacity="0.7" />
    </svg>
  )
}

export function FlagArt({ size = 40 }) {
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} aria-hidden="true" focusable="false">
      <path d="M26 92 V10" stroke={INK} strokeWidth="7" strokeLinecap="round" />
      <path d="M26 12 L84 28 L26 46 Z" fill="#e5484d" {...outline} />
    </svg>
  )
}

// The colour of each place-value column.
export const PLACE_HEX = { ones: '#ff8a00', tens: '#1fa36a', hundreds: '#2f6fed', thousands: '#8b5cf6' }
export const PLACES = ['ones', 'tens', 'hundreds', 'thousands'] // lowest first

// One block in a place-value column: a small cube for ones, a rod for tens, a flat for
// hundreds and a big cube for thousands (all the same size on the board, in the column's colour).
export function PlaceBlock({ place, size = 22 }) {
  const fill = PLACE_HEX[place]
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true" focusable="false">
      {place === 'ones' && <rect x="5" y="5" width="14" height="14" rx="3" fill={fill} stroke={INK} strokeWidth="1.6" />}
      {place === 'tens' && (
        <>
          <rect x="8" y="1.5" width="8" height="21" rx="2.5" fill={fill} stroke={INK} strokeWidth="1.6" />
          <path d="M8 7 H16 M8 12 H16 M8 17 H16" stroke={INK} strokeWidth="1" opacity="0.5" />
        </>
      )}
      {place === 'hundreds' && (
        <>
          <rect x="2.5" y="2.5" width="19" height="19" rx="3" fill={fill} stroke={INK} strokeWidth="1.6" />
          <path d="M9 3 V21 M15 3 V21 M3 9 H21 M3 15 H21" stroke="#fff" strokeWidth="1" opacity="0.55" />
        </>
      )}
      {place === 'thousands' && (
        <>
          <polygon points="12,2 22,7 12,12 2,7" fill={fill} stroke={INK} strokeWidth="1.4" strokeLinejoin="round" />
          <polygon points="2,7 12,12 12,22 2,17" fill={fill} stroke={INK} strokeWidth="1.4" strokeLinejoin="round" />
          <polygon points="22,7 12,12 12,22 22,17" fill={fill} stroke={INK} strokeWidth="1.4" strokeLinejoin="round" />
          <polygon points="22,7 12,12 12,22 22,17" fill="#000" opacity="0.2" />
          <polygon points="12,2 22,7 12,12 2,7" fill="#fff" opacity="0.3" />
        </>
      )}
    </svg>
  )
}
