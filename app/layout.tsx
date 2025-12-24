import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Load Test Server',
  description: 'API 부하테스트 서버',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  )
}

