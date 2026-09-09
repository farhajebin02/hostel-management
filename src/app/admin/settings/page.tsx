import { createClient } from '@/lib/supabase/server'
import { updateCutoffTime, updateHostelRent } from './actions'
import { Button, Card, inputClass, labelClass } from '@/components/ui'

export default async function SettingsPage() {
  const supabase = await createClient()
  const { data: settings } = await supabase
    .from('app_settings')
    .select('cutoff_time, hostel_rent')
    .eq('id', 1)
    .single()

  return (
    <div className="mx-auto max-w-sm">
      <h1 className="text-2xl font-bold text-slate-900">Settings</h1>

      <Card className="mt-4">
        <h2 className="font-semibold text-slate-900">Daily cutoff time</h2>
        <p className="mt-1 text-sm text-slate-500">Students can tick tomorrow&apos;s meals until this time (IST).</p>
        <form action={updateCutoffTime} className="mt-4 flex flex-col gap-3">
          <label className={labelClass}>
            Cutoff time (IST)
            <input
              type="time"
              name="cutoff_time"
              defaultValue={settings?.cutoff_time?.slice(0, 5) ?? '22:00'}
              required
              className={inputClass}
            />
          </label>
          <Button type="submit">Save cutoff time</Button>
        </form>
      </Card>

      <Card className="mt-4">
        <h2 className="font-semibold text-slate-900">Hostel rent</h2>
        <p className="mt-1 text-sm text-slate-500">Flat monthly rent added to every student&apos;s bill, on top of the mess fee.</p>
        <form action={updateHostelRent} className="mt-4 flex flex-col gap-3">
          <label className={labelClass}>
            Hostel rent (₹ per month)
            <input
              type="number"
              name="hostel_rent"
              min="0"
              step="1"
              defaultValue={settings?.hostel_rent ?? 2700}
              required
              className={inputClass}
            />
          </label>
          <Button type="submit">Save rent amount</Button>
        </form>
      </Card>
    </div>
  )
}
