import { createClient } from '@/lib/supabase/server'
import { getTomorrowMealStats } from '@/lib/mealStats'
import { Card } from '@/components/ui'

export default async function AnalyticsPage() {
  const supabase = await createClient()
  const stats = await getTomorrowMealStats(supabase)

  const cards = [
    { icon: '☀️', value: stats.breakfastCount, label: 'Breakfast', color: 'text-indigo-600' },
    { icon: '🌙', value: stats.dinnerCount, label: 'Dinner', color: 'text-indigo-600' },
    { icon: '✅', value: stats.submittedCount, label: 'Submitted', color: 'text-emerald-600' },
    { icon: '⏳', value: stats.notSubmittedCount, label: 'Not submitted', color: 'text-amber-600' },
  ]

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900">Prep Analytics</h1>
      <p className="mt-1 text-sm text-slate-500">How much to prepare for tomorrow, {stats.tomorrow}.</p>
      <div className="mt-6 grid max-w-2xl grid-cols-2 gap-4 sm:grid-cols-4">
        {cards.map((s) => (
          <Card key={s.label} className="text-center">
            <div className="text-3xl">{s.icon}</div>
            <div className={`mt-2 text-3xl font-bold ${s.color}`}>{s.value}</div>
            <div className="mt-1 text-sm font-medium text-slate-500">{s.label}</div>
          </Card>
        ))}
      </div>
    </div>
  )
}
