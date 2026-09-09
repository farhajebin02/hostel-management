import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { LinkButton } from '@/components/ui'

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
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Students</h1>
          <p className="mt-1 text-sm text-slate-500">{students?.length ?? 0} approved student{students?.length === 1 ? '' : 's'}</p>
        </div>
        <LinkButton href="/admin/students/new">+ Add student</LinkButton>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full min-w-[480px] text-left text-sm">
          <thead>
            <tr className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <th className="px-4 py-2.5 font-medium">Name</th>
              <th className="px-4 py-2.5 font-medium">Room</th>
              <th className="px-4 py-2.5 font-medium">Fee status</th>
              <th className="px-4 py-2.5" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {students?.map((s) => (
              <tr key={s.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 font-medium text-slate-900">{s.full_name}</td>
                <td className="px-4 py-3 text-slate-600">{s.room_number}</td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${
                      s.fee_status === 'paid' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                    }`}
                  >
                    {s.fee_status}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <Link href={`/admin/students/${s.id}`} className="font-medium text-indigo-600 hover:text-indigo-700">
                    Edit
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
