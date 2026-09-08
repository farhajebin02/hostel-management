export type Role = 'admin' | 'student'
export type StudentStatus = 'pending' | 'approved'
export type FeeStatus = 'paid' | 'pending'

export interface Profile {
  id: string
  role: Role
  status: StudentStatus
  full_name: string | null
  room_number: string | null
  permanent_address: string | null
  contact_personal: string | null
  contact_emergency: string | null
  fee_status: FeeStatus
  photo_path: string | null
  created_at: string
}

export interface MealTick {
  id: number
  student_id: string
  meal_date: string
  breakfast: boolean
  dinner: boolean
  submitted_at: string
}

export interface MonthlyBill {
  id: number
  student_id: string
  month: string
  breakfast_count: number
  dinner_count: number
  total_ticks: number
  bill_amount: number
  generated_at: string
}

export interface AppSettings {
  id: number
  cutoff_time: string
  updated_at: string
}
