import { isValidRating } from '@shared/ratings'

export class InvalidRatingError extends Error {
  constructor(rating: number) {
    super(`Rating must be between 0 and 10 in steps of 0.5, got ${rating}`)
    this.name = 'InvalidRatingError'
  }
}

/** Ratings are 0-10 in 0.5 steps, applied uniformly to movies, series, seasons, and episodes. */
export function assertValidRating(rating: number | null | undefined): void {
  if (rating === null || rating === undefined) return
  if (!isValidRating(rating)) {
    throw new InvalidRatingError(rating)
  }
}
