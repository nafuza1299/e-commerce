// Tailwind v4 in Next is a PostCSS plugin. catalyst-ui uses @tailwindcss/vite for
// the same job, which is the only build-level difference between the two hosts —
// tokens.css itself ports across unchanged.
export default {
  plugins: { "@tailwindcss/postcss": {} },
};
