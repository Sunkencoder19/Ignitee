// Chapter tints. Written out in full because Tailwind only ships classes it
// can find as plain strings; `bg-${tint}-500` would get purged.
export const TINTS = {
  ember: {
    soft: 'bg-ember-500/10',
    solid: 'bg-ember-500',
    text: 'text-ember-700',
    ring: 'ring-ember-500',
  },
  sky: {
    soft: 'bg-sky-500/10',
    solid: 'bg-sky-500',
    text: 'text-sky-500',
    ring: 'ring-sky-500',
  },
  leaf: {
    soft: 'bg-leaf-600/10',
    solid: 'bg-leaf-600',
    text: 'text-leaf-600',
    ring: 'ring-leaf-600',
  },
  sun: {
    soft: 'bg-sun-400/20',
    solid: 'bg-sun-400',
    text: 'text-ink-900',
    ring: 'ring-sun-400',
  },
  berry: {
    soft: 'bg-berry-600/10',
    solid: 'bg-berry-600',
    text: 'text-berry-600',
    ring: 'ring-berry-600',
  },
  ink: {
    soft: 'bg-ink-900/5',
    solid: 'bg-ink-900',
    text: 'text-ink-900',
    ring: 'ring-ink-900',
  },
}

export function getTint(name) {
  return TINTS[name] ?? TINTS.ember
}
