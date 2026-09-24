import { getTint } from '@/lib/tints'

const HEIGHTS = {
  sm: 'h-2',
  md: 'h-3',
  lg: 'h-4',
}

export default function ProgressBar({
  value,
  max = 100,
  tint = 'ember',
  size = 'md',
  label,
  showValue = false,
  className = '',
}) {
  const safeMax = max > 0 ? max : 1
  const pct = Math.round(Math.min(Math.max(value / safeMax, 0), 1) * 100)

  return (
    <div className={className}>
      {(label || showValue) && (
        <div className="mb-1.5 flex items-baseline justify-between text-sm font-semibold">
          {label && <span className="text-ink-900">{label}</span>}
          {showValue && (
            <span className="text-ink-600">
              {value}/{max}
            </span>
          )}
        </div>
      )}
      <div
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-valuenow={value}
        className={`w-full overflow-hidden rounded-full bg-ink-900/10 ${HEIGHTS[size]}`}
      >
        <div
          className={`h-full rounded-full transition-[width] duration-500 ease-out ${getTint(tint).solid}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}
