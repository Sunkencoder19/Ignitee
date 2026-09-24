import { palette } from './src/styles/palette.js'

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      // Colours come from src/styles/palette.js, shared with the charts.
      colors: palette,
      fontFamily: {
        // Baloo 2 has Devanagari, so Hindi/Marathi later needs no font swap
        heading: ['"Baloo 2"', 'system-ui', 'sans-serif'],
        body: ['Nunito', 'system-ui', 'sans-serif'],
      },
      minHeight: {
        tap: '48px',
      },
      minWidth: {
        tap: '48px',
      },
      // Small, CSS-only motion. Components use them as motion-safe:animate-*
      // so they switch off for children who've asked for reduced motion.
      keyframes: {
        pop: {
          '0%, 100%': { transform: 'scale(1)' },
          '40%': { transform: 'scale(1.18)' },
        },
        'float-up': {
          '0%': { opacity: '0', transform: 'translateY(4px)' },
          '20%': { opacity: '1' },
          '100%': { opacity: '0', transform: 'translateY(-18px)' },
        },
        'toast-in': {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        pop: 'pop 450ms ease-out',
        'float-up': 'float-up 1200ms ease-out forwards',
        'toast-in': 'toast-in 200ms ease-out',
      },
      boxShadow: {
        soft: '0 2px 12px -2px rgb(30 27 75 / 0.08)',
        lift: '0 8px 24px -6px rgb(30 27 75 / 0.16)',
      },
    },
  },
  plugins: [],
}
