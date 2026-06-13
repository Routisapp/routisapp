import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./hooks/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: {
          primary: "#0a0b0f",
          card:    "#13141a",
          input:   "#1c1d26",
        },
        border: "#2a2b36",
        accent: {
          blue:   "#3b82f6",
          green:  "#22c55e",
          orange: "#f97316",
          red:    "#ef4444",
          purple: "#8b5cf6",
        },
        text: {
          primary:   "#ffffff",
          secondary: "#8b8fa8",
        },
      },
      animation: {
        "pulse-fast": "pulse 1s cubic-bezier(0.4, 0, 0.6, 1) infinite",
      },
    },
  },
  plugins: [],
};

export default config;
