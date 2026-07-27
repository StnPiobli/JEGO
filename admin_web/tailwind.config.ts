import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: "#12140F",
        "ink-soft": "#2A2E24",
        "green-900": "#0E2B20",
        "green-700": "#1B4A36",
        "green-500": "#2E7D54",
        "green-300": "#6FBE94",
        "off-white": "#F6F3EC",
        paper: "#FCFBF7",
        line: "#DCD6C6",
        red: "#B8433A",
        "red-bg": "#FBEAE6",
        amber: "#B9822E",
        "amber-bg": "#FBF1DF",
        purple: "#6E4A9E",
        "purple-bg": "#EDE7F5",
        "ok-bg": "#E9F3EC",
      },
      fontFamily: {
        display: ["var(--font-space-grotesk)", "sans-serif"],
        sans: ["var(--font-inter)", "sans-serif"],
        mono: ["var(--font-jetbrains)", "monospace"],
      },
      boxShadow: {
        card: "0 1px 2px rgba(18,20,15,.06), 0 8px 24px -12px rgba(18,20,15,.18)",
      },
    },
  },
  plugins: [],
};
export default config;
