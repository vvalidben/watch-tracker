import { and, asc, eq, getTableColumns, inArray } from 'drizzle-orm'
import type { DbContext } from '../context'
import { firstOf } from '../queryHelpers'
import { episodeProgress, episodes } from '../schema'
import type { Episode, EpisodeWithProgress, NewEpisode } from '../types'

export type CreateEpisodeInput = NewEpisode
export type UpdateEpisodeInput = Partial<Omit<NewEpisode, 'id' | 'seasonId'>>

const episodeColumns = getTableColumns(episodes)
const progressColumns = getTableColumns(episodeProgress)

export function createEpisodesRepository({ db, persist }: DbContext) {
  return {
    async create(input: CreateEpisodeInput): Promise<Episode> {
      const [row] = await db.insert(episodes).values(input).returning()
      persist()
      return row
    },

    async getById(id: number): Promise<Episode | undefined> {
      return firstOf(db.select(episodeColumns).from(episodes).where(eq(episodes.id, id)).limit(1))
    },

    async listBySeason(seasonId: number): Promise<Episode[]> {
      return db
        .select(episodeColumns)
        .from(episodes)
        .where(eq(episodes.seasonId, seasonId))
        .orderBy(asc(episodes.episodeNumber))
    },

    async getBySeasonAndNumber(seasonId: number, episodeNumber: number): Promise<Episode | undefined> {
      return firstOf(
        db
          .select(episodeColumns)
          .from(episodes)
          .where(and(eq(episodes.seasonId, seasonId), eq(episodes.episodeNumber, episodeNumber)))
          .limit(1)
      )
    },

    /** Episodes for a season, each with the user's watched/rating progress attached. */
    async listBySeasonWithProgress(seasonId: number): Promise<EpisodeWithProgress[]> {
      const episodeRows = await db
        .select(episodeColumns)
        .from(episodes)
        .where(eq(episodes.seasonId, seasonId))
        .orderBy(asc(episodes.episodeNumber))
      if (episodeRows.length === 0) return []

      const episodeIds = episodeRows.map((episode) => episode.id)
      const progressRows = await db
        .select(progressColumns)
        .from(episodeProgress)
        .where(inArray(episodeProgress.episodeId, episodeIds))

      const progressByEpisodeId = new Map(progressRows.map((progress) => [progress.episodeId, progress]))

      return episodeRows.map((episode) => ({
        ...episode,
        progress: progressByEpisodeId.get(episode.id) ?? null
      }))
    },

    /**
     * Finds (or lazily creates) every episode row for the given numbers in
     * one round trip — the bulk counterpart of getOrCreateEpisode, used by
     * "mark season/series watched" so a 24-episode season doesn't cost 24
     * separate persist() calls.
     */
    async ensureMany(seasonId: number, episodeNumbers: number[]): Promise<Episode[]> {
      if (episodeNumbers.length === 0) return []

      const existing = await db
        .select(episodeColumns)
        .from(episodes)
        .where(and(eq(episodes.seasonId, seasonId), inArray(episodes.episodeNumber, episodeNumbers)))

      const existingNumbers = new Set(existing.map((episode) => episode.episodeNumber))
      const missingNumbers = episodeNumbers.filter((number) => !existingNumbers.has(number))
      if (missingNumbers.length === 0) return existing

      const inserted = await db
        .insert(episodes)
        .values(missingNumbers.map((episodeNumber) => ({ seasonId, episodeNumber })))
        .returning()
      persist()

      return [...existing, ...inserted]
    },

    async update(id: number, changes: UpdateEpisodeInput): Promise<Episode | undefined> {
      const [row] = await db.update(episodes).set(changes).where(eq(episodes.id, id)).returning()
      persist()
      return row
    },

    /** Cascades to the episode's progress row. */
    async delete(id: number): Promise<void> {
      await db.delete(episodes).where(eq(episodes.id, id))
      persist()
    }
  }
}

export type EpisodesRepository = ReturnType<typeof createEpisodesRepository>
