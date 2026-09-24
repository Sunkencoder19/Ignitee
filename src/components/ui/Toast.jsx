import { X } from 'lucide-react'

// One toast card. The aria-live region lives in the parent and stays mounted,
// so screen readers announce each toast as it appears without moving focus.
export default function Toast({ icon, eyebrow, title, message, onClose }) {
  return (
    <div className="flex items-start gap-3 rounded-2xl bg-paper p-4 shadow-lift ring-2 ring-sun-400 motion-safe:animate-toast-in">
      {icon && (
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-sun-400/20 text-ink-900">
          {icon}
        </span>
      )}
      <div className="min-w-0 flex-1 pt-0.5">
        {eyebrow && (
          <p className="text-xs font-semibold uppercase tracking-widest text-ember-700">
            {eyebrow}
          </p>
        )}
        <p className="font-heading text-lg font-bold text-ink-900">{title}</p>
        {message && <p className="text-sm">{message}</p>}
      </div>
      <button
        type="button"
        onClick={onClose}
        aria-label="Close"
        className="-m-2 grid h-12 w-12 shrink-0 place-items-center rounded-xl text-ink-600 hover:bg-ink-900/5 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ember-500/40"
      >
        <X aria-hidden="true" className="h-5 w-5" />
      </button>
    </div>
  )
}
