import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Quiet Studio
        paper: "#FAF7F2",
        linen: "#EFE9E0",
        clay: "#B85C38",
        "clay-deep": "#9A4A2C",
        charcoal: "#3D342C",
        ink: "#3D342C",
        mist: "#8A7F74",
        success: "#5F7355",
        // Legacy aliases used across components
        moss: "#8A7F74",
        sage: "#5F7355",
        cream: "#FAF7F2",
        oat: "#EFE9E0",
        ember: "#B85C38",
        walnut: "#3D342C",
        bark: "#3D342C",
        stone: "#EFE9E0"
      },
      borderRadius: {
        panel: "8px",
        control: "6px"
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"]
      },
      boxShadow: {
        soft: "none"
      }
    }
  },
  plugins: []
};

export default config;
