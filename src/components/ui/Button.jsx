import Spinner from '@/components/ui/Spinner'

const VARIANTS = {
  // ember-700, not ember-500: white on #F97316 fails AA contrast
  primary: 'bg-ember-700 text-white shadow-soft hover:bg-ember-700/90 active:bg-ember-700',
  secondary: 'bg-paper text-ink-900 ring-2 ring-inset ring-ink-900/10 hover:ring-ember-500/60',
  // Faint 1px outline so it still reads as a button, just quieter than secondary
  ghost: 'bg-transparent text-ink-900 ring-1 ring-inset ring-ink-900/15 hover:bg-ink-900/5',
  success: 'bg-leaf-600 text-white shadow-soft hover:bg-leaf-600/90',
  danger: 'bg-berry-600 text-white shadow-soft hover:bg-berry-600/90',
}

// md is the floor: 48px is the smallest a 9-year-old's thumb hits reliably
const SIZES = {
  md: 'min-h-tap px-5 text-base gap-2',
  lg: 'min-h-[56px] px-7 text-lg gap-3',
}

export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  icon: Icon,
  iconRight: IconRight,
  loading = false,
  fullWidth = false,
  type = 'button',
  disabled,
  className = '',
  ...rest
}) {
  const isDisabled = disabled || loading

  return (
    <button
      type={type}
      disabled={isDisabled}
      className={[
        'inline-flex select-none items-center justify-center rounded-2xl font-heading font-semibold',
        'transition duration-150 active:scale-[0.97]',
        'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ember-500/40',
        'disabled:pointer-events-none disabled:opacity-50',
        VARIANTS[variant],
        SIZES[size],
        fullWidth ? 'w-full' : '',
        className,
      ].join(' ')}
      {...rest}
    >
      {loading ? (
        <Spinner size="sm" label="Please wait" />
      ) : (
        Icon && <Icon aria-hidden="true" className="h-5 w-5 shrink-0" />
      )}
      <span>{children}</span>
      {IconRight && !loading && <IconRight aria-hidden="true" className="h-5 w-5 shrink-0" />}
    </button>
  )
}
