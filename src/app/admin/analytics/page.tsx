import { createClient } from '@/lib/supabase/server'
import { getTomorrowISTDateString } from '@/lib/time'

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
      <h1 className="mb-4 text-xl font-semibold">Prep quantities for {tomorrow}</h1>
      <div className="flex gap-6">
        <div className="rounded border p-4 text-center">
          <div className="text-3xl font-bold">{breakfastCount}</div>
          <div className="text-sm text-gray-600">Breakfast</div>
        </div>
        <div className="rounded border p-4 text-center">
          <div className="text-3xl font-bold">{dinnerCount}</div>
          <div className="text-sm text-gray-600">Dinner</div>
        </div>
      </div>
    </div>
  )
}
