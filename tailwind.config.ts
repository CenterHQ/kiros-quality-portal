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
          purple: '#470DA8',
          'purple-dark': '#350A7E',
          'purple-light': '#6B3FCE',
          pink: '#B5179E',
          blue: '#4DC9F0',
          gold: '#EDC430',
          'gold-dark': '#D4AB1A',
          gray: '#58595B',
        }
      },
    },
  },
  plugins: [],
};
export default config;
