/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class', // <--- ESTO ES LO QUE HACE LA MAGIA
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}