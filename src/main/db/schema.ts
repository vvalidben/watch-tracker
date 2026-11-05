import { relations } from 'drizzle-orm'
import { sqliteTable, text, integer, real, uniqueIndex, index, primaryKey } from 'drizzle-orm/sqlite-core'

// ============================================================================
// EXTERNAL METADATA — data that comes from (or mirrors) an external source
// (TMDB, AniList, or a manually-typed entry). None of these tables know
// anything about whether *this user* has watched, rated, or tagged anything.
// ============================================================================

export const mediaItems = sqliteTable(
  'media_items',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    type: text('type', { enum: ['movie', 'tv', 'anime'] }).notNull(),
    title: text('title').notNull(),
    originalTitle: text('original_title'),
    // AniList's latin-script name, kept so anime stays searchable by it now
    // that originalTitle holds the Japanese title. Null for other sources.
    romajiTitle: text('romaji_title'),
    overview: text('overview'),
    posterPath: text('poster_path'),
    backdropPath: text('backdrop_path'),
    releaseDate: text('release_date'),
    airingStatus: text('airing_status', { enum: ['airing', 'finished', 'upcoming', 'cancelled'] }),
    runtimeMinutes: integer('runtime_minutes'),
    // Cached scalar counts from the provider at add-time, so the Library page
    // can show progress ("8/12 episodes") without ever calling the metadata
    // API — unlike season/episode rows, this is a single cheap field, not a
    // full breakdown, so caching it here isn't "unnecessary duplication."
    numberOfSeasons: integer('number_of_seasons'),
    numberOfEpisodes: integer('number_of_episodes'),
    genres: text('genres', { mode: 'json' }).$type<string[]>(),
    // 'manual' entries (no external match) have a null sourceId.
    source: text('source', { enum: ['tmdb', 'anilist', 'manual'] }).notNull(),
    sourceId: text('source_id'),
    // Secondary cross-reference ids (imdbId, malId, ...) kept for future matching.
    externalIds: text('external_ids', { mode: 'json' }).$type<Record<string, string>>(),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull()
  },
  (table) => ({
    // NULLs are distinct from each other in a SQLite unique index, so this
    // still allows any number of 'manual' rows (sourceId null) while
    // preventing the same external title from being added twice.
    sourceUnique: uniqueIndex('media_items_source_unique').on(table.source, table.sourceId),
    typeIdx: index('media_items_type_idx').on(table.type)
  })
)

export const seasons = sqliteTable(
  'seasons',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    mediaItemId: integer('media_item_id')
      .notNull()
      .references(() => mediaItems.id, { onDelete: 'cascade' }),
    seasonNumber: integer('season_number').notNull(),
    title: text('title'),
    overview: text('overview'),
    posterPath: text('poster_path'),
    airDate: text('air_date')
  },
  (table) => ({
    mediaSeasonUnique: uniqueIndex('seasons_media_season_unique').on(
      table.mediaItemId,
      table.seasonNumber
    )
  })
)

export const episodes = sqliteTable(
  'episodes',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    seasonId: integer('season_id')
      .notNull()
      .references(() => seasons.id, { onDelete: 'cascade' }),
    episodeNumber: integer('episode_number').notNull(),
    title: text('title'),
    overview: text('overview'),
    airDate: text('air_date'),
    runtimeMinutes: integer('runtime_minutes')
  },
  (table) => ({
    seasonEpisodeUnique: uniqueIndex('episodes_season_episode_unique').on(
      table.seasonId,
      table.episodeNumber
    )
  })
)

// ============================================================================
// PERSONAL DATA — everything that only exists because of what *this user*
// did: watch status, ratings, notes, favorites, watch dates, rewatch counts,
// tags. None of these columns are ever populated by a metadata provider.
// ============================================================================

export const libraryEntries = sqliteTable(
  'library_entries',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    mediaItemId: integer('media_item_id')
      .notNull()
      .references(() => mediaItems.id, { onDelete: 'cascade' }),
    watchStatus: text('watch_status', {
      enum: ['plan_to_watch', 'watching', 'completed', 'on_hold', 'dropped']
    })
      .notNull()
      .default('plan_to_watch'),
    // Overall rating: the movie's rating, or the series/anime's overall rating.
    rating: real('rating'),
    favorite: integer('favorite', { mode: 'boolean' }).notNull().default(false),
    notes: text('notes'),
    rewatchCount: integer('rewatch_count').notNull().default(0),
    addedAt: text('added_at').notNull(),
    startedAt: text('started_at'),
    completedAt: text('completed_at'),
    updatedAt: text('updated_at').notNull()
  },
  (table) => ({
    // One library entry per media item.
    mediaItemUnique: uniqueIndex('library_entries_media_item_unique').on(table.mediaItemId),
    statusIdx: index('library_entries_status_idx').on(table.watchStatus),
    favoriteIdx: index('library_entries_favorite_idx').on(table.favorite)
  })
)

export const episodeProgress = sqliteTable(
  'episode_progress',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    episodeId: integer('episode_id')
      .notNull()
      .references(() => episodes.id, { onDelete: 'cascade' }),
    watched: integer('watched', { mode: 'boolean' }).notNull().default(false),
    watchedAt: text('watched_at'),
    rating: real('rating'),
    notes: text('notes'),
    updatedAt: text('updated_at').notNull()
  },
  (table) => ({
    episodeUnique: uniqueIndex('episode_progress_episode_unique').on(table.episodeId)
  })
)

/**
 * Append-only watch history ledger. One row per "mark watched" action —
 * never updated, never deleted (except cascading when the media item/episode
 * itself is deleted). This is what makes rewatching representable at all:
 * `episode_progress`/`library_entries` only ever hold current state (watched
 * flag + most recent watch date), which can't hold "watched on 2026-01-10
 * AND 2026-06-12." Marking something unwatched never touches this table, so
 * history survives regardless of what the current watched flag says.
 *
 * `episodeId` is null for a movie-level watch event and set for a TV/anime
 * episode-level one — one table covers both rather than two near-identical
 * ones, since a "watch" is the same kind of fact either way.
 */
export const watchEvents = sqliteTable(
  'watch_events',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    mediaItemId: integer('media_item_id')
      .notNull()
      .references(() => mediaItems.id, { onDelete: 'cascade' }),
    episodeId: integer('episode_id').references(() => episodes.id, { onDelete: 'cascade' }),
    watchedAt: text('watched_at').notNull()
  },
  (table) => ({
    mediaItemIdx: index('watch_events_media_item_idx').on(table.mediaItemId),
    episodeIdx: index('watch_events_episode_idx').on(table.episodeId)
  })
)

export const seasonRatings = sqliteTable(
  'season_ratings',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    seasonId: integer('season_id')
      .notNull()
      .references(() => seasons.id, { onDelete: 'cascade' }),
    rating: real('rating'),
    notes: text('notes'),
    updatedAt: text('updated_at').notNull()
  },
  (table) => ({
    seasonUnique: uniqueIndex('season_ratings_season_unique').on(table.seasonId)
  })
)

export const tags = sqliteTable(
  'tags',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    name: text('name').notNull(),
    color: text('color'),
    createdAt: text('created_at').notNull()
  },
  (table) => ({
    nameUnique: uniqueIndex('tags_name_unique').on(table.name)
  })
)

export const mediaTags = sqliteTable(
  'media_tags',
  {
    mediaItemId: integer('media_item_id')
      .notNull()
      .references(() => mediaItems.id, { onDelete: 'cascade' }),
    tagId: integer('tag_id')
      .notNull()
      .references(() => tags.id, { onDelete: 'cascade' })
  },
  (table) => ({
    pk: primaryKey({ columns: [table.mediaItemId, table.tagId] }),
    // The composite PK above only serves lookups led by mediaItemId (e.g.
    // listForMediaItem). The Library page's tag filter looks up by tagId
    // alone (listMediaItemIdsForTag) — without this, that query is a full
    // table scan instead of an index lookup.
    tagIdx: index('media_tags_tag_idx').on(table.tagId)
  })
)

// ============================================================================
// Relations metadata.
//
// NOTE: repositories deliberately do NOT use drizzle's `db.query.*`
// relational API (`findFirst`/`with`) against this project's driver
// (drizzle-orm/sql-js). That API has a bug in this version: singular lookups
// with no match return a garbage all-undefined-fields object instead of
// `undefined`, and nested `with` fetches don't map columns correctly either.
// Repositories use `db.select(getTableColumns(table))...limit(1)` plus
// manual joins instead (see queryHelpers.ts). These `relations()` are kept
// as schema documentation and in case a future drizzle/driver version (or a
// switch to better-sqlite3) fixes the relational API.
// ============================================================================

export const mediaItemsRelations = relations(mediaItems, ({ one, many }) => ({
  seasons: many(seasons),
  libraryEntry: one(libraryEntries, {
    fields: [mediaItems.id],
    references: [libraryEntries.mediaItemId]
  }),
  mediaTags: many(mediaTags)
}))

export const seasonsRelations = relations(seasons, ({ one, many }) => ({
  mediaItem: one(mediaItems, { fields: [seasons.mediaItemId], references: [mediaItems.id] }),
  episodes: many(episodes),
  seasonRating: one(seasonRatings, {
    fields: [seasons.id],
    references: [seasonRatings.seasonId]
  })
}))

export const episodesRelations = relations(episodes, ({ one }) => ({
  season: one(seasons, { fields: [episodes.seasonId], references: [seasons.id] }),
  progress: one(episodeProgress, {
    fields: [episodes.id],
    references: [episodeProgress.episodeId]
  })
}))

export const libraryEntriesRelations = relations(libraryEntries, ({ one }) => ({
  mediaItem: one(mediaItems, {
    fields: [libraryEntries.mediaItemId],
    references: [mediaItems.id]
  })
}))

export const episodeProgressRelations = relations(episodeProgress, ({ one }) => ({
  episode: one(episodes, { fields: [episodeProgress.episodeId], references: [episodes.id] })
}))

export const watchEventsRelations = relations(watchEvents, ({ one }) => ({
  mediaItem: one(mediaItems, { fields: [watchEvents.mediaItemId], references: [mediaItems.id] }),
  episode: one(episodes, { fields: [watchEvents.episodeId], references: [episodes.id] })
}))

export const seasonRatingsRelations = relations(seasonRatings, ({ one }) => ({
  season: one(seasons, { fields: [seasonRatings.seasonId], references: [seasons.id] })
}))

export const tagsRelations = relations(tags, ({ many }) => ({
  mediaTags: many(mediaTags)
}))

export const mediaTagsRelations = relations(mediaTags, ({ one }) => ({
  mediaItem: one(mediaItems, { fields: [mediaTags.mediaItemId], references: [mediaItems.id] }),
  tag: one(tags, { fields: [mediaTags.tagId], references: [tags.id] })
}))

export const schema = {
  mediaItems,
  seasons,
  episodes,
  libraryEntries,
  episodeProgress,
  watchEvents,
  seasonRatings,
  tags,
  mediaTags,
  mediaItemsRelations,
  seasonsRelations,
  episodesRelations,
  libraryEntriesRelations,
  episodeProgressRelations,
  watchEventsRelations,
  seasonRatingsRelations,
  tagsRelations,
  mediaTagsRelations
}
