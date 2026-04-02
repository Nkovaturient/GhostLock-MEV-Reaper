/** @type {import('tailwindcss').Config} */
export default {
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  darkMode: 'class',
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        primary: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          200: '#bae6fd',
          300: '#7dd3fc',
          400: '#38bdf8',
          500: '#0ea5e9',
          600: '#0284c7',
          700: '#0369a1',
          800: '#075985',
          900: '#0c4a6e',
        },
        ghost: {
          50: '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
          400: '#94a3b8',
          500: '#64748b',
          600: '#475569',
          700: '#334155',
          800: '#1e293b',
          900: '#0f172a',
        },
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
        // HolmeSwap custom colors
        holme: {
          blue: "hsl(var(--holme-blue))",
          mint: "hsl(var(--holme-mint))",
          yellow: "hsl(var(--holme-yellow))",
          cream: "hsl(var(--holme-cream))",
          "ghost-blue": "hsl(var(--holme-ghost-blue))",
          purple: "hsl(var(--holme-purple))",
          "green-success": "hsl(var(--holme-green-success))",
          warning: "hsl(var(--holme-warning))",
          "text-primary": "hsl(var(--holme-text-primary))",
          "text-secondary": "hsl(var(--holme-text-secondary))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
        "2xl": "1.25rem",
        "3xl": "1.5rem",
      },
      boxShadow: {
        "holme-soft": "var(--shadow-soft)",
        "holme-card": "var(--shadow-card)",
        "holme-glow-yellow": "var(--shadow-glow-yellow)",
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-20px)' },
        },
        glow: {
          '0%': { boxShadow: '0 0 20px rgba(14, 165, 233, 0.5)' },
          '100%': { boxShadow: '0 0 40px rgba(14, 165, 233, 0.8)' },
        },
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "holme-float": {
          "0%, 100%": { transform: "translate(0, 0) scale(1)" },
          "50%": { transform: "translate(20px, -20px) scale(1.05)" },
        },
        "holme-bounce": {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-6px)" },
        },
        "holme-pulse-glow": {
          "0%, 100%": { boxShadow: "0 4px 12px hsla(47, 100%, 62%, 0.4)" },
          "50%": { boxShadow: "0 4px 24px hsla(47, 100%, 62%, 0.6)" },
        },
        "holme-lock-click": {
          "0%": { transform: "rotate(-5deg)" },
          "25%": { transform: "rotate(5deg)" },
          "50%": { transform: "rotate(-3deg)" },
          "75%": { transform: "rotate(3deg)" },
          "100%": { transform: "rotate(0deg)" },
        },
        "holme-dice-roll": {
          "0%": { transform: "rotate(0deg)" },
          "100%": { transform: "rotate(1080deg)" },
        },
        "holme-coin-stack": {
          "0%": { transform: "translateY(20px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        "holme-checkmark": {
          "0%": { transform: "scale(0)", opacity: "0" },
          "50%": { transform: "scale(1.2)" },
          "100%": { transform: "scale(1)", opacity: "1" },
        },
      },
      animation: {
        'float': 'float 6s ease-in-out infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
        'pulse-slow': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'spin-slow': 'spin 8s linear infinite',
        'bounce-slow': 'bounce 3s infinite',
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "holme-float": "holme-float 8s ease-in-out infinite",
        "holme-bounce": "holme-bounce 2s ease-in-out infinite",
        "holme-pulse-glow": "holme-pulse-glow 2s ease-in-out infinite",
        "holme-lock-click": "holme-lock-click 0.5s ease-in-out",
        "holme-dice-roll": "holme-dice-roll 1s ease-out",
        "holme-coin-stack": "holme-coin-stack 0.3s ease-out forwards",
        "holme-checkmark": "holme-checkmark 0.5s ease-out forwards",
      },
      fontFamily: {
        'mono': ['JetBrains Mono', 'Fira Code', 'monospace'],
        sans: ['Inter', 'SF Pro Display', 'system-ui', 'sans-serif'],
      },
      backdropBlur: {
        xs: '2px',
      }
    },
  },
  plugins: [require("tailwindcss-animate")],
}