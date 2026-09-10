import { createClient } from '@/lib/supabase/server'
import { getTomorrowMealStats } from '@/lib/mealStats'
import { WelcomeCard } from '@/components/WelcomeCard'
import { StatCard } from '@/components/StatCard'
import { ActionCard } from '@/components/ActionCard'
import { Users, Sun, Moon, CheckCircle2, Hourglass, ClipboardCheck, BarChart3, Receipt, Settings } from 'lucide-react'

const actions = [
  { href: '/admin/pending', label: 'Pending Selections', icon: ClipboardCheck, iconBg: 'bg-emerald-100', iconColor: 'text-emerald-600' },
  { href: '/admin/students', label: 'Manage Students', icon: Users, iconBg: 'bg-indigo-100', iconColor: 'text-indigo-600' },
  { href: '/admin/analytics', label: 'Prep Analytics', icon: BarChart3, iconBg: 'bg-amber-100', iconColor: 'text-amber-600' },
  { href: '/admin/billing', label: 'Billing', icon: Receipt, iconBg: 'bg-rose-100', iconColor: 'text-rose-600' },
  { href: '/admin/settings', label: 'Settings', icon: Settings, iconBg: 'bg-slate-100', iconColor: 'text-slate-600' },
]

export default async function AdminHome() {
  const supabase = await createClient()
  const stats = await getTomorrowMealStats(supabase)

  const formattedDate = new Date(`${stats.tomorrow}T00:00:00Z`).toLocaleDateString('en-US', {
    timeZone: 'UTC',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  const statCards = [
    { icon: Users, value: stats.totalStudents, label: 'Total Students', iconBg: 'bg-indigo-100', iconColor: 'text-indigo-600', href: '/admin/students' },
    { icon: Sun, value: stats.breakfastCount, label: "Tomorrow's Breakfast", iconBg: 'bg-amber-100', iconColor: 'text-amber-600', href: '/admin/analytics' },
    { icon: Moon, value: stats.dinnerCount, label: "Tomorrow's Dinner", iconBg: 'bg-rose-100', iconColor: 'text-rose-600', href: '/admin/analytics' },
    { icon: CheckCircle2, value: stats.submittedCount, label: 'Submitted', iconBg: 'bg-emerald-100', iconColor: 'text-emerald-600', href: '/admin/analytics' },
  ]
  const notSubmittedCard = {
    icon: Hourglass,
    value: stats.notSubmittedCount,
    label: 'Not Submitted',
    iconBg: 'bg-red-100',
    iconColor: 'text-red-600',
    href: '/admin/analytics',
  }

  return (
    <div className="flex flex-col gap-6">
      <WelcomeCard greeting="Admin 👋" subtitle={`Here's what's happening for tomorrow, ${formattedDate}.`} />

      <div className="grid grid-cols-2 gap-4">
        {statCards.map((s) => (
          <StatCard key={s.label} {...s} />
        ))}
      </div>
      <StatCard {...notSubmittedCard} />

      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900">Quick Actions</h2>
        </div>
        <div className="grid grid-cols-2 gap-4">
          {actions.map((a) => (
            <ActionCard key={a.href} {...a} />
          ))}
        </div>
      </div>
    </div>
  )
}
