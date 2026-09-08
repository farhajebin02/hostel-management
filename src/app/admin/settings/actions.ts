'use server'

import { revalidatePath } from 'next/cache'
import { requireAdmin } from '@/lib/auth'

export async function updateCutoffTime(formData: FormData) {
  const { supabase } = await requireAdmin()
  const cutoffTime = String(formData.get('cutoff_time'))

  const { error } = await supabase
    .from('app_settings')
    .update({ cutoff_time: cutoffTime, updated_at: new Date().toISOString() })
    .eq('id', 1)

  if (error) throw new Error(error.message)

  revalidatePath('/admin/settings')
  revalidatePath('/student')
}
