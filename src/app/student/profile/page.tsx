import { createClient } from '@/lib/supabase/server'
import { Card } from '@/components/ui'

export default async function StudentProfilePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, room_number, permanent_address, contact_personal, contact_emergency, photo_path')
    .eq('id', user!.id)
    .single()

  let photoUrl: string | null = null
  if (profile?.photo_path) {
    const { data: signed } = await supabase.storage
      .from('profile-photos')
      .createSignedUrl(profile.photo_path, 60)
    photoUrl = signed?.signedUrl ?? null
  }

  const fields: { label: string; value: string | null | undefined }[] = [
    { label: 'Room', value: profile?.room_number },
    { label: 'Address', value: profile?.permanent_address },
    { label: 'Personal contact', value: profile?.contact_personal },
    { label: 'Emergency contact', value: profile?.contact_emergency },
  ]

  return (
    <div className="mx-auto max-w-sm">
      <h1 className="text-2xl font-bold text-slate-900">My Profile</h1>
      <Card className="mt-4">
        <div className="flex flex-col items-center text-center">
          {photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={photoUrl} alt="Profile" className="h-24 w-24 rounded-full border-4 border-indigo-50 object-cover" />
          ) : (
            <div className="flex h-24 w-24 items-center justify-center rounded-full bg-indigo-100 text-2xl font-semibold text-indigo-600">
              {profile?.full_name?.charAt(0)?.toUpperCase() ?? '?'}
            </div>
          )}
          <h2 className="mt-3 text-lg font-semibold text-slate-900">{profile?.full_name}</h2>
        </div>
        <dl className="mt-6 flex flex-col divide-y divide-slate-100">
          {fields.map((f) => (
            <div key={f.label} className="flex justify-between gap-4 py-3 text-sm">
              <dt className="text-slate-500">{f.label}</dt>
              <dd className="text-right font-medium text-slate-900">{f.value}</dd>
            </div>
          ))}
        </dl>
      </Card>
    </div>
  )
}
