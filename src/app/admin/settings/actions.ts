'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function updateCutoffTime(formData: FormData) {
  const cutoffTime = String(formData.get('cutoff_time'))
  const supabase = await createClient()

  const { error } = await supabase
    .from('app_settings')
    .update({ cutoff_time: cutoffTime, updated_at: new Date().toISOString() })
    .eq('id', 1)

  if (error) throw new Error(error.message)

  revalidatePath('/admin/settings')
  revalidatePath('/student')
}
