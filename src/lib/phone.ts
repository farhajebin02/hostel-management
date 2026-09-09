const PHONE_DOMAIN = 'phone.hostel-manager.local'

export function normalizePhone(input: string): string {
  let digits = input.replace(/\D/g, '')
  if (digits.length === 12 && digits.startsWith('91')) {
    digits = digits.slice(2)
  } else if (digits.length === 11 && digits.startsWith('0')) {
    digits = digits.slice(1)
  }
  return digits
}

export function isValidPhone(input: string): boolean {
  return /^[6-9]\d{9}$/.test(normalizePhone(input))
}

export function phoneToEmail(phone: string): string {
  return `${normalizePhone(phone)}@${PHONE_DOMAIN}`
}
