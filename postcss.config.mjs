/**
 * Tailwind v4 is wired through PostCSS. Only stylesheets that `@import "tailwindcss"` receive
 * the framework's base/utilities — the Payload admin's own SCSS does not, so the admin panel is
 * unaffected by the public site's design system.
 */
export default {
  plugins: {
    '@tailwindcss/postcss': {},
  },
}
