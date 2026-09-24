// Initials in a circle. Students pick an animal avatar in the data, but
// there are no pictures yet, so initials keep every screen consistent.
// TODO(fattesing): draw the animal avatars and use `avatar` from students.json.

const SIZES = {
  sm: 'h-10 w-10 text-sm',
  md: 'h-12 w-12 text-base',
  lg: 'h-16 w-16 text-2xl',
}

function initials(name) {
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

export default function Avatar({ name, size = 'sm', className = 'bg-sky-500/10' }) {
  return (
    <span
      aria-hidden="true"
      className={`grid shrink-0 place-items-center rounded-full font-heading font-bold text-ink-900 ${SIZES[size]} ${className}`}
    >
      {initials(name)}
    </span>
  )
}
