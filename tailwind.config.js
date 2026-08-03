/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        sand: {
          DEFAULT: "#F7F0E4",
          deep: "#EFE4D2",
        },
        surface: "#FEFCFA",
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
        display: ["Playfair Display", "ui-serif", "Georgia", "serif"],
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      letterSpacing: {
        widest2: "0.22em",
      },
      boxShadow: {
        soft: "0 1px 2px rgba(43,21,18,0.04), 0 8px 24px rgba(43,21,18,0.06)",
        lift: "0 2px 4px rgba(43,21,18,0.05), 0 20px 40px rgba(196,56,104,0.10)",
      },
    },
  },
  plugins: [],
};
