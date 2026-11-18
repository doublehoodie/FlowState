import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#17211b",
        moss: "#486553",
        sage: "#8fa58f",
        cream: "#f7f1e5",
        oat: "#e5d7c1",
        ember: "#d56f3e"
      },
      boxShadow: {
        soft: "0 18px 50px rgba(23, 33, 27, 0.12)"
      }
    }
  },
  plugins: []
};

export default config;
