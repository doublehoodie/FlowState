import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        paper: "#F4EEE6",
        stone: "#E8DFD4",
        clay: "#C96A3D",
        "clay-deep": "#A8522C",
        walnut: "#5C4033",
        bark: "#3D2E26",
        mist: "#9A8B7A",
        success: "#5F7355",
        // Keep legacy aliases mapped so gradual migration doesn't break
        ink: "#5C4033",
        moss: "#9A8B7A",
        sage: "#5F7355",
        cream: "#F4EEE6",
        oat: "#E8DFD4",
        ember: "#C96A3D"
      },
      borderRadius: {
        panel: "14px",
        control: "12px"
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        brand: ["var(--font-brand)", "Georgia", "serif"]
      },
      boxShadow: {
        soft: "0 1px 2px rgba(61, 46, 38, 0.06), 0 8px 24px rgba(61, 46, 38, 0.06)"
      }
    }
  },
  plugins: []
};

export default config;
