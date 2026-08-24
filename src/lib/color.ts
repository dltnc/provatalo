/**
 * Accent-colour helpers backing the SiteSettings "accent colour" option.
 *
 * Tailwind tokens are plain CSS custom properties (`--color-brand`, `--color-brand-dark`,
 * `--color-brand-50`), so the layout can override them at runtime with an inline style on
 * `<html>` and every `bg-brand`/`text-brand`/… utility follows without a rebuild. The dark hover
 * shade and pale wash tint are derived here so admins only ever pick one colour.
 */

const HEX_PATTERN = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/

/** Field validator: empty is allowed (falls back to the stylesheet default). */
export const validateHexColor = (value: unknown): true | string => {
  if (!value) return true
  return HEX_PATTERN.test(String(value)) || 'হেক্স কোড লিখুন, যেমন #c8102e'
}

const expandHex = (hex: string): [number, number, number] => {
  let value = hex.slice(1)
  if (value.length === 3) {
    value = [...value].map((ch) => ch + ch).join('')
  }
  return [
    parseInt(value.slice(0, 2), 16),
    parseInt(value.slice(2, 4), 16),
    parseInt(value.slice(4, 6), 16),
  ]
}

const toHex = ([r, g, b]: [number, number, number]): string =>
  `#${[r, g, b].map((c) => Math.max(0, Math.min(255, Math.round(c))).toString(16).padStart(2, '0')).join('')}`

/** Linear mix of each channel toward `target` by `ratio` (0–1). */
const mix = (rgb: [number, number, number], target: number, ratio: number): [number, number, number] =>
  rgb.map((c) => c + (target - c) * ratio) as [number, number, number]

/**
 * The three token overrides an accent implies: the colour itself, a hover-darkened variant
 * (~18% toward black, mirroring the default red pair's contrast step), and the ~7% pale wash
 * used behind the breaking ticker.
 */
export const accentVariants = (
  accent?: null | string,
): { base: string; dark: string; tint: string } | null => {
  if (!accent || !HEX_PATTERN.test(accent)) return null

  const rgb = expandHex(accent.toLowerCase())
  return {
    base: toHex(rgb),
    dark: toHex(mix(rgb, 0, 0.18)),
    tint: toHex(mix(rgb, 255, 0.93)),
  }
}
