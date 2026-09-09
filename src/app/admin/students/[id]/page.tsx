import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { updateStudent, deleteStudent } from '../actions'
import { DeleteButton } from './DeleteButton'
import { Button, Card, inputClass, labelClass } from '@/components/ui'

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
    <div className="mx-auto max-w-md">
      <h1 className="text-2xl font-bold text-slate-900">Edit {student.full_name}</h1>
      <Card className="mt-4">
        <form action={updateWithId} className="flex flex-col gap-4">
          <label className={labelClass}>
            Full name
            <input name="full_name" defaultValue={student.full_name ?? ''} required className={inputClass} />
          </label>
          <label className={labelClass}>
            Room number
            <input name="room_number" defaultValue={student.room_number ?? ''} required className={inputClass} />
          </label>
          <label className={labelClass}>
            Permanent address
            <textarea name="permanent_address" defaultValue={student.permanent_address ?? ''} required rows={2} className={inputClass} />
          </label>
          <label className={labelClass}>
            Personal contact number
            <input name="contact_personal" defaultValue={student.contact_personal ?? ''} required className={inputClass} />
          </label>
          <label className={labelClass}>
            Emergency contact number
            <input name="contact_emergency" defaultValue={student.contact_emergency ?? ''} required className={inputClass} />
          </label>
          <label className={labelClass}>
            Fee status
            <select name="fee_status" defaultValue={student.fee_status} className={inputClass}>
              <option value="paid">Paid</option>
              <option value="pending">Pending</option>
            </select>
          </label>
          <label className={labelClass}>
            Replace profile photo
            <input type="file" name="photo" accept="image/*" className={inputClass} />
          </label>
          <Button type="submit" className="mt-2">Save changes</Button>
        </form>
      </Card>

      <Card className="mt-4 border-red-200">
        <h2 className="font-semibold text-red-700">Danger zone</h2>
        <p className="mt-1 text-sm text-slate-500">Permanently remove this student and their login access.</p>
        <form action={deleteWithId} className="mt-3">
          <DeleteButton />
        </form>
      </Card>
    </div>
  )
}
