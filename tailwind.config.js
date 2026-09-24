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
      boxShadow: {
        soft: '0 2px 12px -2px rgb(30 27 75 / 0.08)',
        lift: '0 8px 24px -6px rgb(30 27 75 / 0.16)',
      },
    },
  },
  plugins: [],
}
