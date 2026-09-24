// The IGNITE palette, in one place. tailwind.config.js builds its colour
// tokens from this, and charts (which need real hex values, not class names)
// import it directly. A hex code anywhere else is a bug.

export const palette = {
  ember: { 500: '#F97316', 700: '#C2410C' },
  ink: { 600: '#4B4A6B', 900: '#1E1B4B' },
  cream: { 50: '#FFF8EE' },
  paper: '#FFFFFF',
  sun: { 400: '#FACC15' },
  leaf: { 600: '#16A34A' },
  sky: { 500: '#0EA5E9' },
  berry: { 600: '#E11D48' },
  // Wrong answers: amber reads as "not yet", red reads as punishment
  amber: { 500: '#F59E0B', 700: '#B45309' },
}

// Chart chrome, derived from ink so it sits one quiet step off the white card.
export const chart = {
  grid: 'rgb(30 27 75 / 0.10)',
  hover: 'rgb(30 27 75 / 0.05)',
  axisText: palette.ink[600],
  bar: palette.ember[500],
  line: palette.sky[500],
  lineWash: 'rgb(14 165 233 / 0.10)',
  surface: palette.paper,
}
