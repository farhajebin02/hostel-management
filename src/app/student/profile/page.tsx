import { createClient } from '@/lib/supabase/server'
import { Card } from '@/components/ui'
import { MapPin, Phone, PhoneCall, ShieldCheck, LogOut, Home } from 'lucide-react'

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

  const infoRows = [
    { icon: MapPin, label: 'Address', value: profile?.permanent_address, callable: false },
    { icon: Phone, label: 'Personal Contact', value: profile?.contact_personal, callable: true },
    { icon: PhoneCall, label: 'Emergency Contact', value: profile?.contact_emergency, callable: true },
  ]

  return (
    <div className="mx-auto flex max-w-sm flex-col gap-5">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">My Profile</h1>
        <p className="mt-1 text-sm text-slate-500">Your information</p>
      </div>

      <Card className="flex items-center gap-4">
        {photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photoUrl} alt="Profile" className="h-16 w-16 shrink-0 rounded-full object-cover" />
        ) : (
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-xl font-semibold text-indigo-600">
            {profile?.full_name?.charAt(0)?.toUpperCase() ?? '?'}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <h2 className="break-words text-base font-bold text-slate-900">{profile?.full_name}</h2>
          <p className="text-sm text-slate-500">Student</p>
          {profile?.room_number && (
            <div className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700">
              <Home className="h-3 w-3" />
              Room {profile.room_number}
            </div>
          )}
        </div>
      </Card>

      <div>
        <h3 className="mb-2 text-sm font-bold text-slate-900">Personal Information</h3>
        <Card className="divide-y divide-slate-100 p-0!">
          {infoRows.map((row) => (
            <div key={row.label} className="flex items-center gap-3 p-4">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-indigo-50">
                <row.icon className="h-4 w-4 text-indigo-600" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-slate-400">{row.label}</p>
                <p className="break-words text-sm font-semibold text-slate-800">{row.value || '—'}</p>
              </div>
              {row.callable && row.value && (
                <a
                  href={`tel:${row.value}`}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 transition-colors hover:bg-emerald-100"
                >
                  <Phone className="h-4 w-4" />
                </a>
              )}
            </div>
          ))}
        </Card>
      </div>

      <Card className="flex items-start gap-3 border-indigo-100 bg-indigo-50">
        <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-indigo-600" />
        <div>
          <p className="text-sm font-semibold text-indigo-900">Account Information</p>
          <p className="mt-0.5 text-sm text-indigo-700">
            Keep your information up to date. Contact the hostel management if you need to make any changes.
          </p>
        </div>
      </Card>

      <form action="/logout" method="post">
        <button
          type="submit"
          className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-red-100 bg-white py-3 text-sm font-semibold text-red-600 transition-colors hover:bg-red-50"
        >
          <LogOut className="h-4 w-4" />
          Log Out
        </button>
      </form>
    </div>
  )
}
