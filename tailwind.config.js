/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  corePlugins: {
    preflight: false, // keep the existing hand-written CSS reset intact
  },
  theme: {
    extend: {
      colors: {
        sand: {
          DEFAULT: "#F7F0E4",
          deep: "#EFE4D2",
        },
        stone: {
          50: "#FDF1F4",
          100: "#FAD9E1",
          400: "#FC8EAC",
          500: "#E36E92",
          600: "#C43868",
          700: "#96284E",
          900: "#4A1526",
        },
        ink: "#221A17",
        jali: {
          DEFAULT: "#4B6E7A",
          light: "#8FADB5",
          50: "#EAF0F1",
        },
        brass: {
          DEFAULT: "#B98A3E",
          light: "#D9B876",
        },
      },
      fontFamily: {
        display: ["Fraunces", "ui-serif", "Georgia", "serif"],
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      letterSpacing: {
        widest2: "0.22em",
      },
    },
  },
  plugins: [],
};
