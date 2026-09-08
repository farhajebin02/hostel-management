import { createClient } from '@/lib/supabase/server'
import { getTomorrowISTDateString, isBeforeCutoff } from '@/lib/time'
import { submitTick } from './actions'

export default async function StudentDashboard({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const { error } = await searchParams
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
    <div className="max-w-sm">
      <h1 className="mb-2 text-xl font-semibold">Tomorrow ({tomorrow})</h1>
      <p className="mb-4 text-sm text-gray-600">Daily cutoff: {cutoffTime} IST</p>
      {error && <p className="mb-4 rounded bg-red-100 p-2 text-sm text-red-700">{error}</p>}
      {!canSubmit && (
        <p className="mb-4 rounded bg-yellow-100 p-2 text-sm text-yellow-800">
          Today&apos;s cutoff has passed. Tomorrow&apos;s ticks are locked.
        </p>
      )}
      <form action={submitTick} className="flex flex-col gap-3">
        <label className="flex items-center gap-2">
          <input type="checkbox" name="breakfast" defaultChecked={tick?.breakfast ?? false} disabled={!canSubmit} />
          Tomorrow&apos;s Breakfast
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" name="dinner" defaultChecked={tick?.dinner ?? false} disabled={!canSubmit} />
          Tomorrow&apos;s Dinner
        </label>
        <button type="submit" disabled={!canSubmit} className="rounded bg-blue-600 p-2 text-white disabled:opacity-50">
          Save my ticks
        </button>
      </form>
    </div>
  )
}
