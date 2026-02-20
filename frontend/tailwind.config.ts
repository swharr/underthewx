import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        sky: {
          50: "#f0f9ff",
          100: "#e0f2fe",
          500: "#0ea5e9",
          600: "#0284c7",
          700: "#0369a1",
        },
        frost: {
          low: "#bfdbfe",
          moderate: "#93c5fd",
          high: "#60a5fa",
          imminent: "#3b82f6",
        },
      },
    },
  },
  plugins: [],
} satisfies Config;
