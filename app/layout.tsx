import type { Metadata } from 'next'
import './globals.css'
import Nav from '@/components/Nav'

export const metadata: Metadata = {
  title: '关税监控',
  description: '外贸轮胎出口关税、汇率、政策监控',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600&display=swap" rel="stylesheet" />
      </head>
      <body>
        <Nav />
        {/* sidebar width is 210px on desktop, 0 on mobile */}
        <main className="min-h-dvh px-5 py-7 pb-24 md:pl-[calc(210px+2rem)] md:pr-8 md:py-8">
          <div className="max-w-5xl mx-auto relative z-10">
            {children}
          </div>
        </main>
      </body>
    </html>
  )
}
