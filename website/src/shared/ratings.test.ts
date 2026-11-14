import { describe, expect, it } from 'vitest'
import { averageRating, isValidRating } from './ratings'

describe('isValidRating', () => {
  it('accepts null and undefined as valid (unrated)', () => {
    expect(isValidRating(null)).toBe(true)
    expect(isValidRating(undefined)).toBe(true)
  })

  it('accepts every 0.5 step from 0 to 10', () => {
    for (let value = 0; value <= 10; value += 0.5) {
      expect(isValidRating(value)).toBe(true)
    }
  })

  it('rejects values below 0', () => {
    expect(isValidRating(-0.5)).toBe(false)
    expect(isValidRating(-1)).toBe(false)
  })

  it('rejects values above 10', () => {
    expect(isValidRating(10.5)).toBe(false)
    expect(isValidRating(11)).toBe(false)
  })

  it('rejects values not on a 0.5 step', () => {
    expect(isValidRating(7.3)).toBe(false)
    expect(isValidRating(0.1)).toBe(false)
    expect(isValidRating(9.99)).toBe(false)
  })

  it('rejects NaN', () => {
    expect(isValidRating(Number.NaN)).toBe(false)
  })

  it('tolerates tiny floating-point drift from arithmetic that lands on a valid step', () => {
    // Both of these should mathematically equal 0.5, but IEEE 754 float
    // subtraction leaves them a hair off (0.5000000000000001 / 0.4999999999999998).
    expect(isValidRating(1.1 - 0.6)).toBe(true)
    expect(isValidRating(2.3 - 1.8)).toBe(true)
  })

  it('accepts the boundary values 0 and 10', () => {
    expect(isValidRating(0)).toBe(true)
    expect(isValidRating(10)).toBe(true)
  })
})

describe('averageRating', () => {
  it('returns null for an empty list', () => {
    expect(averageRating([])).toBeNull()
  })

  it('returns null when nothing in the list is rated', () => {
    expect(averageRating([null, null, undefined])).toBeNull()
  })

  it('ignores unrated entries when averaging the rest', () => {
    expect(averageRating([8, null, 10, undefined])).toBe(9)
  })

  it('computes a simple average', () => {
    expect(averageRating([9, 8, 10])).toBe(9)
  })

  it('rounds to one decimal place', () => {
    expect(averageRating([9, 8, 10, 9])).toBe(9)
    expect(averageRating([1, 2, 2])).toBe(1.7) // 5/3 = 1.6667 -> 1.7
  })

  it('is not constrained to the 0.5-step scale (it is a computed statistic, not a settable value)', () => {
    expect(averageRating([9, 8.5, 8])).toBe(8.5)
    expect(averageRating([9, 8, 7])).toBe(8)
    expect(averageRating([9.5, 9, 8])).toBe(8.8) // 26.5/3 = 8.8333 -> 8.8
  })

  it('handles a single rated value', () => {
    expect(averageRating([7.5])).toBe(7.5)
  })
})
