import { createClient } from '@/lib/supabase/server'
import { getISTMonthBounds } from '@/lib/time'

function formatDate(dateStr: string): string {
  // meal_date has no time component; parsing as UTC keeps the displayed
  // date stable regardless of the server's local timezone.
  return new Date(`${dateStr}T00:00:00Z`).toLocaleDateString('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  })
}

export default async function StudentHistoryPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { start, end, month } = getISTMonthBounds()

  const { data: ticks } = await supabase
    .from('meal_ticks')
    .select('meal_date, breakfast, dinner')
    .eq('student_id', user!.id)
    .gte('meal_date', start)
    .lt('meal_date', end)
    .order('meal_date', { ascending: false })

  const totalTicks = (ticks ?? []).reduce((sum, t) => sum + (t.breakfast ? 1 : 0) + (t.dinner ? 1 : 0), 0)

  return (
    <div className="mx-auto max-w-sm">
      <h1 className="text-2xl font-bold text-slate-900">Meal History</h1>
      <p className="mt-1 text-sm text-slate-500">
        {month} &middot; {totalTicks} meal{totalTicks === 1 ? '' : 's'} ticked so far
      </p>

      <div className="mt-4 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        {!ticks?.length ? (
          <p className="p-6 text-center text-sm text-slate-500">No meals ticked yet this month.</p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <th className="px-4 py-2 font-medium">Date</th>
                <th className="px-4 py-2 text-center font-medium">☀️ Breakfast</th>
                <th className="px-4 py-2 text-center font-medium">🌙 Dinner</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {ticks.map((t) => (
                <tr key={t.meal_date}>
                  <td className="px-4 py-3 font-medium text-slate-900">{formatDate(t.meal_date)}</td>
                  <td className="px-4 py-3 text-center">{t.breakfast ? '✅' : '—'}</td>
                  <td className="px-4 py-3 text-center">{t.dinner ? '✅' : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
