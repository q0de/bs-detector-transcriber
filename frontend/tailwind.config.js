const { heroui } = require("@heroui/react");

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "./node_modules/@heroui/theme/dist/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial', 'sans-serif'],
      },
    },
  },
  darkMode: "class",
  plugins: [
    heroui({
      themes: {
        light: {
          colors: {
            background: "#FDFBF7", // Warm off-white with subtle cream/yellow
            content1: "#FFFFFF",
            content2: "#FAFAF8",
            content3: "#F5F5F3",
            content4: "#EFEFED",
          },
        },
        dark: {
          colors: {
            background: "#07020D",
            content1: "hsl(249.23deg 21.78% 11.11%)",
          },
        },
      },
    }),
  ],
};
