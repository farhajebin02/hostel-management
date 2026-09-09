'use server'

import { redirect } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireAdmin } from '@/lib/auth'
import { isValidPhone, normalizePhone, phoneToEmail } from '@/lib/phone'

export async function createStudent(formData: FormData) {
  const { supabase } = await requireAdmin()

  const phone = String(formData.get('phone'))
  const startingPassword = String(formData.get('starting_password'))
  const fullName = String(formData.get('full_name'))
  const roomNumber = String(formData.get('room_number'))
  const permanentAddress = String(formData.get('permanent_address'))
  const contactPersonal = String(formData.get('contact_personal'))
  const contactEmergency = String(formData.get('contact_emergency'))

  if (!isValidPhone(phone)) {
    throw new Error('Enter a valid 10-digit mobile number')
  }

  const adminClient = createAdminClient()
  const { data: created, error: createError } = await adminClient.auth.admin.createUser({
    email: phoneToEmail(phone),
    password: startingPassword,
    email_confirm: true,
    user_metadata: { full_name: fullName, phone: normalizePhone(phone) },
  })

  if (createError || !created.user) {
    throw new Error(createError?.message ?? 'Failed to create student account')
  }

  let photoPath: string | null = null
  const photo = formData.get('photo')
  if (photo instanceof File && photo.size > 0) {
    const safeName = photo.name.replace(/[^a-zA-Z0-9._-]/g, '_')
    photoPath = `${created.user.id}/${Date.now()}-${safeName}`
    const { error: uploadError } = await supabase.storage
      .from('profile-photos')
      .upload(photoPath, photo, { upsert: true })
    if (uploadError) throw new Error(uploadError.message)
  }

  const { error: updateError } = await supabase
    .from('profiles')
    .update({
      full_name: fullName,
      room_number: roomNumber,
      permanent_address: permanentAddress,
      contact_personal: contactPersonal,
      contact_emergency: contactEmergency,
      status: 'approved',
      ...(photoPath ? { photo_path: photoPath } : {}),
    })
    .eq('id', created.user.id)

  if (updateError) throw new Error(updateError.message)

  redirect('/admin/students')
}

export async function updateStudent(studentId: string, formData: FormData) {
  const { supabase } = await requireAdmin()

  let photoPath: string | undefined
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
      fee_status: String(formData.get('fee_status')),
      ...(photoPath ? { photo_path: photoPath } : {}),
    })
    .eq('id', studentId)

  if (error) throw new Error(error.message)

  redirect('/admin/students')
}

export async function deleteStudent(studentId: string) {
  await requireAdmin()
  const adminClient = createAdminClient()
  const { error } = await adminClient.auth.admin.deleteUser(studentId)
  if (error) throw new Error(error.message)
  redirect('/admin/students')
}
