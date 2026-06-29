/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      colors: {
        canvas: '#08090a',
        surface: {
          1: '#0f1011',
          2: '#141516',
          3: '#18191a',
        },
        hairline: {
          DEFAULT: '#23252a',
          strong: '#34343a',
        },
        ink: {
          DEFAULT: '#f7f8f8',
          muted: '#d0d6e0',
          subtle: '#8a8f98',
          cool: '#767d88',
          faint: '#62666d',
        },
        brand: {
          50: '#f5f3ff',
          100: '#ede9fe',
          300: '#c4b5fd',
          400: '#a78bfa',
          500: '#8b5cf6',
          600: '#7c3aed',
          700: '#6d28d9',
          900: '#4c1d95',
        },
      },
      keyframes: {
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        ambientDrift: {
          '0%, 100%': { transform: 'translate(0, 0) scale(1)', opacity: '0.18' },
          '50%': { transform: 'translate(140px, -90px) scale(1.25)', opacity: '0.32' },
        },
      },
      animation: {
        fadeInUp: 'fadeInUp 0.5s ease-out both',
        ambientDrift: 'ambientDrift 16s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
