// The student's buddy: an animal friend that can be dressed up.
//
//   <Buddy mascot={{ buddy: 'fox', hat: 'party', face: null, neck: 'bow', background: 'sky' }} size={120} />
//   <Buddy mascot={...} bare />        just the animal and its clothes, no background (for small spots)
//
// The animals are ready-made art: Noto Emoji by Google (Apache License 2.0), kept in
// src/assets/buddies/ with its LICENSE. The clothes, glasses, scarves, capes and
// backgrounds are drawn here as plain SVG. To use a different set of animals, replace
// the files and the FRAME numbers below; nothing else depends on them.
//
// Everything is drawn on a 128 x 128 grid. FRAME says where each animal's head top
// (hat), eyes (glasses) and chin (bow tie, scarf) are, so one hat fits every animal.

import { useId } from 'react'
import bear from './assets/buddies/bear.svg'
import fox from './assets/buddies/fox.svg'
import lion from './assets/buddies/lion.svg'
import monkey from './assets/buddies/monkey.svg'
import owl from './assets/buddies/owl.svg'
import panda from './assets/buddies/panda.svg'

const ART = { fox, panda, monkey, bear, lion, owl }

// hat: [x, y of the head top, size]   eyes: [y, gap between the eyes]   chin: [x, y]
const FRAME = {
  fox: { hat: [64, 33, 0.8], eyes: [71, 33], chin: [64, 114] },
  panda: { hat: [64, 12, 1], eyes: [61, 45], chin: [64, 112] },
  monkey: { hat: [64, 17, 0.9], eyes: [59, 24], chin: [64, 114] },
  bear: { hat: [64, 15, 0.95], eyes: [60, 39], chin: [64, 112] },
  lion: { hat: [64, 14, 0.9], eyes: [50, 30], chin: [64, 116] },
  owl: { hat: [64, 11, 0.8], eyes: [41, 35], chin: [64, 92] },
}

const INK = '#1d2358'
const line = { stroke: INK, strokeWidth: 2.6, strokeLinejoin: 'round', strokeLinecap: 'round' }

// ---------- hats: drawn with the bottom centre of the hat at (0, 0), pointing up ----------

const HATS = {
  party: (
    <>
      <polygon points="-19,0 19,0 0,-46" fill="#ff5fa2" {...line} />
      <path d="M-12 -18 L12 -18 M-7 -32 L7 -32" stroke="#ffd84d" strokeWidth="5" strokeLinecap="round" />
      <circle cx="0" cy="-48" r="6.5" fill="#ffd84d" {...line} />
    </>
  ),
  cap: (
    <>
      <path d="M-27 0 C-27 -30 27 -30 27 0 Z" fill="#2f6fed" {...line} />
      <path d="M8 -3 C26 -9 46 -4 48 4 C32 7 16 6 8 3 Z" fill="#1f4fc4" {...line} />
      <circle cx="0" cy="-22" r="4" fill="#ffd84d" {...line} />
    </>
  ),
  chef: (
    <>
      <circle cx="-15" cy="-26" r="14" fill="#fff" {...line} />
      <circle cx="15" cy="-26" r="14" fill="#fff" {...line} />
      <circle cx="0" cy="-36" r="17" fill="#fff" {...line} />
      <rect x="-21" y="-16" width="42" height="16" rx="4" fill="#fff" {...line} />
    </>
  ),
  wizard: (
    <>
      <path d="M-24 0 C-12 -6 -4 -24 6 -52 C12 -28 20 -8 24 0 Z" fill="#6c3df0" {...line} />
      <ellipse cx="0" cy="0" rx="34" ry="7" fill="#5128c9" {...line} />
      <polygon points="1,-30 4,-23 11,-23 5,-18 8,-11 1,-15 -6,-11 -3,-18 -9,-23 -2,-23" fill="#ffd84d" stroke={INK} strokeWidth="1.6" strokeLinejoin="round" />
    </>
  ),
  crown: (
    <>
      <path d="M-28 0 L-28 -28 L-14 -13 L0 -34 L14 -13 L28 -28 L28 0 Z" fill="#ffc83d" {...line} />
      <rect x="-28" y="-6" width="56" height="6" fill="#f5a300" stroke={INK} strokeWidth="2.2" strokeLinejoin="round" />
      <circle cx="-28" cy="-30" r="4.2" fill="#ff5d73" {...line} />
      <circle cx="0" cy="-37" r="4.6" fill="#2f6fed" {...line} />
      <circle cx="28" cy="-30" r="4.2" fill="#2ea36b" {...line} />
    </>
  ),
}

// ---------- glasses: drawn centred between the eyes; r is half of a lens, g the gap between eyes ----------

const FACES = {
  round: ({ r, g }) => (
    <>
      <circle cx={-g / 2} cy="0" r={r} fill="#bfe6ff" fillOpacity="0.45" {...line} />
      <circle cx={g / 2} cy="0" r={r} fill="#bfe6ff" fillOpacity="0.45" {...line} />
      <path d={`M${-g / 2 + r} -1 Q0 -${r * 0.5} ${g / 2 - r} -1`} fill="none" {...line} />
    </>
  ),
  shades: ({ r, g }) => (
    <>
      <rect x={-g / 2 - r} y={-r * 0.8} width={r * 2} height={r * 1.6} rx={r * 0.6} fill={INK} />
      <rect x={g / 2 - r} y={-r * 0.8} width={r * 2} height={r * 1.6} rx={r * 0.6} fill={INK} />
      <path d={`M${-g / 2 + r} -1 L${g / 2 - r} -1`} stroke={INK} strokeWidth="3" strokeLinecap="round" />
      <path d={`M${-g / 2 - r * 0.5} ${-r * 0.4} l${r * 0.5} 0`} stroke="#fff" strokeWidth="2.4" strokeLinecap="round" opacity="0.7" />
    </>
  ),
  stars: ({ r, g }) => {
    const star = (cx) => {
      const pts = Array.from({ length: 10 }, (_, i) => {
        const rad = (i % 2 === 0 ? r * 1.15 : r * 0.5)
        const a = (Math.PI / 5) * i - Math.PI / 2
        return `${(cx + rad * Math.cos(a)).toFixed(1)},${(rad * Math.sin(a)).toFixed(1)}`
      }).join(' ')
      return <polygon points={pts} fill="#ffd84d" {...line} />
    }
    return (
      <>
        {star(-g / 2)}
        {star(g / 2)}
        <path d={`M${-g / 2 + r} -1 L${g / 2 - r} -1`} fill="none" {...line} />
      </>
    )
  },
}

// ---------- neck: drawn centred under the chin ----------

const NECKS = {
  bow: (
    <>
      <polygon points="0,0 -22,-12 -22,12" fill="#e5484d" {...line} />
      <polygon points="0,0 22,-12 22,12" fill="#e5484d" {...line} />
      <circle cx="0" cy="0" r="6" fill="#b4232c" {...line} />
    </>
  ),
  scarf: (
    <>
      <path d="M-46 -10 Q0 8 46 -10 L44 6 Q0 24 -44 6 Z" fill="#ffb020" {...line} />
      <path d="M-22 -14 L-12 -8 M0 -10 L0 0 M22 -14 L12 -8" stroke="#e5484d" strokeWidth="5" strokeLinecap="round" fill="none" />
      <path d="M16 8 L34 40 L20 44 L8 16 Z" fill="#ffb020" {...line} />
    </>
  ),
}

// The cape hangs behind the animal, so it is drawn first.
function Cape() {
  return (
    <>
      <path d="M26 96 Q64 80 102 96 L120 130 L8 130 Z" fill="#e5484d" {...line} />
      <path d="M44 106 Q64 98 84 106 L92 130 L36 130 Z" fill="#ff7a85" opacity="0.7" />
      <circle cx="64" cy="98" r="5" fill="#ffd84d" {...line} />
    </>
  )
}

// ---------- backgrounds ----------

function Background({ id, uid }) {
  const fill = `url(#${uid}-bg)`
  const stops = {
    sky: ['#aee0ff', '#eaf7ff'],
    sunset: ['#ffb36b', '#ff7aa8'],
    forest: ['#c8efc9', '#7fd08a'],
    space: ['#1b1650', '#4a2f9a'],
    rainbow: ['#fff3c9', '#ffe1f0'],
  }[id] ?? ['#aee0ff', '#eaf7ff']
  return (
    <>
      <defs>
        <linearGradient id={`${uid}-bg`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={stops[0]} />
          <stop offset="1" stopColor={stops[1]} />
        </linearGradient>
      </defs>
      <rect width="128" height="128" rx="24" fill={fill} />
      {id === 'sky' && (
        <>
          <ellipse cx="26" cy="26" rx="16" ry="7" fill="#fff" opacity="0.9" />
          <ellipse cx="38" cy="22" rx="10" ry="6" fill="#fff" opacity="0.9" />
          <ellipse cx="104" cy="40" rx="14" ry="6" fill="#fff" opacity="0.8" />
        </>
      )}
      {id === 'sunset' && (
        <>
          <circle cx="100" cy="30" r="14" fill="#ffe27a" />
          <ellipse cx="26" cy="98" rx="30" ry="7" fill="#fff" opacity="0.35" />
        </>
      )}
      {id === 'forest' && (
        <>
          <polygon points="0,128 14,74 28,128" fill="#2f9a5d" />
          <polygon points="18,128 36,84 54,128" fill="#3fb06d" />
          <polygon points="100,128 114,78 128,128" fill="#2f9a5d" />
          <polygon points="84,128 98,92 112,128" fill="#3fb06d" />
        </>
      )}
      {id === 'space' && (
        <>
          {[[14, 16], [34, 38], [96, 14], [112, 52], [20, 84], [108, 96], [60, 10]].map(([x, y], i) => (
            <circle key={i} cx={x} cy={y} r={i % 2 ? 1.6 : 2.4} fill="#fff" />
          ))}
          <circle cx="104" cy="28" r="9" fill="#ff8a3d" />
          <ellipse cx="104" cy="28" rx="15" ry="3.6" fill="none" stroke="#ffd84d" strokeWidth="2" />
        </>
      )}
      {id === 'rainbow' && (
        <>
          {['#e5484d', '#ffb020', '#ffd84d', '#2ea36b', '#2f6fed'].map((c, i) => (
            <path key={c} d={`M${6 + i * 6} 118 A${58 - i * 6} ${58 - i * 6} 0 0 1 ${122 - i * 6} 118`} fill="none" stroke={c} strokeWidth="5" opacity="0.85" />
          ))}
        </>
      )}
    </>
  )
}

// ---------- the buddy ----------

export default function Buddy({ mascot, size = 120, bare = false, label, className = '' }) {
  const uid = useId().replace(/:/g, '')
  const m = { buddy: 'fox', hat: null, face: null, neck: null, background: 'sky', ...mascot }
  const frame = FRAME[m.buddy] ?? FRAME.fox
  const [hx, hy, hs] = frame.hat
  const [ey, gap] = frame.eyes
  const [cx, cy] = frame.chin
  const r = Math.min(gap * 0.4, 13)
  const Face = m.face ? FACES[m.face] : null

  return (
    <svg
      viewBox="0 0 128 128"
      width={size}
      height={size}
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      focusable="false"
      className={className}
    >
      {!bare && <Background id={m.background} uid={uid} />}
      {/* the animal is drawn a little smaller than the frame, so tall hats and capes have room */}
      <g transform="translate(14 27) scale(0.78)">
        {m.neck === 'cape' && <Cape />}
        <image href={ART[m.buddy] ?? ART.fox} x="0" y="0" width="128" height="128" />
        {m.neck && m.neck !== 'cape' && <g transform={`translate(${cx} ${cy})`}>{NECKS[m.neck]}</g>}
        {Face && (
          <g transform={`translate(64 ${ey})`}>
            <Face r={r} g={gap} />
          </g>
        )}
        {m.hat && <g transform={`translate(${hx} ${hy}) scale(${hs})`}>{HATS[m.hat]}</g>}
      </g>
    </svg>
  )
}
