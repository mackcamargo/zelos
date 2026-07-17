export default {
  darkMode: ['class', '[data-theme="dark"]'],
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: 'var(--z-bg)',
        surface: 'var(--z-surface)',
        raise: 'var(--z-surface-raise)',
        line: 'var(--z-line)',
        'line-strong': 'var(--z-line-strong)',
        ink: 'var(--z-text)',
        'ink-2': 'var(--z-text-2)',
        'ink-3': 'var(--z-text-3)',
        accent: 'var(--z-accent)',
        ok: 'var(--z-ok)',
        warn: 'var(--z-warn)',
        danger: 'var(--z-danger)',
      },
      fontFamily: {
        display: ['Archivo', 'system-ui', 'sans-serif'],
        sans: ['Geist', 'Inter', 'system-ui', 'sans-serif'],
        mono: ['Geist Mono', 'ui-monospace', 'monospace'],
      },
      borderRadius: { md: '12px', lg: '16px', xl: '20px' },
    },
  },
  plugins: [],
};
