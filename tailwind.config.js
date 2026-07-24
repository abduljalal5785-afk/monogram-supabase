/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      borderRadius: {
        '2xl': '16px',
        '3xl': '24px',
        '4xl': '32px',
      },
      animation: {
        'fade-up': 'fadeUp 300ms ease-out',
        'slide-up': 'slideUp 250ms ease-out',
        'pulse-soft': 'pulseSoft 1.5s ease-in-out infinite',
        'bounce-dot': 'bounceDot 1.2s ease-in-out infinite',
      },
      keyframes: {
        fadeUp: { '0%': { opacity: '0', transform: 'translateY(6px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
        slideUp: { '0%': { transform: 'translateY(100%)' }, '100%': { transform: 'translateY(0)' } },
        pulseSoft: { '0%, 100%': { transform: 'scale(1)' }, '50%': { transform: 'scale(1.04)' } },
        bounceDot: { '0%, 80%, 100%': { transform: 'translateY(0)' }, '40%': { transform: 'translateY(-6px)' } },
      },
    },
  },
  plugins: [],
};
