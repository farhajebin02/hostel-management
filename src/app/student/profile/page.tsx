import { createClient } from '@/lib/supabase/server'

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

  return (
    <div className="max-w-sm">
      <h1 className="mb-4 text-xl font-semibold">My Profile</h1>
      {photoUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={photoUrl} alt="Profile" className="mb-4 h-32 w-32 rounded-full object-cover" />
      )}
      <dl className="flex flex-col gap-2 text-sm">
        <div><dt className="font-medium">Name</dt><dd>{profile?.full_name}</dd></div>
        <div><dt className="font-medium">Room</dt><dd>{profile?.room_number}</dd></div>
        <div><dt className="font-medium">Address</dt><dd>{profile?.permanent_address}</dd></div>
        <div><dt className="font-medium">Personal contact</dt><dd>{profile?.contact_personal}</dd></div>
        <div><dt className="font-medium">Emergency contact</dt><dd>{profile?.contact_emergency}</dd></div>
      </dl>
    </div>
  )
}
