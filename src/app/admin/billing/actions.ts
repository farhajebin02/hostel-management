'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { calculateBill } from '@/lib/billing'

export async function generateAndCloseMonth(formData: FormData) {
  const start = String(formData.get('month')) // 'YYYY-MM-01'
  const [y, m] = start.split('-').map(Number)
  const nextMonth = new Date(Date.UTC(y, m, 1)) // m is 1-indexed; Date.UTC's 0-indexed param rolls to next month
  const end = `${nextMonth.getUTCFullYear()}-${String(nextMonth.getUTCMonth() + 1).padStart(2, '0')}-01`

  const supabase = await createClient()

  const { data: students } = await supabase
    .from('profiles')
    .select('id')
    .eq('role', 'student')
    .eq('status', 'approved')

  const { data: ticks } = await supabase
    .from('meal_ticks')
    .select('student_id, breakfast, dinner')
    .gte('meal_date', start)
    .lt('meal_date', end)

  const bills = (students ?? []).map((s) => {
    const studentTicks = (ticks ?? []).filter((t) => t.student_id === s.id)
    const breakfast_count = studentTicks.filter((t) => t.breakfast).length
    const dinner_count = studentTicks.filter((t) => t.dinner).length
    const total_ticks = breakfast_count + dinner_count
    return {
      student_id: s.id,
      month: start,
      breakfast_count,
      dinner_count,
      total_ticks,
      bill_amount: calculateBill(total_ticks),
    }
  })

  if (bills.length > 0) {
    const { error } = await supabase
      .from('monthly_bills')
      .upsert(bills, { onConflict: 'student_id,month', ignoreDuplicates: true })
    if (error) throw new Error(error.message)
  }

  revalidatePath('/admin/billing')
}
