import type { Config } from "tailwindcss";
const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#0c0a09", gold: "#c9a96e", goldDeep: "#a8864a", goldLight: "#f3e3b8",
        ivory: "#faf6ee", beige: "#e8dcc8", pearl: "#f5f2ec",
      },
      fontFamily: { display: ["var(--font-display)", "serif"] },
      boxShadow: { luxe: "0 30px 60px -30px rgba(12,10,9,.35)" },
    },
  },
  plugins: [],
};
export default config;
