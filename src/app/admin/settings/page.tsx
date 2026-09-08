import { createClient } from '@/lib/supabase/server'
import { updateCutoffTime } from './actions'

export default async function SettingsPage() {
  const supabase = await createClient()
  const { data: settings } = await supabase
    .from('app_settings')
    .select('cutoff_time')
    .eq('id', 1)
    .single()

  return (
    <div className="max-w-sm">
      <h1 className="mb-4 text-xl font-semibold">Settings</h1>
      <form action={updateCutoffTime} className="flex flex-col gap-3">
        <label className="flex flex-col gap-1 text-sm">
          Daily cutoff time (IST)
          <input
            type="time"
            name="cutoff_time"
            defaultValue={settings?.cutoff_time?.slice(0, 5) ?? '22:00'}
            required
            className="rounded border p-2"
          />
        </label>
        <button type="submit" className="rounded bg-blue-600 p-2 text-white">Save</button>
      </form>
    </div>
  )
}
