import { and, asc, eq, getTableColumns, inArray } from 'drizzle-orm'
import type { DbContext } from '../context'
import { firstOf } from '../queryHelpers'
import { episodes, seasonRatings, seasons } from '../schema'
import type { NewSeason, Season, SeasonWithEpisodes } from '../types'

export type CreateSeasonInput = NewSeason
export type UpdateSeasonInput = Partial<Omit<NewSeason, 'id' | 'mediaItemId'>>

const seasonColumns = getTableColumns(seasons)
const episodeColumns = getTableColumns(episodes)
const seasonRatingColumns = getTableColumns(seasonRatings)

export function createSeasonsRepository({ db, persist }: DbContext) {
  return {
    async create(input: CreateSeasonInput): Promise<Season> {
      const [row] = await db.insert(seasons).values(input).returning()
      persist()
      return row
    },

    async getById(id: number): Promise<Season | undefined> {
      return firstOf(db.select(seasonColumns).from(seasons).where(eq(seasons.id, id)).limit(1))
    },

    async listByMediaItem(mediaItemId: number): Promise<Season[]> {
      return db
        .select(seasonColumns)
        .from(seasons)
        .where(eq(seasons.mediaItemId, mediaItemId))
        .orderBy(asc(seasons.seasonNumber))
    },

    async getByMediaItemAndNumber(mediaItemId: number, seasonNumber: number): Promise<Season | undefined> {
      return firstOf(
        db
          .select(seasonColumns)
          .from(seasons)
          .where(and(eq(seasons.mediaItemId, mediaItemId), eq(seasons.seasonNumber, seasonNumber)))
          .limit(1)
      )
    },

    /** Seasons for a title, each with its episodes and season rating attached. */
    async listByMediaItemWithEpisodes(mediaItemId: number): Promise<SeasonWithEpisodes[]> {
      const seasonRows = await db
        .select(seasonColumns)
        .from(seasons)
        .where(eq(seasons.mediaItemId, mediaItemId))
        .orderBy(asc(seasons.seasonNumber))
      if (seasonRows.length === 0) return []

      const seasonIds = seasonRows.map((season) => season.id)
      const [episodeRows, ratingRows] = await Promise.all([
        db
          .select(episodeColumns)
          .from(episodes)
          .where(inArray(episodes.seasonId, seasonIds))
          .orderBy(asc(episodes.episodeNumber)),
        db
          .select(seasonRatingColumns)
          .from(seasonRatings)
          .where(inArray(seasonRatings.seasonId, seasonIds))
      ])

      const episodesBySeasonId = new Map<number, typeof episodeRows>()
      for (const episode of episodeRows) {
        const bucket = episodesBySeasonId.get(episode.seasonId) ?? []
        bucket.push(episode)
        episodesBySeasonId.set(episode.seasonId, bucket)
      }
      const ratingBySeasonId = new Map(ratingRows.map((rating) => [rating.seasonId, rating]))

      return seasonRows.map((season) => ({
        ...season,
        episodes: episodesBySeasonId.get(season.id) ?? [],
        seasonRating: ratingBySeasonId.get(season.id) ?? null
      }))
    },

    async update(id: number, changes: UpdateSeasonInput): Promise<Season | undefined> {
      const [row] = await db.update(seasons).set(changes).where(eq(seasons.id, id)).returning()
      persist()
      return row
    },

    /** Cascades to the season's episodes and season rating. */
    async delete(id: number): Promise<void> {
      await db.delete(seasons).where(eq(seasons.id, id))
      persist()
    }
  }
}

export type SeasonsRepository = ReturnType<typeof createSeasonsRepository>
