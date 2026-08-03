import type { Config } from "tailwindcss";

function c(varName: string) {
  return `rgb(var(${varName}) / <alpha-value>)`;
}

const config: Config = {
  darkMode: "class",
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: c("--c-ink"),
        "ink-soft": c("--c-ink-soft"),
        "green-900": c("--c-green-900"),
        "green-700": c("--c-green-700"),
        "green-500": c("--c-green-500"),
        "green-300": c("--c-green-300"),
        "off-white": c("--c-off-white"),
        paper: c("--c-paper"),
        line: c("--c-line"),
        red: c("--c-red"),
        "red-bg": c("--c-red-bg"),
        amber: c("--c-amber"),
        "amber-bg": c("--c-amber-bg"),
        purple: c("--c-purple"),
        "purple-bg": c("--c-purple-bg"),
        "ok-bg": c("--c-ok-bg"),
        "grey-bg": c("--c-grey-bg"),
        "on-dark": c("--c-on-dark"),
      },
      fontFamily: {
        display: ["var(--font-space-grotesk)", "sans-serif"],
        sans: ["var(--font-inter)", "sans-serif"],
        mono: ["var(--font-jetbrains)", "monospace"],
      },
      boxShadow: {
        card: "0 1px 2px rgb(0 0 0 / 0.06), 0 8px 24px -12px rgb(0 0 0 / 0.25)",
      },
    },
  },
  plugins: [],
};
export default config;
