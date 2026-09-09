import { createClient } from '@/lib/supabase/server'
import { getTomorrowISTDateString } from '@/lib/time'
import { Card } from '@/components/ui'

export default async function AnalyticsPage() {
  const supabase = await createClient()
  const tomorrow = getTomorrowISTDateString()

  const { data: ticks } = await supabase
    .from('meal_ticks')
    .select('breakfast, dinner, profiles!inner(status)')
    .eq('meal_date', tomorrow)
    .eq('profiles.status', 'approved')

  const breakfastCount = ticks?.filter((t) => t.breakfast).length ?? 0
  const dinnerCount = ticks?.filter((t) => t.dinner).length ?? 0

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900">Prep Analytics</h1>
      <p className="mt-1 text-sm text-slate-500">How much to prepare for tomorrow, {tomorrow}.</p>
      <div className="mt-6 grid max-w-md grid-cols-2 gap-4">
        <Card className="text-center">
          <div className="text-3xl">☀️</div>
          <div className="mt-2 text-3xl font-bold text-indigo-600">{breakfastCount}</div>
          <div className="mt-1 text-sm font-medium text-slate-500">Breakfast</div>
        </Card>
        <Card className="text-center">
          <div className="text-3xl">🌙</div>
          <div className="mt-2 text-3xl font-bold text-indigo-600">{dinnerCount}</div>
          <div className="mt-1 text-sm font-medium text-slate-500">Dinner</div>
        </Card>
      </div>
    </div>
  )
}
