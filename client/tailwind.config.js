/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: '#000000',
        primary: '#58A6FF',
        accent: '#1F6FEB',
        surface: '#0A0A0A',
        border: '#1A1A1A',
        muted: '#6B7280',
        foreground: '#E5E7EB',
        neonBlue: '#58A6FF',
        neonAccent: '#1F6FEB',
        neonGlow: '#79C0FF',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      animation: {
        'shimmer': 'shimmer 2s infinite linear',
        'float': 'float 6s ease-in-out infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
        'neon-glow': 'neonGlow 2s ease-in-out infinite alternate',
      },
      keyframes: {
        shimmer: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(100%)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-20px)' },
        },
        glow: {
          '0%': { boxShadow: '0 0 5px rgba(88, 166, 255, 0.2)' },
          '100%': { boxShadow: '0 0 20px rgba(88, 166, 255, 0.4)' },
        },
        neonGlow: {
          '0%': { boxShadow: '0 0 5px rgba(88, 166, 255, 0.3), 0 0 10px rgba(88, 166, 255, 0.15)' },
          '100%': { boxShadow: '0 0 15px rgba(88, 166, 255, 0.5), 0 0 30px rgba(88, 166, 255, 0.25)' },
        },
      },
    },
  },
  plugins: [],
};
