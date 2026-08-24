'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

/**
 * Search entry point. Submits to `/search?q=…` as a normal navigation so the results page owns the
 * query, the loading state, and the shareable URL — the box itself holds nothing but the current
 * input. Rendered in both the header (inline) and the mobile drawer (full width).
 */
export const SearchBox = ({
  autoFocus = false,
  className = '',
  placeholder = 'খবর খুঁজুন…',
}: {
  autoFocus?: boolean
  className?: string
  placeholder?: string
}) => {
  const router = useRouter()
  const [value, setValue] = useState('')

  return (
    <form
      className={`flex items-center ${className}`}
      onSubmit={(e) => {
        e.preventDefault()
        const q = value.trim()
        if (q) router.push(`/search?q=${encodeURIComponent(q)}`)
      }}
      role="search"
    >
      <label className="sr-only" htmlFor="site-search">
        খবর খুঁজুন
      </label>
      <input
        autoFocus={autoFocus}
        className="w-full rounded-l-md border border-line bg-white px-3 py-2 text-sm text-ink outline-none placeholder:text-muted focus:border-brand"
        id="site-search"
        name="q"
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        type="search"
        value={value}
      />
      <button
        aria-label="খুঁজুন"
        className="rounded-r-md border border-l-0 border-brand bg-brand px-3 py-2 text-sm font-semibold text-white hover:bg-brand-dark"
        type="submit"
      >
        খুঁজুন
      </button>
    </form>
  )
}
