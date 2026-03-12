/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./services/**/*.{js,ts,jsx,tsx}",
    "./contexts/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Montserrat', 'sans-serif'],
      },
      colors: {
        primary: '#E95D2C',
        secondary: '#E95D2C',
        background: '#F9FAFB',
        surface: '#FFFFFF',
        warm: {
          DEFAULT: '#E95D2C',
          light: '#E95D2C',
          dark: '#E95D2C',
        },
      },
      boxShadow: {
        'surface': '0 4px 20px rgba(0, 0, 0, 0.05)',
        'surface-soft': '0 2px 12px rgba(0, 0, 0, 0.04)',
      }
    },
  },
  plugins: [],
}

