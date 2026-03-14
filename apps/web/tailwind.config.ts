import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/app/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}",
    "./src/lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: "#e8eef6",
          100: "#c5d5e9",
          200: "#9fb9db",
          300: "#789dcd",
          400: "#5b87c2",
          500: "#3e72b7",
          600: "#3563a3",
          700: "#2a4f89",
          800: "#1e3a5f",
          900: "#142844",
          950: "#0b1829",
        },
        accent: {
          50: "#fdf4e7",
          100: "#fbe3c3",
          200: "#f8d09b",
          300: "#f5bd73",
          400: "#f3ae55",
          500: "#f19f37",
          600: "#ef9131",
          700: "#ed7f29",
          800: "#eb6e22",
          900: "#e75116",
        },
        success: {
          50: "#e6f7ed",
          500: "#22c55e",
          700: "#15803d",
        },
        warning: {
          50: "#fff8e1",
          500: "#f59e0b",
          700: "#b45309",
        },
        danger: {
          50: "#fef2f2",
          500: "#ef4444",
          700: "#b91c1c",
        },
        gray: {
          50: "#f9fafb",
          100: "#f3f4f6",
          200: "#e5e7eb",
          300: "#d1d5db",
          400: "#9ca3af",
          500: "#6b7280",
          600: "#4b5563",
          700: "#374151",
          800: "#1f2937",
          900: "#111827",
        },
      },
      fontFamily: {
        sans: ["var(--font-plus-jakarta)", "system-ui", "sans-serif"],
      },
      boxShadow: {
        card: "0 1px 3px 0 rgba(0,0,0,0.08), 0 1px 2px -1px rgba(0,0,0,0.04)",
        "card-hover":
          "0 4px 6px -1px rgba(0,0,0,0.08), 0 2px 4px -2px rgba(0,0,0,0.04)",
        modal:
          "0 20px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)",
      },
      borderRadius: {
        xl: "0.75rem",
        "2xl": "1rem",
      },
    },
  },
  plugins: [],
};

export default config;
