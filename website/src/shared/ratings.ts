/**
 * This app's personal rating scale: 0-10 in 0.5 steps. Established when the
 * database layer was first built and used consistently ever since (movie,
 * series, season, and episode ratings all share it) — the "1-10 unless the
 * project already specifies otherwise" default doesn't apply here because
 * the project already specifies otherwise.
 */
export const RATING_MIN = 0
export const RATING_MAX = 10
export const RATING_STEP = 0.5

/** True for any rating in range and on-step; null/undefined (unrated) is always valid. */
export function isValidRating(rating: number | null | undefined): boolean {
  if (rating === null || rating === undefined) return true
  if (Number.isNaN(rating)) return false
  if (rating < RATING_MIN || rating > RATING_MAX) return false
  // Compare on the doubled integer scale to sidestep floating-point drift (e.g. 0.1 + 0.2).
  const doubled = rating / RATING_STEP
  return Math.abs(doubled - Math.round(doubled)) < 1e-9
}

/**
 * Mean of the rated (non-null/undefined) values only, rounded to one
 * decimal place for display. This is a read-only computed rollup — it is
 * never itself constrained to the 0.5-step scale, since it's a summary
 * statistic rather than a value someone picks on a control. Returns null
 * when nothing in the list has been rated yet.
 */
export function averageRating(ratings: ReadonlyArray<number | null | undefined>): number | null {
  const rated = ratings.filter((rating): rating is number => typeof rating === 'number' && !Number.isNaN(rating))
  if (rated.length === 0) return null
  const sum = rated.reduce((total, rating) => total + rating, 0)
  return Math.round((sum / rated.length) * 10) / 10
}
