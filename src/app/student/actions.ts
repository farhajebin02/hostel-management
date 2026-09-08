'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getTomorrowISTDateString } from '@/lib/time'

export async function submitTick(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const tomorrow = getTomorrowISTDateString()
  const breakfast = formData.get('breakfast') === 'on'
  const dinner = formData.get('dinner') === 'on'

  const { error } = await supabase
    .from('meal_ticks')
    .upsert(
      { student_id: user.id, meal_date: tomorrow, breakfast, dinner },
      { onConflict: 'student_id,meal_date' }
    )

  if (error) redirect(`/student?error=${encodeURIComponent(error.message)}`)

  revalidatePath('/student')
  redirect('/student?success=true')
}
