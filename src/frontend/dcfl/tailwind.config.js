/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,js}', './templates/**/*.html'],
  theme: {
    extend: {
      colors: {
        primary: '#000f43',
        'surface-bright': '#f7faf9',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
