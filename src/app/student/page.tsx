export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { formatTime12Hour, getISTDateString, getTomorrowISTDateString, isBeforeCutoff } from '@/lib/time'
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

  const selectedSummary = [tick?.breakfast ? '☀️ Breakfast' : null, tick?.dinner ? '🌙 Dinner' : null]
    .filter(Boolean)
    .join(' and ')

  return (
    <div className="mx-auto max-w-sm">
      <h1 className="text-2xl font-bold text-slate-900">Hi, {firstName} 👋</h1>
      <p className="mt-1 text-sm text-slate-600">Let&apos;s plan your meals for tomorrow.</p>
      <p className="mt-0.5 text-xs text-slate-400">
        Room {profile?.room_number ?? '—'} &middot; {today}
      </p>

      <div className="mt-4 flex flex-col gap-3">
        {error && <Banner tone="error">{error}</Banner>}
        {success && (
          <Banner tone="success">
            Meal selection saved!{' '}
            {selectedSummary ? `You're down for ${selectedSummary} tomorrow.` : 'No meals selected for tomorrow.'}
          </Banner>
        )}
      </div>

      <div className="mt-6 flex items-baseline justify-between">
        <p className="text-sm font-semibold text-slate-700">Tomorrow&apos;s Meals</p>
        <p className="text-xs text-slate-400">{tomorrow}</p>
      </div>

      {!canSubmit ? (
        <Card className="mt-2 border-red-100 bg-red-50 text-center">
          <div className="text-4xl">🔒</div>
          <h2 className="mt-2 text-lg font-bold text-red-800">Meal Selection Closed</h2>
          <p className="mt-1 text-sm text-red-700">
            Today&apos;s meal selection window has ended.
            <br />
            Please come back tomorrow to select your meals.
          </p>
          {selectedSummary && (
            <p className="mt-3 rounded-lg bg-white px-3 py-2 text-sm font-medium text-slate-700">
              Your saved choice: {selectedSummary}
            </p>
          )}
        </Card>
      ) : (
        <Card className="mt-2">
          <form action={submitTick} className="flex flex-col gap-3">
            <label className="flex cursor-pointer items-center gap-4 rounded-xl border-2 border-slate-200 p-5 transition-colors has-[:checked]:border-indigo-400 has-[:checked]:bg-indigo-50">
              <span className="text-3xl">☀️</span>
              <span className="flex-1 text-base font-semibold text-slate-900">Breakfast</span>
              <input
                type="checkbox"
                name="breakfast"
                defaultChecked={tick?.breakfast ?? false}
                className="h-6 w-6 rounded-md border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
            </label>
            <label className="flex cursor-pointer items-center gap-4 rounded-xl border-2 border-slate-200 p-5 transition-colors has-[:checked]:border-indigo-400 has-[:checked]:bg-indigo-50">
              <span className="text-3xl">🌙</span>
              <span className="flex-1 text-base font-semibold text-slate-900">Dinner</span>
              <input
                type="checkbox"
                name="dinner"
                defaultChecked={tick?.dinner ?? false}
                className="h-6 w-6 rounded-md border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
            </label>
            <Button type="submit" className="mt-2 w-full py-3 text-base">
              Save Meal Selection
            </Button>
          </form>
        </Card>
      )}

      <p className="mt-4 text-center text-xs text-slate-400">
        Meal selection closes at {formatTime12Hour(cutoffTime)}.
      </p>
    </div>
  )
}
