'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const links = [
  {
    href: '/',
    label: '总览',
    icon: (
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" rx="1.5" />
        <rect x="14" y="3" width="7" height="7" rx="1.5" />
        <rect x="3" y="14" width="7" height="7" rx="1.5" />
        <rect x="14" y="14" width="7" height="7" rx="1.5" />
      </svg>
    ),
  },
  {
    href: '/exchange-rates',
    label: '汇率',
    icon: (
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
        <polyline points="16 7 22 7 22 13" />
      </svg>
    ),
  },
  {
    href: '/tariffs',
    label: '关税',
    icon: (
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="8.5" cy="8.5" r="1.5" fill="currentColor" stroke="none" />
        <circle cx="15.5" cy="15.5" r="1.5" fill="currentColor" stroke="none" />
        <line x1="18.5" y1="5.5" x2="5.5" y2="18.5" />
        <rect x="3" y="3" width="18" height="18" rx="3" />
      </svg>
    ),
  },
  {
    href: '/policies',
    label: '政策',
    icon: (
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="8" y1="13" x2="16" y2="13" />
        <line x1="8" y1="17" x2="12" y2="17" />
      </svg>
    ),
  },
  {
    href: '/freight',
    label: '运费',
    icon: (
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 7h11v8H3z" />
        <path d="M14 10h4l3 3v2h-7z" />
        <circle cx="7.5" cy="17.5" r="1.5" />
        <circle cx="18.5" cy="17.5" r="1.5" />
      </svg>
    ),
  },
]

export default function Nav() {
  const pathname = usePathname()

  return (
    <>
      {/* ── Desktop Sidebar ── */}
      <aside
        className="hidden md:flex flex-col fixed left-0 top-0 h-screen z-20"
        style={{ width: 'var(--sidebar)', background: 'var(--surface)', borderRight: '1px solid var(--border)' }}
      >
        {/* Logo */}
        <div className="px-5 py-6" style={{ borderBottom: '1px solid var(--border)' }}>
          <div className="flex items-center gap-3">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold shrink-0"
              style={{ background: 'var(--gold-dim)', color: 'var(--gold-l)', border: '1px solid rgba(212,146,10,0.3)' }}
            >
              关
            </div>
            <div>
              <div className="text-sm font-semibold" style={{ color: 'var(--text)' }}>关税监控</div>
              <div className="text-[10px] mt-0.5" style={{ color: 'var(--text-3)' }}>GCC 轮胎出口</div>
            </div>
          </div>
        </div>

        {/* Nav items */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {links.map(l => {
            const active = pathname === l.href
            return (
              <Link
                key={l.href}
                href={l.href}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all relative"
                style={{
                  color: active ? 'var(--gold-l)' : 'var(--text-2)',
                  background: active ? 'var(--gold-dim)' : 'transparent',
                }}
              >
                {active && (
                  <span
                    className="absolute left-0 top-2 bottom-2 w-0.5 rounded-r-full"
                    style={{ background: 'var(--gold-l)' }}
                  />
                )}
                {l.icon}
                <span className="text-sm font-medium">{l.label}</span>
              </Link>
            )
          })}
        </nav>

        {/* Footer */}
        <div className="px-5 py-4" style={{ borderTop: '1px solid var(--border)' }}>
          <p className="text-[10px] leading-relaxed" style={{ color: 'var(--text-3)' }}>
            MacMap · ExchangeRate-API<br />
            商务部 · WTO
          </p>
        </div>
      </aside>

      {/* ── Mobile Bottom Tab Bar ── */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-20 flex"
        style={{ background: 'var(--surface)', borderTop: '1px solid var(--border)', paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        {links.map(l => {
          const active = pathname === l.href
          return (
            <Link
              key={l.href}
              href={l.href}
              className="flex-1 flex flex-col items-center gap-1 pt-2.5 pb-2 transition-colors relative"
              style={{ color: active ? 'var(--gold-l)' : 'var(--text-3)' }}
            >
              {active && (
                <span
                  className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-px rounded-full"
                  style={{ background: 'var(--gold-l)' }}
                />
              )}
              {l.icon}
              <span className="text-[10px] font-medium">{l.label}</span>
            </Link>
          )
        })}
      </nav>
    </>
  )
}
