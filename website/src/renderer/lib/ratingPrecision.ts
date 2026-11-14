import { useEffect, useState } from 'react'
import { createPersistedPreference } from './persistedPreference'

export type RatingPrecision = 'whole' | 'half'

const isRatingPrecision = (value: string): value is RatingPrecision => value === 'whole' || value === 'half'

const store = createPersistedPreference<RatingPrecision>('watch-tracker-rating-precision', 'whole', isRatingPrecision)

export function setRatingPrecision(precision: RatingPrecision): void {
  store.set(precision)
}

/**
 * Whether rating controls accept half-point ratings (8.5) or whole numbers
 * only (8, 9). This is a display/input preference only — the underlying
 * 0-10 storage and validation (see shared/ratings.ts) already allows
 * half-steps regardless; this just controls whether the star UI exposes
 * that precision to the user. Defaults to whole numbers, matching this
 * app's behavior before this preference existed.
 */
export function useRatingPrecision(): RatingPrecision {
  const [precision, setPrecision] = useState(store.get())
  useEffect(() => store.subscribe(setPrecision), [])
  return precision
}
