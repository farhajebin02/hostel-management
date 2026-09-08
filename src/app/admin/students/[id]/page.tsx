import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { updateStudent, deleteStudent } from '../actions'
import { DeleteButton } from './DeleteButton'

export default async function EditStudentPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const { data: student } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', id)
    .eq('role', 'student')
    .single()

  if (!student) notFound()

  const updateWithId = updateStudent.bind(null, student.id)
  const deleteWithId = deleteStudent.bind(null, student.id)

  return (
    <div className="max-w-md">
      <h1 className="mb-4 text-xl font-semibold">Edit {student.full_name}</h1>
      <form action={updateWithId} className="flex flex-col gap-3">
        <input name="full_name" defaultValue={student.full_name ?? ''} required className="rounded border p-2" />
        <input name="room_number" defaultValue={student.room_number ?? ''} required className="rounded border p-2" />
        <textarea name="permanent_address" defaultValue={student.permanent_address ?? ''} required className="rounded border p-2" />
        <input name="contact_personal" defaultValue={student.contact_personal ?? ''} required className="rounded border p-2" />
        <input name="contact_emergency" defaultValue={student.contact_emergency ?? ''} required className="rounded border p-2" />
        <select name="fee_status" defaultValue={student.fee_status} className="rounded border p-2">
          <option value="paid">Paid</option>
          <option value="pending">Pending</option>
        </select>
        <label className="flex flex-col gap-1 text-sm">
          Replace profile photo
          <input type="file" name="photo" accept="image/*" className="rounded border p-2" />
        </label>
        <button type="submit" className="rounded bg-blue-600 p-2 text-white">Save changes</button>
      </form>
      <form action={deleteWithId} className="mt-4">
        <DeleteButton />
      </form>
    </div>
  )
}
