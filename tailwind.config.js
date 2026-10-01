import typography from '@tailwindcss/typography'

// Everything here resolves to the CSS variables in src/styles/tokens.css, so
// light and dark differ only there and no value is repeated in this file.
// Colour triplets keep Tailwind's opacity modifier working.
const token = (name) => `rgb(var(--color-${name}) / <alpha-value>)`

// Font size and line height travel together as one scale step.
const step = (size, leading) => [`var(--text-${size})`, { lineHeight: `var(--leading-${leading})` }]

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
        heading: token('heading'),
        fg: {
          DEFAULT: token('fg'),
          body: token('fg-body'),
          muted: token('fg-muted'),
          subtle: token('fg-subtle'),
        },
        nav: token('nav'),
        icon: token('icon'),
        disabled: token('disabled-fg'),
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
        faint: 'var(--line-faint)',
        subtle: 'var(--line-subtle)',
        strong: 'var(--line-strong)',
      },
      divideColor: {
        DEFAULT: 'var(--line-faint)',
        faint: 'var(--line-faint)',
        subtle: 'var(--line-subtle)',
      },
      // Aero radii stay between 6 and 8px; the larger steps are capped so
      // existing rounded-xl/2xl/3xl classes follow the rule.
      borderRadius: {
        tag: 'var(--radius-tag)',
        control: 'var(--radius-control)',
        panel: 'var(--radius-panel)',
        xl: 'var(--radius-panel)',
        '2xl': 'var(--radius-panel)',
        '3xl': 'var(--radius-panel)',
      },
      // Only the shadows the design uses; each resolves to a themed token.
      boxShadow: {
        sm: 'var(--control-shadow)',
        DEFAULT: 'var(--surface-panel-shadow)',
        panel: 'var(--surface-panel-shadow)',
        overlay: 'var(--surface-overlay-shadow)',
        control: 'var(--control-shadow)',
      },
      // The design's type scale replaces Tailwind's stock steps.
      fontSize: {
        xs: step('xs', 'normal'),
        sm: step('sm', 'normal'),
        base: step('base', 'normal'),
        md: step('md', 'relaxed'),
        lg: step('lg', 'tight'),
        xl: step('xl', 'tight'),
        '2xl': step('2xl', 'tight'),
        '3xl': step('3xl', 'tight'),
        '4xl': step('4xl', 'tight'),
        '5xl': step('5xl', 'tight'),
        '6xl': step('6xl', 'tight'),
      },
      lineHeight: {
        tight: 'var(--leading-tight)',
        normal: 'var(--leading-normal)',
        relaxed: 'var(--leading-relaxed)',
      },
      fontFamily: {
        sans: 'var(--font-sans)',
        mono: 'var(--font-mono)',
      },
      // Layout measures: page widths, shell sizes, control heights.
      maxWidth: {
        page: 'var(--page-max)',
        detail: 'var(--detail-max)',
        narrow: 'var(--narrow-max)',
        reading: 'var(--reading-max)',
      },
      width: {
        sidebar: 'var(--sidebar-w)',
        'sidebar-collapsed': 'var(--sidebar-w-collapsed)',
        aside: 'var(--aside-w)',
        'login-panel': 'var(--login-panel-w)',
        'control-icon': 'var(--control-h-icon)',
      },
      height: {
        topbar: 'var(--topbar-h)',
        control: 'var(--control-h)',
        'control-sm': 'var(--control-h-sm)',
        'control-lg': 'var(--control-h-lg)',
        'control-icon': 'var(--control-h-icon)',
      },
      spacing: {
        'page-x': 'var(--page-pad-x)',
        'page-y': 'var(--page-pad-y)',
        section: 'var(--section-gap)',
        card: 'var(--card-gap)',
        panel: 'var(--panel-pad)',
        'login-x': 'var(--login-panel-pad-x)',
      },
      // Point the typography plugin's colour variables at the tokens so
      // rendered Markdown follows the theme.
      typography: {
        DEFAULT: {
          css: {
            '--tw-prose-body': 'rgb(var(--color-fg-body))',
            '--tw-prose-headings': 'rgb(var(--color-heading))',
            '--tw-prose-lead': 'rgb(var(--color-fg-body))',
            '--tw-prose-links': 'rgb(var(--color-fg))',
            '--tw-prose-bold': 'rgb(var(--color-heading))',
            '--tw-prose-counters': 'rgb(var(--color-icon))',
            '--tw-prose-bullets': 'rgb(var(--color-icon))',
            '--tw-prose-hr': 'var(--line-subtle)',
            '--tw-prose-quotes': 'rgb(var(--color-fg))',
            '--tw-prose-quote-borders': 'var(--line-strong)',
            '--tw-prose-captions': 'rgb(var(--color-fg-muted))',
            '--tw-prose-kbd': 'rgb(var(--color-fg))',
            '--tw-prose-kbd-shadows': 'var(--color-line)',
            '--tw-prose-code': 'rgb(var(--color-fg))',
            '--tw-prose-pre-code': 'rgb(var(--color-fg))',
            '--tw-prose-pre-bg': 'var(--code-bg)',
            '--tw-prose-th-borders': 'var(--line-strong)',
            '--tw-prose-td-borders': 'var(--line-faint)',
            // Article scale from the design: text 15/1.65, headings well below the page title.
            fontSize: 'var(--text-md)',
            lineHeight: 'var(--leading-relaxed)',
            p: { marginTop: '0', marginBottom: '12px' },
            h1: { fontSize: 'var(--text-2xl)', fontWeight: '600', lineHeight: 'var(--leading-tight)', marginTop: '0', marginBottom: '12px' },
            h2: { fontSize: 'var(--text-lg)', fontWeight: '600', lineHeight: 'var(--leading-tight)', marginTop: '24px', marginBottom: '12px' },
            h3: { fontSize: 'var(--text-md)', fontWeight: '600', lineHeight: 'var(--leading-tight)', marginTop: '20px', marginBottom: '8px' },
            'h4, h5, h6': { fontSize: 'var(--text-base)', fontWeight: '600', marginTop: '16px', marginBottom: '8px' },
            'h1, h2, h3, h4, h5, h6': { scrollMarginTop: '24px' },
            a: { fontWeight: '400', textDecorationColor: 'rgb(var(--color-line) / 0.3)', textUnderlineOffset: '3px' },
            'a:hover': { textDecorationColor: 'currentColor' },
            strong: { fontWeight: '600' },
            // Inline code is a chip; the plugin's backtick quotes go.
            code: {
              fontFamily: 'var(--font-mono)',
              fontSize: 'var(--text-sm)',
              fontWeight: '400',
              padding: '1px 6px',
              borderRadius: 'var(--radius-tag)',
              background: 'var(--code-bg)',
              border: '1px solid var(--code-border)',
            },
            'code::before': { content: 'none' },
            'code::after': { content: 'none' },
            pre: {
              fontSize: 'var(--text-sm)',
              lineHeight: 'var(--leading-normal)',
              padding: '12px 16px',
              marginTop: '0',
              marginBottom: '12px',
              border: '1px solid var(--code-border)',
              borderRadius: 'var(--radius-control)',
            },
            'pre code': { padding: '0', border: '0', background: 'transparent', fontSize: 'inherit' },
            'ul, ol': { marginTop: '0', marginBottom: '12px' },
            li: { marginTop: '4px', marginBottom: '4px' },
            table: {
              fontSize: 'var(--text-base)',
              lineHeight: 'var(--leading-normal)',
              marginTop: '0',
              marginBottom: '12px',
              fontVariantNumeric: 'tabular-nums',
            },
            'thead th': {
              fontSize: 'var(--text-xs)',
              fontWeight: '600',
              color: 'rgb(var(--color-fg-muted))',
              padding: '0 12px 8px 0',
            },
            'tbody td': { padding: '10px 12px 10px 0', verticalAlign: 'top' },
            'thead th:last-child, tbody td:last-child': { paddingRight: '0' },
            // Quotes: a quiet bar, no added quotation marks or italics.
            blockquote: { fontStyle: 'normal', fontWeight: '400', color: 'rgb(var(--color-fg-body))', marginTop: '0', marginBottom: '12px' },
            'blockquote p:first-of-type::before': { content: 'none' },
            'blockquote p:last-of-type::after': { content: 'none' },
          },
        },
      },
    },
  },
  plugins: [typography],
}
