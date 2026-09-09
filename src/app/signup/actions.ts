'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { isValidPhone, normalizePhone, phoneToEmail } from '@/lib/phone'

export async function signup(formData: FormData) {
  const phone = String(formData.get('phone'))
  const password = String(formData.get('password'))
  const fullName = String(formData.get('full_name'))

  if (!isValidPhone(phone)) {
    redirect(`/signup?error=${encodeURIComponent('Enter a valid 10-digit mobile number')}`)
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.signUp({
    email: phoneToEmail(phone),
    password,
    options: { data: { full_name: fullName, phone: normalizePhone(phone) } },
  })

  if (error) redirect(`/signup?error=${encodeURIComponent(error.message)}`)

  redirect('/pending')
}
