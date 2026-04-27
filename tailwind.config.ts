import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: "#2596BE",
          dim: "#1e7a99",
          glow: "#3db8e0",
          muted: "rgba(37, 150, 190, 0.12)",
        },
        surface: {
          DEFAULT: "rgb(var(--surface) / <alpha-value>)",
          elevated: "rgb(var(--surface-elevated) / <alpha-value>)",
        },
        ink: {
          DEFAULT: "rgb(var(--ink) / <alpha-value>)",
          muted: "rgb(var(--ink-muted) / <alpha-value>)",
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "var(--font-sans)", "system-ui"],
      },
      boxShadow: {
        glass: "0 8px 32px rgba(15, 23, 42, 0.08), 0 2px 8px rgba(15, 23, 42, 0.04)",
        "glass-lg":
          "0 24px 80px rgba(15, 23, 42, 0.12), 0 8px 24px rgba(15, 23, 42, 0.06)",
        "glass-dark":
          "0 8px 32px rgba(0, 0, 0, 0.35), 0 2px 8px rgba(0, 0, 0, 0.2)",
        "brand-soft": "0 20px 50px -12px rgba(37, 150, 190, 0.38)",
        "brand-soft-sm": "0 10px 30px -10px rgba(37, 150, 190, 0.3)",
      },
      backgroundImage: {
        "map-grid":
          "linear-gradient(rgba(37, 150, 190, 0.11) 1px, transparent 1px), linear-gradient(90deg, rgba(37, 150, 190, 0.11) 1px, transparent 1px)",
        "hero-mesh":
          "radial-gradient(ellipse 85% 55% at 50% -25%, rgba(37, 150, 190, 0.38), transparent 55%), radial-gradient(ellipse 55% 45% at 100% 0%, rgba(37, 150, 190, 0.2), transparent 50%)",
      },
      animation: {
        "fade-in": "fadeIn 0.5s ease-out forwards",
        "slide-up": "slideUp 0.45s cubic-bezier(0.16, 1, 0.3, 1) forwards",
        float: "float 6s ease-in-out infinite",
      },
      keyframes: {
        fadeIn: {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        slideUp: {
          from: { opacity: "0", transform: "translateY(12px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-6px)" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
