/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './index.html',
    './html/**/*.html',
    './portal-admin/**/*.php',
    './js/**/*.js'
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        heading: ['Plus Jakarta Sans', 'Inter', 'system-ui', 'sans-serif']
      }
    }
  },
  plugins: []
};
