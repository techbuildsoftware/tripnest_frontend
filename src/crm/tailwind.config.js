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
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#2b7de9',
          600: '#1d62c9',
          700: '#154aa0',
          800: '#123b80',
          900: '#0e2c63',
        },
        // Much of the established workspace uses Tailwind's blue utility
        // classes for the primary action colour. Map that legacy semantic
        // palette to BuildSoftware blue so every internal screen changes
        // together, without changing status colours such as success/danger.
        blue: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#2b7de9',
          600: '#1d62c9',
          700: '#154aa0',
          800: '#123b80',
          900: '#0e2c63',
        },
        orange: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#2b7de9',
          600: '#1d62c9',
          700: '#154aa0',
          800: '#123b80',
          900: '#0e2c63',
        },
        dark: '#0b1f45',
        sidebar: '#0b1f45',
        background: '#FFFAF5',
        card: '#FFFFFF',
        border: '#E2E8F0',
        success: '#16A34A',
        warning: '#F59E0B',
        danger: '#DC2626',
        muted: '#64748B',
        purple: '#7C3AED',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
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
