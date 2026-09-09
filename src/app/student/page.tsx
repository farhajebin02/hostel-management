export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { getISTDateString, getTomorrowISTDateString, isBeforeCutoff } from '@/lib/time'
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
  const today = getISTDateString()
  const tomorrow = getTomorrowISTDateString()

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, room_number')
    .eq('id', user!.id)
    .single()

  const firstName = profile?.full_name?.split(' ')[0] || 'there'

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
      <h1 className="text-2xl font-bold text-slate-900">Hi, {firstName} 👋</h1>
      <p className="mt-1 text-sm text-slate-500">
        Room {profile?.room_number ?? '—'} &middot; {today}
      </p>

      <div className="mt-4 flex flex-col gap-3">
        {error && <Banner tone="error">{error}</Banner>}
        {success && <Banner tone="success">Ticks saved successfully!</Banner>}
        {!canSubmit && (
          <Banner tone="warning">
            Today&apos;s meal selection window has closed. Please come back tomorrow.
          </Banner>
        )}
      </div>

      <div className="mt-6 flex items-baseline justify-between">
        <p className="text-sm font-semibold text-slate-700">Tomorrow&apos;s meals</p>
        <p className="text-xs text-slate-400">{tomorrow} &middot; cutoff {cutoffTime} IST</p>
      </div>

      <Card className="mt-2">
        <form action={submitTick} className="flex flex-col gap-3">
          <label className="flex cursor-pointer items-center gap-4 rounded-xl border-2 border-slate-200 p-5 transition-colors has-[:checked]:border-indigo-400 has-[:checked]:bg-indigo-50 has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-50">
            <span className="text-3xl">☀️</span>
            <span className="flex-1 text-base font-semibold text-slate-900">Breakfast</span>
            <input
              type="checkbox"
              name="breakfast"
              defaultChecked={tick?.breakfast ?? false}
              disabled={!canSubmit}
              className="h-6 w-6 rounded-md border-slate-300 text-indigo-600 focus:ring-indigo-500"
            />
          </label>
          <label className="flex cursor-pointer items-center gap-4 rounded-xl border-2 border-slate-200 p-5 transition-colors has-[:checked]:border-indigo-400 has-[:checked]:bg-indigo-50 has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-50">
            <span className="text-3xl">🌙</span>
            <span className="flex-1 text-base font-semibold text-slate-900">Dinner</span>
            <input
              type="checkbox"
              name="dinner"
              defaultChecked={tick?.dinner ?? false}
              disabled={!canSubmit}
              className="h-6 w-6 rounded-md border-slate-300 text-indigo-600 focus:ring-indigo-500"
            />
          </label>
          <Button type="submit" disabled={!canSubmit} className="mt-2 w-full py-3 text-base">
            Save my meals
          </Button>
        </form>
      </Card>
    </div>
  )
}
