/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'media',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Pretendard Variable', 'Pretendard', 'system-ui', 'sans-serif'],
      },
      keyframes: {
        'slide-up': {
          '0%': { opacity: '0', transform: 'translateX(-50%) translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateX(-50%) translateY(0)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        'float-up': {
          '0%,100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-2px)' },
        },
        'impact-pulse': {
          '0%,100%': { boxShadow: '0 0 0 0 rgba(239,68,68,0.4)' },
          '50%': { boxShadow: '0 0 0 6px rgba(239,68,68,0)' },
        },
      },
      animation: {
        'slide-up': 'slide-up 0.2s ease-out',
        shimmer: 'shimmer 2s linear infinite',
        'float-up': 'float-up 3s ease-in-out infinite',
        'impact-pulse': 'impact-pulse 2s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}
