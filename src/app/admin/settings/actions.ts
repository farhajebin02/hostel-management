'use server'

import { revalidatePath } from 'next/cache'
import { requireAdmin } from '@/lib/auth'

export async function updateTickWindow(formData: FormData) {
  const { supabase } = await requireAdmin()
  const openTime = String(formData.get('open_time'))
  const cutoffTime = String(formData.get('cutoff_time'))

  if (openTime >= cutoffTime) {
    throw new Error('Opening time must be earlier than the cutoff time')
  }

  const { error } = await supabase
    .from('app_settings')
    .update({ open_time: openTime, cutoff_time: cutoffTime, updated_at: new Date().toISOString() })
    .eq('id', 1)

  if (error) throw new Error(error.message)

  revalidatePath('/admin/settings')
  revalidatePath('/student')
}

export async function updateHostelRent(formData: FormData) {
  const { supabase } = await requireAdmin()
  const hostelRent = Number(formData.get('hostel_rent'))

  if (!Number.isFinite(hostelRent) || hostelRent < 0) {
    throw new Error('Hostel rent must be a non-negative number')
  }

  const { error } = await supabase
    .from('app_settings')
    .update({ hostel_rent: hostelRent, updated_at: new Date().toISOString() })
    .eq('id', 1)

  if (error) throw new Error(error.message)

  revalidatePath('/admin/settings')
  revalidatePath('/admin/billing')
}
