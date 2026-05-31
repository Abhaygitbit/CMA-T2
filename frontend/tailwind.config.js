/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          dark: '#0f172a',
          darker: '#0b0f19',
          card: 'rgba(30, 41, 59, 0.7)',
          accent: '#10b981', // emerald
          accentBlue: '#3b82f6', // sapphire blue
          border: 'rgba(255, 255, 255, 0.1)',
        }
      },
      fontFamily: {
        sans: ['Outfit', 'Inter', 'sans-serif'],
      },
      animation: {
        'glow-pulse': 'glowPulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'fade-in-up': 'fadeInUp 0.5s ease-out forwards',
        'slide-in-right': 'slideInRight 0.3s ease-out forwards',
      },
      keyframes: {
        glowPulse: {
          '0%, 100%': { opacity: 0.8, filter: 'drop-shadow(0 0 15px rgba(16, 185, 129, 0.6))' },
          '50%': { opacity: 1, filter: 'drop-shadow(0 0 25px rgba(16, 185, 129, 0.9))' },
        },
        fadeInUp: {
          '0%': { opacity: 0, transform: 'translateY(15px)' },
          '100%': { opacity: 1, transform: 'translateY(0)' },
        },
        slideInRight: {
          '0%': { opacity: 0, transform: 'translateX(25px)' },
          '100%': { opacity: 1, transform: 'translateX(0)' },
        }
      }
    },
  },
  plugins: [],
}
