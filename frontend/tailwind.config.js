/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        ssiet: {
          green: {
            DEFAULT: '#2A7D14',
            light: '#3A9B22',
            dark: '#1E6B0E',
            900: '#072A01',
            800: '#0D4005',
            700: '#155409',
            600: '#1E6B0E',
            500: '#2A7D14',
            400: '#3A9B22',
            300: '#56B83A',
            200: '#A8D98E',
            100: '#D5EFC8',
            50:  '#EEF8E8',
          },
          gold: {
            DEFAULT: '#F0B400',
            light: '#F5C800',
            dark: '#B38200',
            700:  '#916900',
            600:  '#B38200',
            500:  '#D49B00',
            400:  '#F0B400',
            300:  '#F5C800',
            200:  '#FFD93D',
            100:  '#FFF0A0',
            50:   '#FFFAE8',
          },
        },
        border: "hsl(var(--border, 120 25% 85%))",
        input: "hsl(var(--input, 0 0% 100%))",
        ring: "hsl(var(--ring, 120 50% 30%))",
        background: "hsl(var(--background, 100 20% 98%))",
        foreground: "hsl(var(--foreground, 120 40% 10%))",
        primary: {
          DEFAULT: "hsl(var(--primary, 110 70% 28%))",
          foreground: "hsl(var(--primary-foreground, 0 0% 100%))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary, 45 100% 47%))",
          foreground: "hsl(var(--secondary-foreground, 0 0% 10%))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive, 0 84% 60%))",
          foreground: "hsl(var(--destructive-foreground, 0 0% 98%))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted, 120 20% 92%))",
          foreground: "hsl(var(--muted-foreground, 120 25% 35%))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent, 120 30% 95%))",
          foreground: "hsl(var(--accent-foreground, 120 40% 15%))",
        },
        card: {
          DEFAULT: "hsl(var(--card, 0 0% 100%))",
          foreground: "hsl(var(--card-foreground, 120 40% 10%))",
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
        display: ['Space Grotesk', 'Inter', 'sans-serif'],
      },
      borderRadius: {
        lg: "var(--radius, 10px)",
        md: "calc(var(--radius, 10px) - 2px)",
        sm: "calc(var(--radius, 10px) - 4px)",
      },
    },
  },
  plugins: [],
}
