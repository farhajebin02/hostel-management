import { createClient } from '@/lib/supabase/server'
import { getTomorrowMealStats } from '@/lib/mealStats'
import { StatCard } from '@/components/StatCard'
import { Sun, Moon, CheckCircle2, Hourglass } from 'lucide-react'

export default async function AnalyticsPage() {
  const supabase = await createClient()
  const stats = await getTomorrowMealStats(supabase)

  const cards = [
    { icon: Sun, value: stats.breakfastCount, label: 'Breakfast', iconBg: 'bg-amber-100', iconColor: 'text-amber-600' },
    { icon: Moon, value: stats.dinnerCount, label: 'Dinner', iconBg: 'bg-indigo-100', iconColor: 'text-indigo-600' },
    { icon: CheckCircle2, value: stats.submittedCount, label: 'Submitted', iconBg: 'bg-emerald-100', iconColor: 'text-emerald-600' },
    { icon: Hourglass, value: stats.notSubmittedCount, label: 'Not submitted', iconBg: 'bg-red-100', iconColor: 'text-red-600' },
  ]

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900">Prep Analytics</h1>
      <p className="mt-1 text-sm text-slate-500">How much to prepare for tomorrow, {stats.tomorrow}.</p>
      <div className="mt-6 grid max-w-2xl grid-cols-2 gap-4">
        {cards.map((s) => (
          <StatCard key={s.label} {...s} />
        ))}
      </div>
    </div>
  )
}
