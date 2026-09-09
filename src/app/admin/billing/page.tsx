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

  const { data: closedBills, error: closedBillsError } = await supabase
    .from('monthly_bills')
    .select('student_id, breakfast_count, dinner_count, total_ticks, bill_amount, rent_amount')
    .eq('month', start)

  if (closedBillsError) throw new Error(closedBillsError.message)

  const monthClosed = (closedBills?.length ?? 0) > 0

  const { data: students, error: studentsError } = await supabase
    .from('profiles')
    .select('id, full_name')
    .eq('role', 'student')
    .eq('status', 'approved')
    .order('full_name', { ascending: true })

  if (studentsError) throw new Error(studentsError.message)

  type Row = {
    id: string
    name: string | null
    breakfastCount: number
    dinnerCount: number
    totalTicks: number
    messFee: number
    rent: number
    total: number
  }

  let rows: Row[]

  if (monthClosed) {
    // Closed month: render the archived, immutable values from monthly_bills.
    // Never recompute from live meal_ticks here - that would silently drift
    // from what was actually billed if the formula constants ever change.
    rows = (closedBills ?? []).map((b) => {
      const student = (students ?? []).find((s) => s.id === b.student_id)
      return {
        id: b.student_id,
        name: student?.full_name ?? '(former student)',
        breakfastCount: b.breakfast_count,
        dinnerCount: b.dinner_count,
        totalTicks: b.total_ticks,
        messFee: b.bill_amount,
        rent: b.rent_amount,
        total: b.rent_amount + b.bill_amount,
      }
    })
  } else {
    // Open month: live preview computed from this month's ticks so far.
    const { data: settings, error: settingsError } = await supabase
      .from('app_settings')
      .select('hostel_rent')
      .eq('id', 1)
      .single()

    if (settingsError) throw new Error(settingsError.message)
    const hostelRent = settings?.hostel_rent ?? 0

    const { data: ticks, error: ticksError } = await supabase
      .from('meal_ticks')
      .select('student_id, breakfast, dinner')
      .gte('meal_date', start)
      .lt('meal_date', end)

    if (ticksError) throw new Error(ticksError.message)

    rows = (students ?? []).map((s) => {
      const studentTicks = (ticks ?? []).filter((t) => t.student_id === s.id)
      const breakfastCount = studentTicks.filter((t) => t.breakfast).length
      const dinnerCount = studentTicks.filter((t) => t.dinner).length
      const totalTicks = breakfastCount + dinnerCount
      const messFee = calculateBill(totalTicks)
      return {
        id: s.id,
        name: s.full_name,
        breakfastCount,
        dinnerCount,
        totalTicks,
        messFee,
        rent: hostelRent,
        total: hostelRent + messFee,
      }
    })
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Mess Bill</h1>
          <p className="mt-1 text-sm text-slate-500">
            {month} <span className={monthClosed ? 'font-medium text-emerald-600' : 'font-medium text-amber-600'}>{monthClosed ? '· Final' : '· Live preview'}</span>
          </p>
        </div>
        <div className="flex gap-4 text-sm font-medium">
          <a href={`/admin/billing?month=${prevMonth}`} className="text-indigo-600 hover:text-indigo-700">&larr; {prevMonth}</a>
          {canGoNext && (
            <a href={`/admin/billing?month=${nextMonth}`} className="text-indigo-600 hover:text-indigo-700">{nextMonth} &rarr;</a>
          )}
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead>
            <tr className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <th className="px-4 py-2.5 font-medium">Student</th>
              <th className="px-4 py-2.5 text-center font-medium">Breakfast</th>
              <th className="px-4 py-2.5 text-center font-medium">Dinner</th>
              <th className="px-4 py-2.5 text-center font-medium">Ticks</th>
              <th className="px-4 py-2.5 text-right font-medium">Rent</th>
              <th className="px-4 py-2.5 text-right font-medium">Mess fee</th>
              <th className="px-4 py-2.5 text-right font-medium">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((r) => (
              <tr key={r.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 font-medium text-slate-900">{r.name}</td>
                <td className="px-4 py-3 text-center text-slate-600">{r.breakfastCount}</td>
                <td className="px-4 py-3 text-center text-slate-600">{r.dinnerCount}</td>
                <td className="px-4 py-3 text-center text-slate-600">{r.totalTicks}</td>
                <td className="px-4 py-3 text-right text-slate-600">₹{r.rent}</td>
                <td className="px-4 py-3 text-right text-slate-600">₹{r.messFee}</td>
                <td className="px-4 py-3 text-right font-semibold text-slate-900">₹{r.total}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <form action={generateAndCloseMonth} className="mt-6">
        <input type="hidden" name="month" value={start} />
        <CloseMonthButton disabled={monthClosed} label={monthClosed ? 'Month already closed' : 'Generate & close this month'} />
      </form>
    </div>
  )
}
