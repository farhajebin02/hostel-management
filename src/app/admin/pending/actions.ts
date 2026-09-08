'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { requireAdmin } from '@/lib/auth'

export async function approveStudent(studentId: string, formData: FormData) {
  const { supabase } = await requireAdmin()

  let photoPath: string | null = null
  const photo = formData.get('photo')
  if (photo instanceof File && photo.size > 0) {
    const safeName = photo.name.replace(/[^a-zA-Z0-9._-]/g, '_')
    photoPath = `${studentId}/${Date.now()}-${safeName}`
    const { error: uploadError } = await supabase.storage
      .from('profile-photos')
      .upload(photoPath, photo, { upsert: true })
    if (uploadError) throw new Error(uploadError.message)
  }

  const { error } = await supabase
    .from('profiles')
    .update({
      full_name: String(formData.get('full_name')),
      room_number: String(formData.get('room_number')),
      permanent_address: String(formData.get('permanent_address')),
      contact_personal: String(formData.get('contact_personal')),
      contact_emergency: String(formData.get('contact_emergency')),
      status: 'approved',
      ...(photoPath ? { photo_path: photoPath } : {}),
    })
    .eq('id', studentId)

  if (error) throw new Error(error.message)

  revalidatePath('/admin/pending')
  redirect('/admin/pending')
}
