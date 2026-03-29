import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        kiros: {
          purple: '#6b2fa0',
          'purple-dark': '#4a1d6e',
          'purple-light': '#9b51e0',
          gold: '#edc430',
          'gold-dark': '#d4ab1a',
        }
      },
    },
  },
  plugins: [],
};
export default config;
