import Link from 'next/link'
import type { ButtonHTMLAttributes, ReactNode } from 'react'

export const inputClass =
  'w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100'

export const labelClass = 'flex flex-col gap-1.5 text-sm font-medium text-slate-700'

const buttonBase =
  'inline-flex items-center justify-center rounded-lg px-4 py-2.5 text-sm font-semibold transition-all duration-150 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100'

const buttonVariants = {
  primary: 'bg-indigo-600 text-white hover:bg-indigo-700',
  secondary: 'bg-slate-100 text-slate-900 hover:bg-slate-200',
  danger: 'bg-red-600 text-white hover:bg-red-700',
} as const

type ButtonVariant = keyof typeof buttonVariants

export function Button({
  variant = 'primary',
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant }) {
  return <button className={`${buttonBase} ${buttonVariants[variant]} ${className}`} {...props} />
}

export function LinkButton({
  href,
  variant = 'primary',
  className = '',
  children,
}: {
  href: string
  variant?: ButtonVariant
  className?: string
  children: ReactNode
}) {
  return (
    <Link href={href} className={`${buttonBase} ${buttonVariants[variant]} ${className}`}>
      {children}
    </Link>
  )
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6 ${className}`}>
      {children}
    </div>
  )
}

const bannerStyles = {
  error: 'border-red-200 bg-red-50 text-red-700',
  success: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  warning: 'border-amber-200 bg-amber-50 text-amber-800',
} as const

export function Banner({ tone, children }: { tone: keyof typeof bannerStyles; children: ReactNode }) {
  return <div className={`rounded-lg border p-3 text-sm ${bannerStyles[tone]}`}>{children}</div>
}
