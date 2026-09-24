// Chapter tints. Written out in full because Tailwind only ships classes it
// can find as plain strings; `bg-${tint}-500` would get purged.
//
// `text` is for words (chapter labels, lesson chips) and must pass WCAG AA
// (4.5:1) on white and on the tint's own `soft` background. sky-500 (2.8:1),
// leaf-600 (3.3:1) and berry-600 on its soft tint (4.0:1) don't, so those
// tints use ink-900 for text; the colour still shows in `solid` and `soft`.
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
    text: 'text-ink-900',
    ring: 'ring-sky-500',
  },
  leaf: {
    soft: 'bg-leaf-600/10',
    solid: 'bg-leaf-600',
    text: 'text-ink-900',
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
    text: 'text-ink-900',
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
