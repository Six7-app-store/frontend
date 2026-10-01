import typography from '@tailwindcss/typography'

// Colours resolve to the CSS variables in src/styles/tokens.css, so light and
// dark differ only there. Triplets keep Tailwind's opacity modifier working.
const token = (name) => `rgb(var(--color-${name}) / <alpha-value>)`

export default {
  content: [
    "./index.html",
    "./src/**/*.{vue,ts,tsx,js,jsx}"
  ],
  darkMode: ['selector', '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        accent: {
          DEFAULT: token('accent'),
          strong: token('accent-strong'),
          fg: token('accent-fg'),
        },
        'on-accent': token('on-accent'),
        canvas: token('canvas'),
        surface: token('surface'),
        fg: {
          DEFAULT: token('fg'),
          muted: token('fg-muted'),
        },
        icon: token('icon'),
        line: token('line'),
        tooltip: {
          DEFAULT: token('tooltip'),
          fg: token('on-tooltip'),
        },
        success: { DEFAULT: token('success'), dot: token('success-dot') },
        warning: { DEFAULT: token('warning'), dot: token('warning-dot') },
        danger: { DEFAULT: token('danger'), dot: token('danger-dot') },
        neutral: { DEFAULT: token('neutral'), dot: token('neutral-dot') },
      },
      borderColor: {
        DEFAULT: 'var(--line-subtle)',
        subtle: 'var(--line-subtle)',
        strong: 'var(--line-strong)',
      },
      divideColor: {
        DEFAULT: 'var(--line-subtle)',
      },
      // Aero radii stay between 6 and 8px; the larger steps are capped so
      // existing rounded-xl/2xl/3xl classes follow the rule.
      borderRadius: {
        tag: '4px',
        control: '6px',
        panel: '8px',
        xl: '8px',
        '2xl': '8px',
        '3xl': '8px',
      },
      // Tailwind's stock shadow steps resolve to the themed token shadows.
      boxShadow: {
        sm: 'var(--control-shadow)',
        DEFAULT: 'var(--surface-panel-shadow)',
        md: 'var(--surface-panel-shadow)',
        lg: 'var(--surface-banner-shadow)',
        xl: 'var(--surface-overlay-shadow)',
        '2xl': 'var(--surface-overlay-shadow)',
        panel: 'var(--surface-panel-shadow)',
        banner: 'var(--surface-banner-shadow)',
        overlay: 'var(--surface-overlay-shadow)',
        control: 'var(--control-shadow)',
      },
      // Point the typography plugin's colour variables at the tokens so
      // rendered Markdown follows the theme.
      typography: {
        DEFAULT: {
          css: {
            '--tw-prose-body': 'rgb(var(--color-fg-muted))',
            '--tw-prose-headings': 'rgb(var(--color-fg))',
            '--tw-prose-lead': 'rgb(var(--color-fg-muted))',
            '--tw-prose-links': 'rgb(var(--color-accent-fg))',
            '--tw-prose-bold': 'rgb(var(--color-fg))',
            '--tw-prose-counters': 'rgb(var(--color-icon))',
            '--tw-prose-bullets': 'rgb(var(--color-icon))',
            '--tw-prose-hr': 'var(--line-subtle)',
            '--tw-prose-quotes': 'rgb(var(--color-fg))',
            '--tw-prose-quote-borders': 'var(--line-strong)',
            '--tw-prose-captions': 'rgb(var(--color-fg-muted))',
            '--tw-prose-kbd': 'rgb(var(--color-fg))',
            '--tw-prose-kbd-shadows': 'var(--color-line)',
            '--tw-prose-code': 'rgb(var(--color-fg))',
            '--tw-prose-pre-code': 'rgb(var(--color-on-tooltip))',
            '--tw-prose-pre-bg': 'rgb(var(--color-tooltip))',
            '--tw-prose-th-borders': 'var(--line-strong)',
            '--tw-prose-td-borders': 'var(--line-subtle)',
          },
        },
      },
      fontFamily: {
        sans: ["'Segoe UI'", 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['Consolas', "'Cascadia Mono'", 'ui-monospace', 'monospace'],
      },
    },
  },
  plugins: [typography],
}
