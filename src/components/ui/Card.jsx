import { getTint } from '@/lib/tints'

const PADDING = {
  none: '',
  sm: 'p-4',
  md: 'p-6',
}

export default function Card({
  children,
  tint,
  padding = 'md',
  interactive = false,
  as: Tag = 'div',
  className = '',
  ...rest
}) {
  return (
    <Tag
      className={[
        'relative overflow-hidden rounded-2xl bg-paper shadow-soft',
        PADDING[padding],
        interactive
          ? 'cursor-pointer transition duration-150 hover:-translate-y-0.5 hover:shadow-lift'
          : '',
        className,
      ].join(' ')}
      {...rest}
    >
      {tint && (
        <span
          aria-hidden="true"
          className={`absolute inset-x-0 top-0 h-1.5 ${getTint(tint).solid}`}
        />
      )}
      {children}
    </Tag>
  )
}
