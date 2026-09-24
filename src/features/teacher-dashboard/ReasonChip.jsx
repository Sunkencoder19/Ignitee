import { Clock, TrendingDown } from 'lucide-react'

// Why a student needs attention. Amber with an icon and words, so the
// warning never rests on colour alone.
export default function ReasonChip({ reason }) {
  const Icon = reason.kind === 'low-score' ? TrendingDown : Clock
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2.5 py-1 text-sm font-semibold text-amber-700">
      <Icon aria-hidden="true" className="h-4 w-4" />
      {reason.text}
    </span>
  )
}
