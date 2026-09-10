import { Home } from 'lucide-react'

export function WelcomeCard({
  greeting,
  subtitle,
  badge,
  eyebrow = 'Welcome back,',
}: {
  greeting: string
  subtitle: string
  badge?: string
  eyebrow?: string
}) {
  return (
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-100 via-indigo-50 to-white p-6">
      <div className="pointer-events-none absolute -right-6 -top-10 h-36 w-36 rounded-full bg-indigo-200/40 blur-2xl" />
      <div className="pointer-events-none absolute -bottom-10 right-12 h-24 w-24 rounded-full bg-amber-200/40 blur-2xl" />
      <p className="relative text-sm font-medium text-indigo-700">{eyebrow}</p>
      <h1 className="relative mt-1 text-3xl font-bold text-slate-900">{greeting}</h1>
      <p className="relative mt-2 max-w-xs text-sm text-slate-600">{subtitle}</p>
      {badge && (
        <div className="relative mt-3 inline-flex items-center gap-1.5 rounded-full bg-white/80 px-3 py-1.5 text-xs font-semibold text-indigo-700 shadow-sm">
          <Home className="h-3.5 w-3.5" />
          {badge}
        </div>
      )}
    </div>
  )
}
