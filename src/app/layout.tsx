import './globals.css'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: '違法転載AI検出システム',
  description: '出版社向けAI画像検出システム',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  )
}