import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Card } from '@/components/ui'

export default async function PendingQueuePage() {
  const supabase = await createClient()
  const { data: pending } = await supabase
    .from('profiles')
    .select('id, full_name, created_at')
    .eq('status', 'pending')
    .order('created_at', { ascending: true })

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900">Pending Approvals</h1>
      <p className="mt-1 text-sm text-slate-500">Students waiting for you to review and approve their registration.</p>

      {!pending?.length ? (
        <Card className="mt-4 text-center text-sm text-slate-500">No students waiting for approval.</Card>
      ) : (
        <div className="mt-4 flex flex-col gap-2">
          {pending.map((p) => (
            <Card key={p.id} className="flex items-center justify-between p-4!">
              <span className="font-medium text-slate-900">{p.full_name || '(no name)'}</span>
              <Link href={`/admin/pending/${p.id}`} className="text-sm font-medium text-indigo-600 hover:text-indigo-700">
                Review &amp; approve →
              </Link>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
