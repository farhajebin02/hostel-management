import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'

export default async function PendingQueuePage() {
  const supabase = await createClient()
  const { data: pending } = await supabase
    .from('profiles')
    .select('id, full_name, created_at')
    .eq('status', 'pending')
    .order('created_at', { ascending: true })

  return (
    <div>
      <h1 className="mb-4 text-xl font-semibold">Pending Approvals</h1>
      {!pending?.length && <p>No students waiting for approval.</p>}
      <ul className="flex flex-col gap-2">
        {pending?.map((p) => (
          <li key={p.id} className="flex items-center justify-between rounded border p-3">
            <span>{p.full_name || '(no name)'}</span>
            <Link href={`/admin/pending/${p.id}`} className="text-blue-600 underline">
              Review &amp; approve
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
