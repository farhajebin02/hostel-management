import { createClient } from '@/lib/supabase/server'
import { calculateBill } from '@/lib/billing'
import { getISTMonthBounds } from '@/lib/time'
import { generateAndCloseMonth } from './actions'
import { CloseMonthButton } from './CloseMonthButton'

function shiftMonth(monthStart: string, delta: number): string {
  const [y, m] = monthStart.split('-').map(Number)
  const shifted = new Date(Date.UTC(y, m - 1 + delta, 1))
  return `${shifted.getUTCFullYear()}-${String(shifted.getUTCMonth() + 1).padStart(2, '0')}-01`
}

export default async function BillingPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>
}) {
  const { month: monthParam } = await searchParams
  const currentMonthBounds = getISTMonthBounds()

  const start = monthParam ? `${monthParam}-01` : currentMonthBounds.start
  const [y, m] = start.split('-').map(Number)
  const nextMonthDate = new Date(Date.UTC(y, m, 1))
  const end = `${nextMonthDate.getUTCFullYear()}-${String(nextMonthDate.getUTCMonth() + 1).padStart(2, '0')}-01`
  const month = start.slice(0, 7)

  const prevMonth = shiftMonth(start, -1).slice(0, 7)
  const nextMonth = shiftMonth(start, 1).slice(0, 7)
  const canGoNext = nextMonth <= currentMonthBounds.month

  const supabase = await createClient()

  const { data: students } = await supabase
    .from('profiles')
    .select('id, full_name')
    .eq('role', 'student')
    .eq('status', 'approved')
    .order('full_name', { ascending: true })

  const { data: ticks } = await supabase
    .from('meal_ticks')
    .select('student_id, breakfast, dinner')
    .gte('meal_date', start)
    .lt('meal_date', end)

  const { data: alreadyClosed } = await supabase
    .from('monthly_bills')
    .select('student_id')
    .eq('month', start)

  const monthClosed = (alreadyClosed?.length ?? 0) > 0

  const rows = (students ?? []).map((s) => {
    const studentTicks = (ticks ?? []).filter((t) => t.student_id === s.id)
    const breakfastCount = studentTicks.filter((t) => t.breakfast).length
    const dinnerCount = studentTicks.filter((t) => t.dinner).length
    const totalTicks = breakfastCount + dinnerCount
    return {
      id: s.id,
      name: s.full_name,
      breakfastCount,
      dinnerCount,
      totalTicks,
      bill: calculateBill(totalTicks),
    }
  })

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold">Mess bill — {month} {monthClosed ? '(final)' : '(live preview)'}</h1>
        <div className="flex gap-4 text-sm">
          <a href={`/admin/billing?month=${prevMonth}`} className="text-blue-600 underline">&larr; {prevMonth}</a>
          {canGoNext && (
            <a href={`/admin/billing?month=${nextMonth}`} className="text-blue-600 underline">{nextMonth} &rarr;</a>
          )}
        </div>
      </div>
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b">
            <th className="p-2">Student</th>
            <th className="p-2">Breakfast</th>
            <th className="p-2">Dinner</th>
            <th className="p-2">Total ticks</th>
            <th className="p-2">Bill</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-b">
              <td className="p-2">{r.name}</td>
              <td className="p-2">{r.breakfastCount}</td>
              <td className="p-2">{r.dinnerCount}</td>
              <td className="p-2">{r.totalTicks}</td>
              <td className="p-2">₹{r.bill}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <form action={generateAndCloseMonth} className="mt-6">
        <input type="hidden" name="month" value={start} />
        <CloseMonthButton disabled={monthClosed} label={monthClosed ? 'Month already closed' : 'Generate & close this month'} />
      </form>
    </div>
  )
}
