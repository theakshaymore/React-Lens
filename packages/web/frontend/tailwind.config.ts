import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#0a0a0a',
        surface: '#111111',
        surfaceAlt: '#141414',
        border: '#222222',
        accent: '#6366f1',
        success: '#22c55e',
        warning: '#eab308',
        danger: '#ef4444',
        text: '#ffffff',
        textSecondary: '#888888',
        textMuted: '#444444'
      },
      boxShadow: {
        glow: '0 0 0 1px rgba(99, 102, 241, 0.35), 0 12px 42px rgba(0, 0, 0, 0.45)'
      },
      transitionTimingFunction: {
        smooth: 'cubic-bezier(0.22, 1, 0.36, 1)'
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui'],
        mono: ['JetBrains Mono', 'Fira Code', 'ui-monospace', 'monospace']
      }
    }
  },
  plugins: []
} satisfies Config;
