/**
 * Unwraps a `findMany({ limit: 1 })` result to a single row or undefined.
 *
 * Deliberately NOT using drizzle's own `findFirst()` here: this project's
 * sql.js driver version returns a garbage all-undefined-fields object
 * instead of `undefined` when `findFirst` finds no match (traced to the
 * `.get()` codepath in drizzle-orm/sql-js/session.js not checking for an
 * empty result before returning). `findMany` does not have this bug.
 */
export async function firstOf<T>(rows: T[] | Promise<T[]>): Promise<T | undefined> {
  const resolved = await rows
  return resolved[0]
}
