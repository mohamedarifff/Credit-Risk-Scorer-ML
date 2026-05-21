/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        surface: "#0b1220",
        panel: "#111a2e",
        accent: "#00d4aa",
        accent2: "#3b82f6",
        danger: "#ef4444",
        warn: "#f59e0b",
        success: "#22c55e",
      },
      fontFamily: {
        sans: ["DM Sans", "system-ui", "sans-serif"],
        display: ["Space Grotesk", "system-ui", "sans-serif"],
      },
      boxShadow: {
        glow: "0 0 40px rgba(0, 212, 170, 0.15)",
      },
    },
  },
  plugins: [],
};
