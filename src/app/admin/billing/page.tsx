import { createClient } from '@/lib/supabase/server'
import { calculateBill } from '@/lib/billing'
import { getISTMonthBounds } from '@/lib/time'
import { generateAndCloseMonth } from './actions'
import { CloseMonthButton } from './CloseMonthButton'

export default async function BillingPage() {
  const supabase = await createClient()
  const { start, end, month } = getISTMonthBounds()

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
      <h1 className="mb-4 text-xl font-semibold">Mess bill — {month} {monthClosed ? '(final)' : '(live preview)'}</h1>
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
