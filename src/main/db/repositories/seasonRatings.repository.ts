import { eq, getTableColumns } from 'drizzle-orm'
import type { DbContext } from '../context'
import { firstOf } from '../queryHelpers'
import { seasonRatings } from '../schema'
import type { NewSeasonRating, SeasonRating } from '../types'
import { assertValidRating } from '../validation'

type RatingChanges = Partial<Omit<NewSeasonRating, 'id' | 'seasonId'>>

const columns = getTableColumns(seasonRatings)

export function createSeasonRatingsRepository({ db, persist }: DbContext) {
  async function upsert(seasonId: number, changes: RatingChanges): Promise<SeasonRating> {
    const now = new Date().toISOString()
    const [row] = await db
      .insert(seasonRatings)
      .values({ seasonId, updatedAt: now, ...changes })
      .onConflictDoUpdate({
        target: seasonRatings.seasonId,
        set: { ...changes, updatedAt: now }
      })
      .returning()
    persist()
    return row
  }

  return {
    async getBySeasonId(seasonId: number): Promise<SeasonRating | undefined> {
      return firstOf(
        db.select(columns).from(seasonRatings).where(eq(seasonRatings.seasonId, seasonId)).limit(1)
      )
    },

    async rate(seasonId: number, rating: number | null): Promise<SeasonRating> {
      assertValidRating(rating)
      return upsert(seasonId, { rating })
    },

    async setNotes(seasonId: number, notes: string | null): Promise<SeasonRating> {
      return upsert(seasonId, { notes })
    }
  }
}

export type SeasonRatingsRepository = ReturnType<typeof createSeasonRatingsRepository>
