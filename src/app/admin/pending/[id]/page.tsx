import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { approveStudent } from '../actions'
import { Button, Card, inputClass, labelClass } from '@/components/ui'

export default async function ReviewPendingStudent({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const { data: student } = await supabase
    .from('profiles')
    .select('id, full_name, contact_personal')
    .eq('id', id)
    .eq('status', 'pending')
    .single()

  if (!student) notFound()

  const approveWithId = approveStudent.bind(null, student.id)

  return (
    <div className="mx-auto max-w-md">
      <h1 className="text-2xl font-bold text-slate-900">Approve {student.full_name}</h1>
      <Card className="mt-4">
        <form action={approveWithId} className="flex flex-col gap-4">
          <label className={labelClass}>
            Full name
            <input name="full_name" defaultValue={student.full_name ?? ''} required className={inputClass} />
          </label>
          <label className={labelClass}>
            Room number
            <input name="room_number" required className={inputClass} />
          </label>
          <label className={labelClass}>
            Permanent address
            <textarea name="permanent_address" required rows={2} className={inputClass} />
          </label>
          <label className={labelClass}>
            Personal contact number
            <input name="contact_personal" defaultValue={student.contact_personal ?? ''} required className={inputClass} />
          </label>
          <label className={labelClass}>
            Emergency contact number
            <input name="contact_emergency" required className={inputClass} />
          </label>
          <label className={labelClass}>
            Profile photo
            <input type="file" name="photo" accept="image/*" className={inputClass} />
          </label>
          <Button type="submit" className="mt-2">Approve student</Button>
        </form>
      </Card>
    </div>
  )
}
