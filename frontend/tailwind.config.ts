import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#eef9ff",
          100: "#d8f1ff",
          200: "#b9e7ff",
          300: "#89d9ff",
          400: "#52c1ff",
          500: "#2aa2ff",
          600: "#1484f5",
          700: "#0d6ce1",
          800: "#1157b6",
          900: "#144a8f",
          950: "#112e57",
        },
        surface: {
          50: "#f8fafc",
          100: "#f1f5f9",
          200: "#e2e8f0",
          700: "#1e293b",
          800: "#0f172a",
          900: "#020617",
          950: "#010313",
        },
      },
      fontFamily: {
        mono: ["JetBrains Mono", "Fira Code", "monospace"],
      },
    },
  },
  plugins: [],
};

export default config;
