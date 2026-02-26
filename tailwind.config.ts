import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        background: '#0A0A0F',
        foreground: '#F1F5F9',
        primary: {
          DEFAULT: '#7C3AED',
          light: '#8B5CF6',
          dark: '#6D28D9',
        },
        secondary: {
          DEFAULT: '#06B6D4',
          light: '#22D3EE',
          dark: '#0891B2',
        },
        surface: 'rgba(255, 255, 255, 0.07)',
        card: 'rgba(255, 255, 255, 0.04)',
        'text-primary': '#F1F5F9',
        'text-secondary': '#94A3B8',
      },
      borderRadius: {
        'glass': '20px',
        'glass-btn': '14px',
        'glass-menu': '16px',
      },
      backdropBlur: {
        'glass': '24px',
        'glass-heavy': '32px',
        'glass-nav': '40px',
      },
      boxShadow: {
        'glass': '0 8px 32px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.15), inset 1px 0 0 rgba(255, 255, 255, 0.08), 0 0 40px rgba(124, 58, 237, 0.08)',
        'glass-hover': '0 12px 40px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.2), inset 1px 0 0 rgba(255, 255, 255, 0.12), 0 0 60px rgba(124, 58, 237, 0.15)',
        'glass-btn': '0 4px 16px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.15)',
        'glow-violet': '0 0 40px rgba(124, 58, 237, 0.3)',
        'glow-cyan': '0 0 40px rgba(6, 182, 212, 0.3)',
      },
      animation: {
        'shimmer': 'shimmer 2s infinite linear',
        'float': 'float 6s ease-in-out infinite',
        'glow-pulse': 'glow-pulse 2s ease-in-out infinite',
        'shake': 'shake 0.5s ease-in-out',
      },
      keyframes: {
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-20px)' },
        },
        'glow-pulse': {
          '0%, 100%': { boxShadow: '0 0 20px rgba(124, 58, 237, 0.3)' },
          '50%': { boxShadow: '0 0 40px rgba(124, 58, 237, 0.6)' },
        },
        shake: {
          '0%, 100%': { transform: 'rotate(0deg)' },
          '25%': { transform: 'rotate(-10deg)' },
          '75%': { transform: 'rotate(10deg)' },
        },
      },
    },
  },
  plugins: [],
};
export default config;
