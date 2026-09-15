import type { DbContext } from '../context'
import { createEpisodeProgressRepository } from './episodeProgress.repository'
import { createEpisodesRepository } from './episodes.repository'
import { createLibraryEntriesRepository } from './libraryEntries.repository'
import { createMediaItemsRepository } from './mediaItems.repository'
import { createSeasonRatingsRepository } from './seasonRatings.repository'
import { createSeasonsRepository } from './seasons.repository'
import { createTagsRepository } from './tags.repository'
import { createWatchEventsRepository } from './watchEvents.repository'

export function createRepositories(context: DbContext) {
  return {
    mediaItems: createMediaItemsRepository(context),
    seasons: createSeasonsRepository(context),
    episodes: createEpisodesRepository(context),
    libraryEntries: createLibraryEntriesRepository(context),
    episodeProgress: createEpisodeProgressRepository(context),
    watchEvents: createWatchEventsRepository(context),
    seasonRatings: createSeasonRatingsRepository(context),
    tags: createTagsRepository(context)
  }
}

export type Repositories = ReturnType<typeof createRepositories>

export * from './episodeProgress.repository'
export * from './episodes.repository'
export * from './libraryEntries.repository'
export * from './mediaItems.repository'
export * from './seasonRatings.repository'
export * from './seasons.repository'
export * from './tags.repository'
export * from './watchEvents.repository'
