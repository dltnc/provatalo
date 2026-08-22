import React from 'react'
import './styles.css'

export const metadata = {
  description: 'A blank template using Payload in a Next.js app.',
  title: 'Payload Blank Template',
}

export default async function RootLayout(props: { children: React.ReactNode }) {
  const { children } = props

  return (
    // The site is Bangla; screen readers pick their voice and pronunciation from this (PRD §4.4).
    <html lang="bn">
      <body>
        <main>{children}</main>
      </body>
    </html>
  )
}
