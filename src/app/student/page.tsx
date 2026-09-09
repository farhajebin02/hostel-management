export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { getTomorrowISTDateString, isBeforeCutoff } from '@/lib/time'
import { submitTick } from './actions'
import { Banner, Button, Card } from '@/components/ui'

export default async function StudentDashboard({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; success?: string }>
}) {
  const { error, success } = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const tomorrow = getTomorrowISTDateString()

  const { data: settings } = await supabase
    .from('app_settings')
    .select('cutoff_time')
    .eq('id', 1)
    .single()

  const cutoffTime = settings?.cutoff_time?.slice(0, 5) ?? '22:00'
  const canSubmit = isBeforeCutoff(new Date(), cutoffTime)

  const { data: tick } = await supabase
    .from('meal_ticks')
    .select('breakfast, dinner')
    .eq('student_id', user!.id)
    .eq('meal_date', tomorrow)
    .maybeSingle()

  return (
    <div className="mx-auto max-w-sm">
      <h1 className="text-2xl font-bold text-slate-900">Tomorrow</h1>
      <p className="mt-1 text-sm text-slate-500">{tomorrow} &middot; cutoff {cutoffTime} IST</p>

      <div className="mt-4 flex flex-col gap-3">
        {error && <Banner tone="error">{error}</Banner>}
        {success && <Banner tone="success">Ticks saved successfully!</Banner>}
        {!canSubmit && <Banner tone="warning">Today&apos;s cutoff has passed. Tomorrow&apos;s ticks are locked.</Banner>}
      </div>

      <Card className="mt-4">
        <form action={submitTick} className="flex flex-col gap-3">
          <label className="flex items-center gap-3 rounded-lg border border-slate-200 px-4 py-3 has-[:checked]:border-indigo-300 has-[:checked]:bg-indigo-50">
            <input
              type="checkbox"
              name="breakfast"
              defaultChecked={tick?.breakfast ?? false}
              disabled={!canSubmit}
              className="h-5 w-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
            />
            <span className="text-sm font-medium text-slate-900">☀️ Breakfast</span>
          </label>
          <label className="flex items-center gap-3 rounded-lg border border-slate-200 px-4 py-3 has-[:checked]:border-indigo-300 has-[:checked]:bg-indigo-50">
            <input
              type="checkbox"
              name="dinner"
              defaultChecked={tick?.dinner ?? false}
              disabled={!canSubmit}
              className="h-5 w-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
            />
            <span className="text-sm font-medium text-slate-900">🌙 Dinner</span>
          </label>
          <Button type="submit" disabled={!canSubmit} className="mt-2 w-full">
            Save my meals
          </Button>
        </form>
      </Card>
    </div>
  )
}
