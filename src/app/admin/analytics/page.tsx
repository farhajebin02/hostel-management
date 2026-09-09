import { createClient } from '@/lib/supabase/server'
import { getTomorrowISTDateString } from '@/lib/time'
import { Card } from '@/components/ui'

export default async function AnalyticsPage() {
  const supabase = await createClient()
  const tomorrow = getTomorrowISTDateString()

  const { data: students } = await supabase
    .from('profiles')
    .select('id')
    .eq('role', 'student')
    .eq('status', 'approved')

  const { data: ticks } = await supabase
    .from('meal_ticks')
    .select('student_id, breakfast, dinner, profiles!inner(status)')
    .eq('meal_date', tomorrow)
    .eq('profiles.status', 'approved')

  const breakfastCount = ticks?.filter((t) => t.breakfast).length ?? 0
  const dinnerCount = ticks?.filter((t) => t.dinner).length ?? 0
  const submittedCount = ticks?.length ?? 0
  const totalStudents = students?.length ?? 0
  const notSubmittedCount = Math.max(totalStudents - submittedCount, 0)

  const stats = [
    { icon: '☀️', value: breakfastCount, label: 'Breakfast', color: 'text-indigo-600' },
    { icon: '🌙', value: dinnerCount, label: 'Dinner', color: 'text-indigo-600' },
    { icon: '✅', value: submittedCount, label: 'Submitted', color: 'text-emerald-600' },
    { icon: '⏳', value: notSubmittedCount, label: 'Not submitted', color: 'text-amber-600' },
  ]

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900">Prep Analytics</h1>
      <p className="mt-1 text-sm text-slate-500">How much to prepare for tomorrow, {tomorrow}.</p>
      <div className="mt-6 grid max-w-2xl grid-cols-2 gap-4 sm:grid-cols-4">
        {stats.map((s) => (
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
