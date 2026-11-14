import { japaneseTitle } from '@shared/japaneseTitle'
import { readAppConfig, writeAppConfig } from '../config/appConfig'
import type { Repositories } from '../db/repositories'
import type { UpdateMediaItemInput } from '../db/repositories/mediaItems.repository'
import type { AnimeTitleNames } from '../metadata/anilistProvider'

export type FetchAnimeTitles = (sourceIds: string[]) => Promise<Map<string, AnimeTitleNames>>

// AniList returns at most 50 results per page. Its rate limit can drop as low
// as 30 requests a minute, so the batches are spaced to stay under that.
const BATCH_SIZE = 50
const DEFAULT_BATCH_DELAY_MS = 2000

/**
 * Anime added before AniList's native titles were requested have the romaji
 * title saved as their original title and no separate romaji title, and adding
 * a title never overwrites an existing row, so they would otherwise never get
 * a Japanese label on list screens. A name AniList doesn't have leaves the
 * saved value as it was.
 */
export async function backfillAnimeTitles(
  repositories: Repositories,
  fetchTitles: FetchAnimeTitles,
  { batchDelayMs = DEFAULT_BATCH_DELAY_MS }: { batchDelayMs?: number } = {}
): Promise<{ checked: number; updated: number }> {
  const anime = await repositories.mediaItems.list({ type: 'anime' })
  const pending = anime.filter(
    (item) => item.source === 'anilist' && item.sourceId && (!japaneseTitle(item.originalTitle) || !item.romajiTitle)
  )

  let updated = 0
  for (let start = 0; start < pending.length; start += BATCH_SIZE) {
    if (start > 0) await new Promise((resolve) => setTimeout(resolve, batchDelayMs))

    const batch = pending.slice(start, start + BATCH_SIZE)
    const names = await fetchTitles(batch.map((item) => item.sourceId as string))

    for (const item of batch) {
      const found = names.get(item.sourceId as string)
      const changes: UpdateMediaItemInput = {}
      const japanese = japaneseTitle(found?.native)
      if (japanese && japanese !== item.originalTitle) changes.originalTitle = japanese
      if (found?.romaji && found.romaji !== item.romajiTitle) changes.romajiTitle = found.romaji

      if (Object.keys(changes).length > 0) {
        await repositories.mediaItems.update(item.id, changes)
        updated++
      }
    }
  }
  return { checked: pending.length, updated }
}

export interface AnimeTitleBackfillContext {
  repositories: Repositories
  configPath: string
  fetchTitles: FetchAnimeTitles
  batchDelayMs?: number
}

/** Never rejects: a failure just means trying again on the next launch, with finished batches already saved. */
export async function runAnimeTitleBackfillOnce({ repositories, configPath, fetchTitles, batchDelayMs }: AnimeTitleBackfillContext): Promise<void> {
  if (readAppConfig(configPath).animeTitleBackfillDone) return

  try {
    const { checked, updated } = await backfillAnimeTitles(repositories, fetchTitles, { batchDelayMs })
    // Read again rather than reuse the config from above: settings can be saved while the lookup runs.
    writeAppConfig(configPath, { ...readAppConfig(configPath), animeTitleBackfillDone: true })
    console.log(`[backfill] checked ${checked} anime, updated ${updated}`)
  } catch (error) {
    console.warn('[backfill] anime title lookup failed, will retry next launch', error)
  }
}
