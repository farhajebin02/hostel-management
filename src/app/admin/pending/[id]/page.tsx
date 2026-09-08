import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { approveStudent } from '../actions'

export default async function ReviewPendingStudent({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const { data: student } = await supabase
    .from('profiles')
    .select('id, full_name')
    .eq('id', id)
    .eq('status', 'pending')
    .single()

  if (!student) notFound()

  const approveWithId = approveStudent.bind(null, student.id)

  return (
    <div className="max-w-md">
      <h1 className="mb-4 text-xl font-semibold">Approve {student.full_name}</h1>
      <form action={approveWithId} className="flex flex-col gap-3">
        <input name="full_name" defaultValue={student.full_name ?? ''} placeholder="Full name" required className="rounded border p-2" />
        <input name="room_number" placeholder="Room number" required className="rounded border p-2" />
        <textarea name="permanent_address" placeholder="Permanent address" required className="rounded border p-2" />
        <input name="contact_personal" placeholder="Personal contact number" required className="rounded border p-2" />
        <input name="contact_emergency" placeholder="Emergency contact number" required className="rounded border p-2" />
        <label className="flex flex-col gap-1 text-sm">
          Profile photo
          <input type="file" name="photo" accept="image/*" className="rounded border p-2" />
        </label>
        <button type="submit" className="rounded bg-green-600 p-2 text-white">Approve student</button>
      </form>
    </div>
  )
}
