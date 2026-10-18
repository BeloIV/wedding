/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['"Cormorant Garamond"', 'Georgia', 'serif'],
        serif: ['"Playfair Display"', 'Georgia', 'serif'],
        sans: ['"DM Sans"', 'system-ui', 'sans-serif'],
      },
      colors: {
        parchment: '#faf5ee',
        ivory: '#f4ede3',
        blush: '#e8cfc9',
        rose: {
          DEFAULT: '#b8706a',
          light: '#e0b4ae',
          dark: '#8f4f4a',
        },
        gold: {
          DEFAULT: '#a8844a',
          light: '#caa96e',
          dark: '#7a5e2a',
        },
        champagne: '#e8d5a8',
        wine: '#1e0f08',
        ink: '#161210',
        muted: '#9a8578',
        petal: '#f9f1ec',
      },
      backgroundImage: {
        'grain': "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 512 512' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='1'/%3E%3C/svg%3E\")",
      },
      animation: {
        'fade-in': 'fadeIn 0.8s ease-out both',
        'fade-up': 'fadeUp 0.7s ease-out both',
        'fade-up-slow': 'fadeUp 1.1s ease-out both',
        'reveal': 'reveal 0.9s ease-out both',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        fadeUp: {
          '0%': { opacity: '0', transform: 'translateY(24px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        reveal: {
          '0%': { opacity: '0', transform: 'translateY(16px) scale(0.98)' },
          '100%': { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
      },
      boxShadow: {
        'warm': '0 1px 3px rgba(30,15,8,0.08), 0 4px 16px rgba(30,15,8,0.06)',
        'warm-md': '0 4px 24px rgba(30,15,8,0.10), 0 1px 4px rgba(30,15,8,0.06)',
        'warm-lg': '0 8px 40px rgba(30,15,8,0.14), 0 2px 8px rgba(30,15,8,0.08)',
        'inset-warm': 'inset 0 1px 0 rgba(255,255,255,0.12)',
      },
    },
  },
  plugins: [],
}
