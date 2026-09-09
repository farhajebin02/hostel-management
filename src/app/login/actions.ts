'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { isValidPhone, phoneToEmail } from '@/lib/phone'

export async function login(formData: FormData) {
  const identifier = String(formData.get('identifier')).trim()
  const password = String(formData.get('password'))

  let email: string | null = null
  if (identifier.includes('@')) {
    email = identifier
  } else if (isValidPhone(identifier)) {
    email = phoneToEmail(identifier)
  }

  if (!email) {
    redirect(`/login?error=${encodeURIComponent('Enter a valid phone number or email')}`)
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) redirect(`/login?error=${encodeURIComponent(error.message)}`)

  redirect('/')
}
