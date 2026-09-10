import { createClient } from '@/lib/supabase/server'
import { formatFriendlyMonth, getISTMonthBounds } from '@/lib/time'
import { Card } from '@/components/ui'
import { Sun, Moon, Utensils, ChevronLeft, ChevronRight, Calendar, UtensilsCrossed } from 'lucide-react'

function shiftMonth(monthStr: string, delta: number): string {
  const [y, m] = monthStr.split('-').map(Number)
  const shifted = new Date(Date.UTC(y, m - 1 + delta, 1))
  return `${shifted.getUTCFullYear()}-${String(shifted.getUTCMonth() + 1).padStart(2, '0')}`
}

export default async function StudentHistoryPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>
}) {
  const { month: monthParam } = await searchParams
  const currentBounds = getISTMonthBounds()
  const month = monthParam ?? currentBounds.month
  const { start, end } = getISTMonthBounds(new Date(`${month}-01T12:00:00Z`))

  const prevMonth = shiftMonth(month, -1)
  const nextMonth = shiftMonth(month, 1)
  const canGoNext = nextMonth <= currentBounds.month

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: ticks } = await supabase
    .from('meal_ticks')
    .select('meal_date, breakfast, dinner')
    .eq('student_id', user!.id)
    .gte('meal_date', start)
    .lt('meal_date', end)
    .order('meal_date', { ascending: false })

  const breakfastCount = (ticks ?? []).filter((t) => t.breakfast).length
  const dinnerCount = (ticks ?? []).filter((t) => t.dinner).length
  const totalCount = breakfastCount + dinnerCount

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Meal History</h1>
        <p className="mt-1 text-sm text-slate-500">Your meal selections this month</p>
      </div>

      <div className="flex items-center justify-center gap-3">
        <a
          href={`/student/history?month=${prevMonth}`}
          className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 transition-colors hover:bg-slate-50"
        >
          <ChevronLeft className="h-4 w-4" />
        </a>
        <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-900">
          <Calendar className="h-4 w-4 text-indigo-600" />
          {formatFriendlyMonth(month)}
        </div>
        {canGoNext ? (
          <a
            href={`/student/history?month=${nextMonth}`}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 transition-colors hover:bg-slate-50"
          >
            <ChevronRight className="h-4 w-4" />
          </a>
        ) : (
          <span className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-100 text-slate-200">
            <ChevronRight className="h-4 w-4" />
          </span>
        )}
      </div>

      <Card className="grid grid-cols-3 divide-x divide-slate-100 p-0! text-center">
        <div className="flex flex-col items-center gap-1 py-4">
          <Sun className="h-5 w-5 text-amber-500" />
          <span className="text-xl font-bold text-slate-900">{breakfastCount}</span>
          <span className="text-xs leading-tight text-slate-500">
            Breakfast
            <br />
            meals
          </span>
        </div>
        <div className="flex flex-col items-center gap-1 py-4">
          <Moon className="h-5 w-5 text-indigo-500" />
          <span className="text-xl font-bold text-slate-900">{dinnerCount}</span>
          <span className="text-xs leading-tight text-slate-500">
            Dinner
            <br />
            meals
          </span>
        </div>
        <div className="flex flex-col items-center gap-1 py-4">
          <Utensils className="h-5 w-5 text-emerald-500" />
          <span className="text-xl font-bold text-slate-900">{totalCount}</span>
          <span className="text-xs leading-tight text-slate-500">
            Total
            <br />
            meals
          </span>
        </div>
      </Card>

      {!ticks?.length ? (
        <Card className="flex flex-col items-center gap-2 py-10 text-center">
          <UtensilsCrossed className="h-10 w-10 text-slate-300" />
          <p className="font-semibold text-slate-700">No meal history yet</p>
          <p className="text-sm text-slate-500">Your meal selections will appear here.</p>
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {ticks.map((t) => {
            const dateObj = new Date(`${t.meal_date}T00:00:00Z`)
            const dayLabel = dateObj.toLocaleDateString('en-US', { weekday: 'short', timeZone: 'UTC' })
            const dayOfMonth = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })
            return (
              <Card key={t.meal_date} className="flex gap-4 p-4!">
                <div className="flex w-14 shrink-0 flex-col items-center justify-center rounded-xl bg-slate-50 py-2">
                  <span className="text-xs font-semibold uppercase text-slate-400">{dayLabel}</span>
                  <span className="text-sm font-bold text-slate-900">{dayOfMonth}</span>
                </div>
                <div className="flex flex-1 flex-col gap-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-2 text-sm font-medium text-slate-700">
                      <Sun className="h-4 w-4 text-amber-500" />
                      Breakfast
                    </span>
                    <span
                      className={`text-xs font-semibold ${t.breakfast ? 'text-emerald-600' : 'text-slate-400'}`}
                    >
                      {t.breakfast ? '✓ Selected' : '— Not selected'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-2 text-sm font-medium text-slate-700">
                      <Moon className="h-4 w-4 text-indigo-500" />
                      Dinner
                    </span>
                    <span
                      className={`text-xs font-semibold ${t.dinner ? 'text-emerald-600' : 'text-slate-400'}`}
                    >
                      {t.dinner ? '✓ Selected' : '— Not selected'}
                    </span>
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
