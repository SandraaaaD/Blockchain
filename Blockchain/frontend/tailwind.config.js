/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Outfit', 'system-ui', 'Segoe UI', 'sans-serif'],
      },
      colors: {
        escrow: {
          sea: '#0992C2',
          deep: '#0B2D72',
          aqua: '#0AC4E0',
          sand: '#F6E7BC',
          DEFAULT: '#0992C2',
        },
        brand: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
          950: '#172554',
        },
      },
      boxShadow: {
        soft:
          '0 2px 16px -4px rgba(11, 45, 114, 0.1), 0 4px 28px -8px rgba(9, 146, 194, 0.12)',
        'soft-dark':
          '0 2px 24px -4px rgba(0, 0, 0, 0.55), 0 10px 40px -12px rgba(10, 196, 224, 0.09)',
        glow:
          '0 0 0 1px rgba(10, 196, 224, 0.22), 0 16px 44px -12px rgba(9, 146, 194, 0.38)',
        'glow-dark':
          '0 0 0 1px rgba(10, 196, 224, 0.18), 0 18px 54px -12px rgba(9, 146, 194, 0.22)',
        elevated: '0 20px 50px -24px rgba(11, 45, 114, 0.26)',
        'elevated-dark':
          '0 24px 64px -20px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(10, 196, 224, 0.08) inset',
      },
      backgroundImage: {
        noise:
          "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.04'/%3E%3C/svg%3E\")",
        'noise-dark':
          "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.08'/%3E%3C/svg%3E\")",
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translate3d(0, 0, 0) scale(1)' },
          '33%': { transform: 'translate3d(2.5%, -2.5%, 0) scale(1.03)' },
          '66%': { transform: 'translate3d(-2%, 1.5%, 0) scale(1.015)' },
        },
        'fade-rise': {
          from: { opacity: '0', transform: 'translateY(14px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'pulse-glow': {
          '0%, 100%': { opacity: '0.55' },
          '50%': { opacity: '0.85' },
        },
      },
      animation: {
        float: 'float 28s ease-in-out infinite',
        'fade-rise': 'fade-rise 0.55s cubic-bezier(0.22, 1, 0.36, 1) both',
        'pulse-glow': 'pulse-glow 6s ease-in-out infinite',
      },
      opacity: {
        12: '0.12',
        13: '0.13',
        14: '0.14',
        15: '0.15',
        18: '0.18',
        22: '0.22',
        26: '0.26',
        28: '0.28',
        32: '0.32',
        35: '0.35',
        36: '0.36',
        38: '0.38',
        42: '0.42',
        45: '0.45',
        48: '0.48',
        52: '0.52',
        54: '0.54',
        55: '0.55',
        58: '0.58',
        62: '0.62',
        65: '0.65',
        68: '0.68',
        72: '0.72',
        76: '0.76',
        78: '0.78',
        85: '0.85',
        88: '0.88',
        92: '0.92',
        94: '0.94',
      },
    },
  },
  plugins: [],
};
