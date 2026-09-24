/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      // Every colour in the app comes from here. If a hex code shows up in a
      // component, it belongs in this file instead.
      colors: {
        ember: {
          500: '#F97316',
          700: '#C2410C',
        },
        ink: {
          600: '#4B4A6B',
          900: '#1E1B4B',
        },
        cream: {
          50: '#FFF8EE',
        },
        paper: '#FFFFFF',
        sun: {
          400: '#FACC15',
        },
        leaf: {
          600: '#16A34A',
        },
        sky: {
          500: '#0EA5E9',
        },
        berry: {
          600: '#E11D48',
        },
        // Wrong answers: amber reads as "not yet", red reads as punishment
        amber: {
          500: '#F59E0B',
          700: '#B45309',
        },
      },
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
