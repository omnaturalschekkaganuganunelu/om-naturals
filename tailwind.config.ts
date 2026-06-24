import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "gradient-conic":
          "conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))",
      },
      keyframes: {
        fadeSlide: {
          '0%': { opacity: '0' },
          '5%': { opacity: '1' },
          '25%': { opacity: '1' },
          '30%': { opacity: '0' },
          '100%': { opacity: '0' },
        }
      },
      animation: {
        'fade-slide': 'fadeSlide 16s infinite',
        'fade-slide-4': 'fadeSlide 16s infinite 4s',
        'fade-slide-8': 'fadeSlide 16s infinite 8s',
        'fade-slide-12': 'fadeSlide 16s infinite 12s',
      }
    },
  },
  plugins: [],
};
export default config;
