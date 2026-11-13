import type { Config } from "tailwindcss";
export default {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: { extend: { colors: { forest: "#145c45", ink: "#17221d", lime: "#d5f06e" } } },
  plugins: [],
} satisfies Config;
