/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,js}', './templates/**/*.html'],
  theme: {
    extend: {
      colors: {
        primary: '#1a5c3a',
        'surface-bright': '#f7faf9',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
