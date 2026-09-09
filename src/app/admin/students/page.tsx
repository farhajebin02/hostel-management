import { createClient } from '@/lib/supabase/server'
import { LinkButton } from '@/components/ui'
import { StudentsTable, type StudentRow } from './StudentsTable'

export default async function StudentsPage() {
  const supabase = await createClient()
  const { data: students } = await supabase
    .from('profiles')
    .select('id, full_name, room_number, fee_status, photo_path')
    .eq('role', 'student')
    .eq('status', 'approved')
    .order('full_name', { ascending: true })

  const rows: StudentRow[] = await Promise.all(
    (students ?? []).map(async (s) => {
      let photoUrl: string | null = null
      if (s.photo_path) {
        const { data: signed } = await supabase.storage
          .from('profile-photos')
          .createSignedUrl(s.photo_path, 300)
        photoUrl = signed?.signedUrl ?? null
      }
      return {
        id: s.id,
        fullName: s.full_name,
        roomNumber: s.room_number,
        feeStatus: s.fee_status,
        photoUrl,
      }
    })
  )

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Students</h1>
          <p className="mt-1 text-sm text-slate-500">
            {rows.length} approved student{rows.length === 1 ? '' : 's'}
          </p>
        </div>
        <LinkButton href="/admin/students/new">+ Add student</LinkButton>
      </div>
      <StudentsTable students={rows} />
    </div>
  )
}
