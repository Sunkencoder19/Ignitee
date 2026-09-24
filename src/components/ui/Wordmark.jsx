import { Flame } from 'lucide-react'

const TONES = {
  dark: 'text-ink-900',
  light: 'text-white',
}

const SIZES = {
  md: { text: 'text-2xl', icon: 'h-6 w-6' },
  lg: { text: 'text-4xl', icon: 'h-9 w-9' },
}

// `compact` hides the word below the sm breakpoint so a 360px header has room.
export default function Wordmark({ tone = 'dark', size = 'md', compact = false, className = '' }) {
  return (
    <span className={`inline-flex items-center gap-1.5 ${className}`}>
      <Flame aria-hidden="true" className={`${SIZES[size].icon} fill-ember-500 text-ember-500`} />
      <span
        className={`font-heading font-bold leading-none tracking-wide ${SIZES[size].text} ${TONES[tone]} ${compact ? 'hidden sm:inline' : ''}`}
      >
        IGNITE
      </span>
    </span>
  )
}
