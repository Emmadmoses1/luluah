import type { Config } from "tailwindcss";
const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#0c0a09", gold: "#c9a96e", goldDeep: "#a8864a", ivory: "#faf6ee",
        beige: "#e8dcc8", pearl: "#f5f2ec",
      },
    },
  },
  plugins: [],
};
export default config;
