import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'

export default async function StudentsPage() {
  const supabase = await createClient()
  const { data: students } = await supabase
    .from('profiles')
    .select('id, full_name, room_number, fee_status')
    .eq('role', 'student')
    .eq('status', 'approved')
    .order('full_name', { ascending: true })

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold">Students</h1>
        <Link href="/admin/students/new" className="rounded bg-blue-600 px-3 py-1 text-white">
          Add student
        </Link>
      </div>
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b">
            <th className="p-2">Name</th>
            <th className="p-2">Room</th>
            <th className="p-2">Fee status</th>
            <th className="p-2" />
          </tr>
        </thead>
        <tbody>
          {students?.map((s) => (
            <tr key={s.id} className="border-b">
              <td className="p-2">{s.full_name}</td>
              <td className="p-2">{s.room_number}</td>
              <td className="p-2 capitalize">{s.fee_status}</td>
              <td className="p-2">
                <Link href={`/admin/students/${s.id}`} className="text-blue-600 underline">Edit</Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
