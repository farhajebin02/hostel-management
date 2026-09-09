import { createClient } from '@/lib/supabase/server'
import { getTomorrowMealStats } from '@/lib/mealStats'
import { Card } from '@/components/ui'

const links = [
  { href: '/admin/pending', title: 'Pending Approvals', desc: 'Review and approve new student sign-ups.' },
  { href: '/admin/students', title: 'Students', desc: 'View, edit, and manage every student profile.' },
  { href: '/admin/analytics', title: 'Prep Analytics', desc: "Tomorrow's breakfast and dinner counts." },
  { href: '/admin/billing', title: 'Billing', desc: 'Monthly mess bill preview and month close.' },
  { href: '/admin/settings', title: 'Settings', desc: 'Daily cutoff time and hostel rent.' },
]

export default async function AdminHome() {
  const supabase = await createClient()
  const stats = await getTomorrowMealStats(supabase)

  const statCards = [
    { icon: '🧑‍🎓', value: stats.totalStudents, label: 'Total Students', color: 'text-slate-900' },
    { icon: '☀️', value: stats.breakfastCount, label: "Tomorrow's Breakfast", color: 'text-indigo-600' },
    { icon: '🌙', value: stats.dinnerCount, label: "Tomorrow's Dinner", color: 'text-indigo-600' },
    { icon: '✅', value: stats.submittedCount, label: 'Submitted', color: 'text-emerald-600' },
    { icon: '⏳', value: stats.notSubmittedCount, label: 'Not Submitted', color: 'text-amber-600' },
  ]

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900">Welcome, Admin</h1>
      <p className="mt-1 text-sm text-slate-500">Here&apos;s what&apos;s happening for tomorrow, {stats.tomorrow}.</p>

      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {statCards.map((s) => (
          <Card key={s.label} className="text-center">
            <div className="text-2xl">{s.icon}</div>
            <div className={`mt-2 text-2xl font-bold ${s.color}`}>{s.value}</div>
            <div className="mt-1 text-xs font-medium text-slate-500">{s.label}</div>
          </Card>
        ))}
      </div>

      <h2 className="mt-8 text-sm font-semibold uppercase tracking-wide text-slate-500">Manage</h2>
      <div className="mt-3 grid gap-4 sm:grid-cols-2">
        {links.map((l) => (
          <a key={l.href} href={l.href}>
            <Card className="h-full transition-shadow hover:shadow-md">
              <h2 className="font-semibold text-slate-900">{l.title}</h2>
              <p className="mt-1 text-sm text-slate-500">{l.desc}</p>
            </Card>
          </a>
        ))}
      </div>
    </div>
  )
}
