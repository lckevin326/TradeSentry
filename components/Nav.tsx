'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const links = [
  { href: '/', label: '总览' },
  { href: '/exchange-rates', label: '汇率' },
  { href: '/tariffs', label: '关税' },
  { href: '/policies', label: '政策' },
]

export default function Nav() {
  const pathname = usePathname()
  return (
    <>
      {/* 桌面端顶部导航 */}
      <nav className="hidden md:flex items-center gap-6 px-6 py-4 border-b bg-white sticky top-0 z-10">
        <span className="font-bold text-lg">关税监控</span>
        {links.map(l => (
          <Link
            key={l.href}
            href={l.href}
            className={`text-sm font-medium transition-colors ${pathname === l.href ? 'text-blue-600' : 'text-gray-600 hover:text-gray-900'}`}
          >
            {l.label}
          </Link>
        ))}
      </nav>
      {/* 移动端底部 Tab Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 flex border-t bg-white z-10">
        {links.map(l => (
          <Link
            key={l.href}
            href={l.href}
            className={`flex-1 py-3 text-center text-xs font-medium transition-colors ${pathname === l.href ? 'text-blue-600' : 'text-gray-500'}`}
          >
            {l.label}
          </Link>
        ))}
      </nav>
    </>
  )
}
