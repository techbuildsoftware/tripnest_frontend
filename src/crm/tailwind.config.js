/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "../../crm.html",
    "./**/*.{js,jsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#effaf9',
          100: '#d5f2f0',
          200: '#aae5e1',
          300: '#74d0cb',
          400: '#3fb5b0',
          500: '#14a09a',
          600: '#0e8a85',
          700: '#0b6f6b',
          800: '#0a5856',
          900: '#093f3e',
        },
        // Much of the established workspace uses Tailwind's blue utility
        // classes for the primary action colour. Map that legacy semantic
        // palette to TripNest blue so every internal screen changes
        // together, without changing status colours such as success/danger.
        blue: {
          50: '#effaf9',
          100: '#d5f2f0',
          200: '#aae5e1',
          300: '#74d0cb',
          400: '#3fb5b0',
          500: '#14a09a',
          600: '#0e8a85',
          700: '#0b6f6b',
          800: '#0a5856',
          900: '#093f3e',
        },
        orange: {
          50: '#effaf9',
          100: '#d5f2f0',
          200: '#aae5e1',
          300: '#74d0cb',
          400: '#3fb5b0',
          500: '#14a09a',
          600: '#0e8a85',
          700: '#0b6f6b',
          800: '#0a5856',
          900: '#093f3e',
        },
        dark: '#13234f',
        sidebar: '#13234f',
        background: '#f4f7fb',
        card: '#FFFFFF',
        border: '#E2E8F0',
        success: '#16A34A',
        warning: '#F59E0B',
        danger: '#DC2626',
        muted: '#64748B',
        purple: '#7C3AED',
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px -1px rgba(0, 0, 0, 0.1)',
        'card-hover': '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)',
        dropdown: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1)',
        modal: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
      },
      borderRadius: {
        'xl': '0.75rem',
        '2xl': '1rem',
      },
    },
  },
  plugins: [],
}
