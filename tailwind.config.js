/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ['class'],
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    container: {
      center: true,
      padding: {
        DEFAULT: '1rem',
        sm: '2rem',
        lg: '4rem',
        xl: '5rem',
        '2xl': '6rem',
      },
      screens: {
        '2xl': '1400px',
      },
    },
    extend: {
      colors: {
        border: 'var(--color-border)', /* primary with opacity */
        input: 'var(--color-input)', /* primary with opacity */
        ring: 'var(--color-ring)', /* green-800 / green-500 */
        background: 'var(--color-background)', /* gray-50 / gray-950 */
        foreground: 'var(--color-foreground)', /* gray-900 / gray-100 */
        primary: {
          DEFAULT: 'var(--color-primary)', /* green-800 / green-500 */
          foreground: 'var(--color-primary-foreground)', /* white / gray-950 */
        },
        secondary: {
          DEFAULT: 'var(--color-secondary)', /* green-700 / green-400 */
          foreground: 'var(--color-secondary-foreground)', /* white / gray-950 */
        },
        accent: {
          DEFAULT: 'var(--color-accent)', /* amber-700 / amber-400 */
          foreground: 'var(--color-accent-foreground)', /* black / gray-950 */
        },
        destructive: {
          DEFAULT: 'var(--color-destructive)', /* red-700 / red-400 */
          foreground: 'var(--color-destructive-foreground)', /* white / gray-950 */
        },
        success: {
          DEFAULT: 'var(--color-success)', /* green-700 / green-400 */
          foreground: 'var(--color-success-foreground)', /* white / gray-950 */
        },
        warning: {
          DEFAULT: 'var(--color-warning)', /* orange-700 / orange-400 */
          foreground: 'var(--color-warning-foreground)', /* white / gray-950 */
        },
        error: {
          DEFAULT: 'var(--color-error)', /* red-700 / red-400 */
          foreground: 'var(--color-error-foreground)', /* white / gray-950 */
        },
        muted: {
          DEFAULT: 'var(--color-muted)', /* gray-100 / gray-800 */
          foreground: 'var(--color-muted-foreground)', /* gray-600 / gray-400 */
        },
        popover: {
          DEFAULT: 'var(--color-popover)', /* white / gray-900 */
          foreground: 'var(--color-popover-foreground)', /* gray-900 / gray-100 */
        },
        card: {
          DEFAULT: 'var(--color-card)', /* white / gray-900 */
          foreground: 'var(--color-card-foreground)', /* gray-900 / gray-100 */
        },
      },
      borderRadius: {
        sm: 'var(--radius-sm)',
        md: 'var(--radius-md)',
        lg: 'var(--radius-lg)',
        xl: 'var(--radius-xl)',
      },
      fontFamily: {
        sans: ['IBM Plex Sans', 'sans-serif'],
        heading: ['Source Sans 3', 'sans-serif'],
        caption: ['Inter', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
        '128': '32rem',
      },
      boxShadow: {
        'elevation-0': 'none',
        'elevation-1': 'var(--shadow-sm)',
        'elevation-2': 'var(--shadow-md)',
        'elevation-3': 'var(--shadow-lg)',
        'elevation-4': 'var(--shadow-xl)',
      },
      transitionDuration: {
        '250': '250ms',
      },
      transitionTimingFunction: {
        'smooth': 'ease-out',
      },
      keyframes: {
        shimmer: {
          '0%': { backgroundPosition: '-1000px 0' },
          '100%': { backgroundPosition: '1000px 0' },
        },
      },
      animation: {
        shimmer: 'shimmer 2s infinite linear',
      },
    },
  },
  plugins: [],
}