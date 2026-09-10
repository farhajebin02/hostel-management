export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import {
  formatFriendlyDate,
  formatTime12Hour,
  getISTGreeting,
  getTickWindowStatus,
  getTomorrowISTDateString,
} from '@/lib/time'
import { submitTick } from './actions'
import { Card } from '@/components/ui'
import { WelcomeCard } from '@/components/WelcomeCard'
import { SaveButton } from '@/components/SaveButton'
import { Sun, Moon, Lock, Clock, CheckCircle2, Check } from 'lucide-react'

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
    .select('open_time, cutoff_time')
    .eq('id', 1)
    .single()

  const openTime = settings?.open_time?.slice(0, 5) ?? '16:00'
  const cutoffTime = settings?.cutoff_time?.slice(0, 5) ?? '22:00'
  const windowStatus = getTickWindowStatus(new Date(), openTime, cutoffTime)

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
    <div className="flex flex-col gap-5">
      <WelcomeCard
        eyebrow={`${getISTGreeting()},`}
        greeting={`${firstName} 👋`}
        subtitle="Plan your meals for tomorrow."
        badge={profile?.room_number ? `Room ${profile.room_number}` : undefined}
      />

      {error && <Card className="border-red-100 bg-red-50 text-sm font-medium text-red-700">{error}</Card>}

      <div>
        <div className="flex items-baseline justify-between">
          <h2 className="text-lg font-bold text-slate-900">Tomorrow&apos;s Meals</h2>
          <p className="text-xs font-medium text-slate-400">{formatFriendlyDate(tomorrow)}</p>
        </div>

        {windowStatus === 'before-open' ? (
          <Card className="mt-3 border-amber-100 bg-amber-50 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-amber-100">
              <Clock className="h-7 w-7 text-amber-600" />
            </div>
            <h3 className="mt-3 text-lg font-bold text-amber-800">Meal Selection Not Open Yet</h3>
            <p className="mt-1 text-sm text-amber-700">
              Selection opens at {formatTime12Hour(openTime)}.
              <br />
              Come back then to choose tomorrow&apos;s meals.
            </p>
          </Card>
        ) : windowStatus === 'after-close' ? (
          <Card className="mt-3 border-red-100 bg-red-50 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-100">
              <Lock className="h-7 w-7 text-red-600" />
            </div>
            <h3 className="mt-3 text-lg font-bold text-red-800">Meal Selection Closed</h3>
            <p className="mt-1 text-sm text-red-700">
              Today&apos;s selection window has ended.
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
          <>
            <form action={submitTick} className="mt-3 flex flex-col gap-3">
              <div className="grid grid-cols-2 gap-3">
                <label className="relative flex cursor-pointer flex-col items-center gap-1 rounded-2xl border-2 border-slate-200 bg-white p-4 text-center transition-colors has-[:checked]:border-indigo-400 has-[:checked]:bg-indigo-50">
                  <input
                    type="checkbox"
                    name="breakfast"
                    defaultChecked={tick?.breakfast ?? false}
                    className="peer sr-only"
                  />
                  <span className="absolute right-3 top-3 flex h-6 w-6 items-center justify-center rounded-full border-2 border-slate-300 bg-white transition-colors peer-checked:border-indigo-600 peer-checked:bg-indigo-600">
                    <Check className="h-3.5 w-3.5 text-white" strokeWidth={3} />
                  </span>
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-100">
                    <Sun className="h-7 w-7 text-amber-600" />
                  </div>
                  <span className="mt-1 text-base font-semibold text-slate-900">Breakfast</span>
                  <span className="text-xs leading-snug text-slate-500">Start your day with a healthy meal</span>
                </label>

                <label className="relative flex cursor-pointer flex-col items-center gap-1 rounded-2xl border-2 border-slate-200 bg-white p-4 text-center transition-colors has-[:checked]:border-indigo-400 has-[:checked]:bg-indigo-50">
                  <input
                    type="checkbox"
                    name="dinner"
                    defaultChecked={tick?.dinner ?? false}
                    className="peer sr-only"
                  />
                  <span className="absolute right-3 top-3 flex h-6 w-6 items-center justify-center rounded-full border-2 border-slate-300 bg-white transition-colors peer-checked:border-indigo-600 peer-checked:bg-indigo-600">
                    <Check className="h-3.5 w-3.5 text-white" strokeWidth={3} />
                  </span>
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-100">
                    <Moon className="h-7 w-7 text-indigo-600" />
                  </div>
                  <span className="mt-1 text-base font-semibold text-slate-900">Dinner</span>
                  <span className="text-xs leading-snug text-slate-500">Enjoy your evening meal</span>
                </label>
              </div>

              <SaveButton />
            </form>

            {success && (
              <Card className="mt-3 border-emerald-100 bg-emerald-50">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
                  <div>
                    <p className="text-sm font-semibold text-emerald-800">
                      {selectedSummary
                        ? 'Your meals for tomorrow are confirmed!'
                        : 'Selection saved for tomorrow.'}
                    </p>
                    <p className="mt-0.5 text-sm text-emerald-700">
                      {selectedSummary ? `${selectedSummary} selected.` : 'No meals selected.'}
                    </p>
                  </div>
                </div>
              </Card>
            )}

            <Card className="mt-3 flex items-start gap-3 bg-slate-50">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-200">
                <Clock className="h-4 w-4 text-slate-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-700">
                  Selection closes at {formatTime12Hour(cutoffTime)}
                </p>
                <p className="mt-0.5 text-xs text-slate-500">You can update your selection anytime before the deadline.</p>
              </div>
            </Card>
          </>
        )}
      </div>
    </div>
  )
}
