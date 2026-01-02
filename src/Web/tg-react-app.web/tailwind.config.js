/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        'app-bg': 'var(--bg-900)',
        'app-panel': 'var(--panel)',
        'app-border': 'var(--border)',
        'app-text': 'var(--text-primary)',
        'app-muted': 'var(--text-muted)'
      }
    }
  },
  plugins: []
};
