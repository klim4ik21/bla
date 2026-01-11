/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Deep ocean palette
        primary: {
          50: '#e6f7ff',
          100: '#b3e5ff',
          200: '#80d4ff',
          300: '#4dc2ff',
          400: '#26b3ff',
          500: '#0099e6',
          600: '#0077b3',
          700: '#005580',
          800: '#00334d',
          900: '#001a26',
        },
        // Midnight background
        surface: {
          50: '#f5f5f7',
          100: '#e8e8ed',
          200: '#d1d1db',
          300: '#a1a1b5',
          400: '#71718f',
          500: '#4a4a69',
          600: '#2d2d44',
          700: '#1c1c2e',
          800: '#12121f',
          900: '#0a0a12',
          950: '#050508',
        },
        // Status colors
        success: '#10b981',
        warning: '#f59e0b',
        error: '#ef4444',
        info: '#3b82f6',
      },
      fontFamily: {
        sans: ['JetBrains Mono', 'SF Mono', 'Monaco', 'monospace'],
        display: ['Space Grotesk', 'system-ui', 'sans-serif'],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
        'float': 'float 6s ease-in-out infinite',
      },
      keyframes: {
        glow: {
          '0%': { boxShadow: '0 0 5px rgba(0, 153, 230, 0.5)' },
          '100%': { boxShadow: '0 0 20px rgba(0, 153, 230, 0.8)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
      },
      boxShadow: {
        'glow-sm': '0 0 10px rgba(0, 153, 230, 0.3)',
        'glow-md': '0 0 20px rgba(0, 153, 230, 0.4)',
        'glow-lg': '0 0 30px rgba(0, 153, 230, 0.5)',
      },
    },
  },
  plugins: [],
};
