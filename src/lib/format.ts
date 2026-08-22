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
