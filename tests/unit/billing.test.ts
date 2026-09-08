import { describe, it, expect } from 'vitest'
import { calculateBill } from '@/lib/billing'

describe('calculateBill', () => {
  it('returns the flat rate when ticks are well below the threshold', () => {
    expect(calculateBill(0)).toBe(1800)
    expect(calculateBill(15)).toBe(1800)
  })

  it('returns the flat rate at exactly 30 ticks', () => {
    expect(calculateBill(30)).toBe(1800)
  })

  it('adds the per-tick rate starting at 31 ticks', () => {
    expect(calculateBill(31)).toBe(1855)
  })

  it('scales linearly above the threshold', () => {
    expect(calculateBill(40)).toBe(1800 + 55 * 10)
  })
})
