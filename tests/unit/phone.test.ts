import { describe, it, expect } from 'vitest'
import { normalizePhone, isValidPhone, phoneToEmail } from '@/lib/phone'

describe('normalizePhone', () => {
  it('leaves a plain 10-digit number unchanged', () => {
    expect(normalizePhone('9876543210')).toBe('9876543210')
  })

  it('strips a +91 country code', () => {
    expect(normalizePhone('+91 98765 43210')).toBe('9876543210')
  })

  it('strips a leading trunk 0', () => {
    expect(normalizePhone('09876543210')).toBe('9876543210')
  })

  it('does not strip a leading 91 from a genuine 10-digit number', () => {
    expect(normalizePhone('9123456789')).toBe('9123456789')
  })
})

describe('isValidPhone', () => {
  it('accepts a valid 10-digit mobile number starting with 6-9', () => {
    expect(isValidPhone('9876543210')).toBe(true)
  })

  it('rejects a number starting with 0-5', () => {
    expect(isValidPhone('1234567890')).toBe(false)
  })

  it('rejects too few or too many digits', () => {
    expect(isValidPhone('98765')).toBe(false)
    expect(isValidPhone('987654321099')).toBe(false)
  })
})

describe('phoneToEmail', () => {
  it('builds a synthetic email from a normalized phone number', () => {
    expect(phoneToEmail('+91 98765 43210')).toBe('9876543210@phone.hostel-manager.local')
  })
})
