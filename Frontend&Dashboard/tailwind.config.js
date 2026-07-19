/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        ops: {
          bg: '#0B1220',
          panel: '#121C2E',
          card: '#182235',
          cardHover: '#1E2A3F',
          border: '#1E2A3F',
          borderLight: '#2A3A52',
        },
        alert: {
          red: '#FF4D4F',
          amber: '#FFB020',
          green: '#22C55E',
          blue: '#38BDF8',
        },
        text: {
          primary: '#FFFFFF',
          secondary: '#94A3B8',
          muted: '#64748B',
        }
      },
      boxShadow: {
        'card': '0 2px 8px rgba(0, 0, 0, 0.3)',
        'card-hover': '0 4px 16px rgba(0, 0, 0, 0.4)',
        'alert-red': '0 0 12px rgba(255, 77, 79, 0.3)',
        'alert-amber': '0 0 12px rgba(255, 176, 32, 0.3)',
        'alert-green': '0 0 12px rgba(34, 197, 94, 0.3)',
        'alert-blue': '0 0 12px rgba(56, 189, 248, 0.3)',
      },
      fontFamily: {
        'sans': ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        'mono': ['JetBrains Mono', 'Consolas', 'monospace'],
      },
    },
  },
  plugins: [],
}
