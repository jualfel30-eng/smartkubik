import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/templates/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",

        // Premium Barbershop Palette
        luxury: {
          black: {
            900: '#0A0A0A',
            800: '#1A1A1A',
            700: '#2A2A2A',
          },
          cream: {
            50: '#F5F5F0',
            100: '#FFFFFF',
          },
          gold: {
            DEFAULT: '#C9A96E',
            light: '#D4AF37',
            dark: '#B8935A',
          },
          brass: {
            DEFAULT: '#B8935A',
            light: '#C9A96E',
          },
          leather: {
            DEFAULT: '#8B7355',
            dark: '#6B5B3E',
          },
          burgundy: {
            DEFAULT: '#C41E3A',
            dark: '#8B0000',
          },
        },
      },

      fontFamily: {
        serif: ['var(--font-playfair)', 'Georgia', 'serif'],
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
      },

      letterSpacing: {
        widest: '0.4em',
        ultra: '0.3em',
        super: '0.2em',
        regular: '0.15em',
      },

      fontSize: {
        'hero': ['120px', { lineHeight: '1', letterSpacing: '-0.02em' }],
        'display': ['72px', { lineHeight: '1.1', letterSpacing: '-0.01em' }],
        'h1': ['60px', { lineHeight: '1.2', letterSpacing: '-0.01em' }],
        'h2': ['48px', { lineHeight: '1.2' }],
      },

      backdropBlur: {
        xs: '2px',
      },

      animation: {
        'fade-in': 'fadeIn 0.8s ease-out',
        'slide-up': 'slideUp 0.6s ease-out',
        'slide-in-left': 'slideInLeft 0.8s ease-out',
        'scale-in': 'scaleIn 0.5s ease-out',
        'grain': 'grain 8s steps(10) infinite',
      },

      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(30px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        slideInLeft: {
          '0%': { transform: 'translateX(-30px)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        scaleIn: {
          '0%': { transform: 'scale(0.95)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        grain: {
          '0%, 100%': { transform: 'translate(0, 0)' },
          '10%': { transform: 'translate(-5%, -10%)' },
          '20%': { transform: 'translate(-15%, 5%)' },
          '30%': { transform: 'translate(7%, -25%)' },
          '40%': { transform: 'translate(-5%, 25%)' },
          '50%': { transform: 'translate(-15%, 10%)' },
          '60%': { transform: 'translate(15%, 0%)' },
          '70%': { transform: 'translate(0%, 15%)' },
          '80%': { transform: 'translate(3%, 35%)' },
          '90%': { transform: 'translate(-10%, 10%)' },
        },
      },
    },
  },
  plugins: [],
};
export default config;
