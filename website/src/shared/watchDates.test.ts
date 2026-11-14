import { describe, expect, it } from 'vitest'
import { validateWatchDate } from './watchDates'
describe('watch date input', () => {
  it('normalizes a timezone-aware historical date', () => {
    expect(validateWatchDate('2025-01-01T20:00:00+01:00')).toBe('2025-01-01T19:00:00.000Z')
  })
  it.each(['', 'yesterday', '2025-02-30', '2025-01-01T12:00', '2999-01-01'])('rejects invalid, ambiguous or future input: %s', (value) => {
    expect(() => validateWatchDate(value)).toThrow()
  })
})
