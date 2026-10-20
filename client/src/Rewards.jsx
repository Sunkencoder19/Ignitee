// Small pieces of celebration used all over the student screens:
//   <Stars earned={2} />     three SVG stars, gold for earned and grey for not yet
//   <Confetti />             coloured paper falling once (hidden for people who ask for less motion)
//   <Coin /> <Flame /> <Bolt />   the coin, streak and points icons
// All drawn here as inline SVG, so they look the same on every phone.

import { useT } from './i18n/t'

const STAR_POINTS = Array.from({ length: 10 }, (_, i) => {
  const radius = i % 2 === 0 ? 46 : 20
  const angle = (Math.PI / 5) * i - Math.PI / 2
  return `${(50 + radius * Math.cos(angle)).toFixed(1)},${(54 + radius * Math.sin(angle)).toFixed(1)}`
}).join(' ')

export function Stars({ earned, total = 3, size = 40, animate = false, className = '' }) {
  const t = useT()
  return (
    <span role="img" aria-label={t('stars.label', { count: earned, total })} className={`inline-flex items-center gap-1 ${className}`}>
      {Array.from({ length: total }, (_, i) => {
        const on = i < earned
        return (
          <svg
            key={i}
            viewBox="0 0 100 100"
            width={size}
            height={size}
            aria-hidden="true"
            focusable="false"
            className={animate && on ? 'star-pop' : ''}
            style={animate && on ? { animationDelay: `${300 + i * 220}ms` } : undefined}
          >
            <polygon
              points={STAR_POINTS}
              fill={on ? '#ffc83d' : 'var(--star-off)'}
              stroke={on ? '#e08a00' : 'var(--star-off-line)'}
              strokeWidth="6"
              strokeLinejoin="round"
            />
            {on && <path d="M34 40 L44 28" stroke="#fff" strokeWidth="6" strokeLinecap="round" opacity="0.8" />}
          </svg>
        )
      })}
    </span>
  )
}

const CONFETTI = ['#ff5d73', '#ffc83d', '#2f6fed', '#1fa36a', '#a06bff', '#ff8a00']

export function Confetti({ count = 40 }) {
  return (
    <div aria-hidden="true" className="confetti pointer-events-none fixed inset-0 z-30 overflow-hidden">
      {Array.from({ length: count }, (_, i) => (
        <span
          key={i}
          style={{
            left: `${(i * 37 + 11) % 100}%`,
            background: CONFETTI[i % CONFETTI.length],
            animationDelay: `${(i % 9) * 120}ms`,
            animationDuration: `${2400 + (i % 5) * 300}ms`,
            width: 8 + (i % 3) * 3,
            height: 12 + (i % 4) * 3,
            '--drift': `${((i * 53) % 120) - 60}px`,
            '--turn': `${(i * 97) % 720}deg`,
          }}
        />
      ))}
    </div>
  )
}

export function Coin({ size = 24 }) {
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} aria-hidden="true" focusable="false">
      <circle cx="50" cy="50" r="44" fill="#ffc83d" stroke="#e08a00" strokeWidth="7" />
      <circle cx="50" cy="50" r="30" fill="none" stroke="#e08a00" strokeWidth="5" opacity="0.7" />
      <polygon points="50,28 56,44 73,44 59,54 65,71 50,61 35,71 41,54 27,44 44,44" fill="#fff6c9" stroke="#e08a00" strokeWidth="3" strokeLinejoin="round" />
    </svg>
  )
}

export function Flame({ size = 24 }) {
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} aria-hidden="true" focusable="false">
      <path d="M50 6 C54 26 78 38 78 62 C78 82 64 94 50 94 C36 94 22 82 22 62 C22 48 30 40 36 32 C38 42 44 46 46 46 C44 32 44 18 50 6 Z" fill="#ff7a1a" stroke="#d94a00" strokeWidth="5" strokeLinejoin="round" />
      <path d="M50 54 C56 64 64 68 64 78 C64 87 57 92 50 92 C43 92 36 87 36 78 C36 68 46 64 50 54 Z" fill="#ffd84d" />
    </svg>
  )
}

export function Bolt({ size = 24 }) {
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} aria-hidden="true" focusable="false">
      <path d="M58 6 L22 56 H46 L38 94 L78 40 H54 Z" fill="#7b4dff" stroke="#4b27c9" strokeWidth="6" strokeLinejoin="round" />
    </svg>
  )
}
