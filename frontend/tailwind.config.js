/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx}",
  ],
  theme: {
    extend: {
      colors: {
        slate: {
          950: '#0f172a',
        }
      },
      backdropFilter: {
        'blur': 'blur(10px)',
      },
    },
  },
  plugins: [],
}
