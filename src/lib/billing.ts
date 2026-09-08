const FLAT_RATE = 1800
const FLAT_RATE_THRESHOLD = 30
const PER_EXTRA_TICK_RATE = 55

export function calculateBill(totalTicks: number): number {
  if (totalTicks <= FLAT_RATE_THRESHOLD) {
    return FLAT_RATE
  }
  return FLAT_RATE + PER_EXTRA_TICK_RATE * (totalTicks - FLAT_RATE_THRESHOLD)
}
