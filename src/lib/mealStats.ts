import type { createClient } from '@/lib/supabase/server'
import { getTomorrowISTDateString } from '@/lib/time'

export interface TomorrowMealStats {
  tomorrow: string
  totalStudents: number
  breakfastCount: number
  dinnerCount: number
  submittedCount: number
  notSubmittedCount: number
}

export async function getTomorrowMealStats(
  supabase: Awaited<ReturnType<typeof createClient>>
): Promise<TomorrowMealStats> {
  const tomorrow = getTomorrowISTDateString()

  const { data: students } = await supabase
    .from('profiles')
    .select('id')
    .eq('role', 'student')
    .eq('status', 'approved')

  const { data: ticks } = await supabase
    .from('meal_ticks')
    .select('student_id, breakfast, dinner, profiles!inner(status)')
    .eq('meal_date', tomorrow)
    .eq('profiles.status', 'approved')

  const totalStudents = students?.length ?? 0
  const breakfastCount = ticks?.filter((t) => t.breakfast).length ?? 0
  const dinnerCount = ticks?.filter((t) => t.dinner).length ?? 0
  const submittedCount = ticks?.length ?? 0
  const notSubmittedCount = Math.max(totalStudents - submittedCount, 0)

  return { tomorrow, totalStudents, breakfastCount, dinnerCount, submittedCount, notSubmittedCount }
}
