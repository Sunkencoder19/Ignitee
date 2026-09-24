const SIZES = {
  sm: 'h-5 w-5 border-2',
  md: 'h-8 w-8 border-[3px]',
  lg: 'h-12 w-12 border-4',
}

export default function Spinner({ size = 'md', label = 'Loading', className = '' }) {
  return (
    <span role="status" className={`inline-flex items-center justify-center ${className}`}>
      <span
        className={`${SIZES[size]} animate-spin rounded-full border-ember-500/25 border-t-ember-500`}
      />
      <span className="sr-only">{label}</span>
    </span>
  )
}
