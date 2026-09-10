export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { formatTime12Hour, getTomorrowISTDateString, isBeforeCutoff } from '@/lib/time'
import { submitTick } from './actions'
import { Banner, Button, Card } from '@/components/ui'
import { WelcomeCard } from '@/components/WelcomeCard'
import { Sun, Moon, Lock } from 'lucide-react'

export default async function StudentDashboard({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; success?: string }>
}) {
  const { error, success } = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
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

  const selectedSummary = [tick?.breakfast ? 'Breakfast' : null, tick?.dinner ? 'Dinner' : null]
    .filter(Boolean)
    .join(' and ')

  return (
    <div className="flex flex-col gap-6">
      <WelcomeCard greeting={`${firstName} 👋`} subtitle="Plan your meals for tomorrow." />
      <p className="-mt-3 text-xs text-slate-400">Room {profile?.room_number ?? '—'}</p>

      <div className="flex flex-col gap-3">
        {error && <Banner tone="error">{error}</Banner>}
        {success && (
          <Banner tone="success">
            Meal selection saved!{' '}
            {selectedSummary ? `You're down for ${selectedSummary} tomorrow.` : 'No meals selected for tomorrow.'}
          </Banner>
        )}
      </div>

      <div>
        <div className="flex items-baseline justify-between">
          <h2 className="text-lg font-bold text-slate-900">Tomorrow&apos;s Meals</h2>
          <p className="text-xs text-slate-400">{tomorrow}</p>
        </div>

        {!canSubmit ? (
          <Card className="mt-3 border-red-100 bg-red-50 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-100">
              <Lock className="h-7 w-7 text-red-600" />
            </div>
            <h3 className="mt-3 text-lg font-bold text-red-800">Meal Selection Closed</h3>
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
          <Card className="mt-3">
            <form action={submitTick} className="flex flex-col gap-3">
              <label className="flex cursor-pointer items-center gap-4 rounded-2xl border-2 border-slate-200 p-5 transition-colors has-[:checked]:border-indigo-400 has-[:checked]:bg-indigo-50">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-amber-100">
                  <Sun className="h-6 w-6 text-amber-600" />
                </div>
                <span className="flex-1 text-base font-semibold text-slate-900">Breakfast</span>
                <input
                  type="checkbox"
                  name="breakfast"
                  defaultChecked={tick?.breakfast ?? false}
                  className="h-6 w-6 rounded-md border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
              </label>
              <label className="flex cursor-pointer items-center gap-4 rounded-2xl border-2 border-slate-200 p-5 transition-colors has-[:checked]:border-indigo-400 has-[:checked]:bg-indigo-50">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-indigo-100">
                  <Moon className="h-6 w-6 text-indigo-600" />
                </div>
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
    </div>
  )
}
