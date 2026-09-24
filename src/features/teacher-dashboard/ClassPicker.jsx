import { CLASS_OPTIONS } from '@/hooks/useClassChoice'

// 4A / 4B / All: one row above everything it filters on the page.
export default function ClassPicker({ classId, ownClassId, onChange }) {
  return (
    <div role="radiogroup" aria-label="Class" className="inline-flex rounded-2xl bg-ink-900/5 p-1">
      {CLASS_OPTIONS.map((option) => {
        const selected = option === classId
        const label = option === 'all' ? 'All classes' : `Class ${option}`
        return (
          <button
            key={option}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(option)}
            className={[
              'min-h-tap rounded-xl px-3 text-sm font-semibold transition sm:px-4',
              'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-sky-500/50',
              selected ? 'bg-paper text-ink-900 shadow-soft' : 'text-ink-600 hover:text-ink-900',
            ].join(' ')}
          >
            {label}
            {option === ownClassId && <span className="sr-only"> (your class)</span>}
          </button>
        )
      })}
    </div>
  )
}
