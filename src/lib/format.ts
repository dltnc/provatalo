/**
 * Bangla-facing formatting. `bn-BD` gives Bangla numerals (১২৩) for free, which matters as much
 * for a date line as translating the month name does.
 */

export const formatDate = (value?: Date | null | string): null | string => {
  if (!value) return null

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null

  return date.toLocaleDateString('bn-BD', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

export const formatNumber = (value?: null | number): null | string =>
  typeof value === 'number' ? value.toLocaleString('bn-BD') : null

/**
 * Compact Bangla follower counts for widget display: ১২.৫ লক্ষ / ৪.৫ লক্ষ / ৮৮ হাজার. Intl's
 * `bn` compact notation emits Latin magnitude letters (K/M) rather than লক্ষ/হাজার, so the
 * South-Asian ladder is spelled out here instead.
 */
export const formatFollowers = (value?: null | number): null | string => {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) return null

  const trim = (n: number): string => {
    const rounded = n >= 100 ? Math.round(n) : Math.round(n * 10) / 10
    return rounded.toLocaleString('bn-BD', { maximumFractionDigits: 1 })
  }

  if (value >= 10_000_000) return `${trim(value / 10_000_000)} কোটি`
  if (value >= 100_000) return `${trim(value / 100_000)} লক্ষ`
  if (value >= 1_000) return `${trim(value / 1_000)} হাজার`
  return value.toLocaleString('bn-BD')
}
