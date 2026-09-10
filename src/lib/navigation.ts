import type { LucideIcon } from 'lucide-react'
import { LayoutDashboard, Users, BarChart3, Receipt, Settings, UtensilsCrossed, History, UserCircle } from 'lucide-react'

export interface NavItem {
  href: string
  label: string
  icon: LucideIcon
}

export const ADMIN_NAV: NavItem[] = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/students', label: 'Students', icon: Users },
  { href: '/admin/analytics', label: 'Analytics', icon: BarChart3 },
  { href: '/admin/billing', label: 'Billing', icon: Receipt },
  { href: '/admin/settings', label: 'Settings', icon: Settings },
]

export const STUDENT_NAV: NavItem[] = [
  { href: '/student', label: 'Meals', icon: UtensilsCrossed },
  { href: '/student/history', label: 'History', icon: History },
  { href: '/student/profile', label: 'Profile', icon: UserCircle },
]
