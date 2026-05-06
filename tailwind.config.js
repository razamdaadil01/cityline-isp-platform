/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        navy: {
          DEFAULT: '#0F2744',
          light: '#1a3a5c',
          dark: '#0a1e33',
        },
        brand: {
          blue: '#0A8DCD',
          'blue-light': '#1aa3e8',
          'blue-dark': '#0778b0',
          orange: '#E8541A',
          'orange-light': '#f06330',
          'orange-dark': '#c94514',
        },
        surface: {
          DEFAULT: '#F0F4F8',
          card: '#FFFFFF',
          border: '#E2E8F0',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 3px 0 rgba(0,0,0,0.08), 0 1px 2px 0 rgba(0,0,0,0.04)',
        'card-hover': '0 4px 12px 0 rgba(0,0,0,0.10)',
      },
    },
  },
  plugins: [],
}
