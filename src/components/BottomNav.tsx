'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ADMIN_NAV, STUDENT_NAV } from '@/lib/navigation'

const HOME_PATHS = new Set(['/admin', '/student'])

export function BottomNav({ role }: { role: 'admin' | 'student' }) {
  const pathname = usePathname()
  const items = role === 'admin' ? ADMIN_NAV : STUDENT_NAV

  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-slate-200 bg-white/95 backdrop-blur md:hidden">
      <div className="mx-auto flex max-w-5xl items-stretch justify-between px-1">
        {items.map((item) => {
          const active = HOME_PATHS.has(item.href)
            ? pathname === item.href
            : pathname.startsWith(item.href)
          const Icon = item.icon
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-1 flex-col items-center gap-1 py-2.5 text-xs font-medium transition-colors ${
                active ? 'text-indigo-600' : 'text-slate-400'
              }`}
            >
              <Icon className="h-5 w-5" strokeWidth={active ? 2.5 : 2} />
              {item.label}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
