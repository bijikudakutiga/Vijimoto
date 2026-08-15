import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        orange: {
          DEFAULT: "#E85D2C",
          deep: "#C64A1F",
          soft: "#FDEDE3",
          softer: "#FFF6F0",
        },
        cream: "#FFFBF8",
        ink: {
          DEFAULT: "#2B2420",
          soft: "#6B6058",
        },
        teal: "#1F4A47",
        gold: "#C9A15C",
        line: "#F0E2D6",
        status: {
          "red-bg": "#FDEAEA", "red-tx": "#C23B3B", "red-bd": "#E5484D",
          "amber-bg": "#FEF4E0", "amber-tx": "#966018", "amber-bd": "#F5A524",
          "green-bg": "#E9F7EF", "green-tx": "#1F7A4D", "green-bd": "#2F9E68",
        },
      },
      fontFamily: {
        display: ["var(--font-fraunces)", "serif"],
        sans: ["var(--font-jakarta)", "sans-serif"],
        mono: ["var(--font-space-mono)", "monospace"],
      },
      borderRadius: {
        pill: "100px",
        card: "22px",
      },
    },
  },
  plugins: [],
};
export default config;
