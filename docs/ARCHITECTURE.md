# Watch Tracker — Architecture

Personal, local-first desktop app for tracking anime/TV/movies. Single user, no auth, no cloud dependency for core function.

## 1. Stack decisions (confirmed)

Electron + React + TypeScript + Vite + Tailwind + shadcn/ui + SQLite + Drizzle ORM.

Additions needed to make that stack work well:

- **better-sqlite3** as the SQLite driver (synchronous, fast, ideal for a single-user local app — no need for async drivers meant for concurrent server access).
- **electron-log** for file logging.
- **zod** for validating external API responses and import files at runtime boundaries.
- **@tanstack/react-query** in the renderer for caching/loading/error state around IPC calls (treat IPC like a local "API").
- **zustand** (small) for pure UI state (active tab, filters) — not persisted data, that always lives in SQLite.
- **electron-builder** for packaging a Windows installer.

No Redux, no GraphQL, no server framework — all overkill for a single-user desktop app.

## 2. Process architecture

Electron's split is the backbone of the whole design: **main process owns all data and I/O, renderer only renders and calls IPC.**

```
┌─────────────────────────────┐        IPC (contextBridge)       ┌──────────────────────────────┐
│  Renderer (Chromium)        │ <───────────────────────────────>│  Main process (Node)         │
│  React + TS + Vite + Tailwind│                                  │  - SQLite (better-sqlite3)   │
│  shadcn/ui components        │                                  │  - Drizzle ORM + migrations  │
│  React Query (IPC cache)     │                                  │  - Metadata provider services│
│  zustand (UI-only state)     │                                  │  - Poster image cache on disk│
│  NO node integration          │                                  │  - Backup/export/import      │
│  contextIsolation: true       │                                  │  - electron-log               │
└─────────────────────────────┘                                  └──────────────────────────────┘
```

Rules that keep this maintainable:

- Renderer never touches `fs`, `better-sqlite3`, or `net` directly. `nodeIntegration: false`, `contextIsolation: true`, `sandbox: true` on the BrowserWindow.
- `preload/index.ts` exposes a single `window.api` object via `contextBridge.exposeInMainWorld`, typed against a shared contract (`shared/ipc-contract.ts`) so renderer and main can't drift out of sync.
- Every IPC call is `invoke/handle` (request/response), not `send/on` — matches the request-shaped nature of all these operations (search, add, rate, etc.) and gives you promises naturally.
- IPC handlers in main are grouped by domain (`library`, `media`, `metadata`, `stats`, `settings`, `backup`), each a small module that registers its own `ipcMain.handle(...)` calls.
- Handlers never throw raw errors across the bridge (Error objects don't serialize reliably). They return a discriminated result: `{ ok: true, data } | { ok: false, error: AppError }`.

## 3. Entities & relationships

Design principle: **movies, TV, and anime share one schema.** Anime is just "TV with a different metadata source" — modeling it separately would duplicate the seasons/episodes/rating logic for no benefit.

```
media_items (1) ──< seasons (1) ──< episodes
      │
      └──(1:1)── library_entries
```

- **media_items** — one row per searchable/trackable title (movie, TV series, or anime). Anime and TV share this table; a `type` column distinguishes them, and a `source` column records which metadata provider it came from.
- **seasons** — only populated for `type IN ('tv', 'anime')`. A movie has no seasons.
- **episodes** — belong to a season. Carries its own `watched` flag and its own rating — this is what "track watched episodes" and "rate individual episodes" mean concretely.
- **library_entries** — the join between "a media item exists" and "I'm tracking it." A `media_item` can theoretically be looked up (e.g., cached search result) without being in the library; adding it to your library creates this row. This is also where the *overall* series/movie rating, watch status, notes, and favorite flag live.
- Movies don't get a `seasons`/`episodes` row at all — a movie's "watched" boolean and rating live directly on `library_entries`, since a movie is a single watchable unit. This avoids a fake "1 season, 1 episode" wrapper for movies.

### Rating model

One consistent scale across the whole app: **0–10, in 0.5 increments**, nullable (unrated). Applied uniformly to:
- `library_entries.rating` → movie or overall series/anime rating
- `seasons.rating` → season rating
- `episodes.rating` → episode rating

Using one scale everywhere (rather than 5-star for movies, 10-point for series, etc.) removes a whole class of UI/aggregation inconsistency and makes the statistics sprint trivial.

### Watch status model

`library_entries.watch_status`: `plan_to_watch | watching | completed | on_hold | dropped`.

For series/anime this is a **user-controlled** field, not fully derived — but the UI nudges it: when the last unwatched episode is marked watched, prompt "mark as completed?" rather than silently overriding the user's choice. This avoids the trap of trying to auto-derive status perfectly (rewatching, hiatus shows, etc. all break naive derivation).

## 4. Database schema (Drizzle / SQLite)

```ts
// electron/main/db/schema.ts

export const mediaItems = sqliteTable('media_items', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  type: text('type', { enum: ['movie', 'tv', 'anime'] }).notNull(),
  title: text('title').notNull(),
  originalTitle: text('original_title'),
  overview: text('overview'),
  posterPath: text('poster_path'),      // local cached file path, not a remote URL
  backdropPath: text('backdrop_path'),
  releaseDate: text('release_date'),    // ISO date string
  airingStatus: text('airing_status'),  // 'airing' | 'finished' | 'upcoming' | null
  runtimeMinutes: integer('runtime_minutes'), // movies only
  genres: text('genres'),               // JSON string array
  source: text('source', { enum: ['tmdb', 'anilist', 'manual'] }).notNull(),
  externalIds: text('external_ids'),    // JSON: { tmdbId, imdbId, anilistId, malId }
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const seasons = sqliteTable('seasons', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  mediaItemId: integer('media_item_id').notNull().references(() => mediaItems.id, { onDelete: 'cascade' }),
  seasonNumber: integer('season_number').notNull(),
  title: text('title'),
  overview: text('overview'),
  posterPath: text('poster_path'),
  airDate: text('air_date'),
  rating: real('rating'),               // 0-10, 0.5 step, nullable
  notes: text('notes'),
}, (t) => ({
  uniq: uniqueIndex('season_unique').on(t.mediaItemId, t.seasonNumber),
}));

export const episodes = sqliteTable('episodes', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  seasonId: integer('season_id').notNull().references(() => seasons.id, { onDelete: 'cascade' }),
  episodeNumber: integer('episode_number').notNull(),
  title: text('title'),
  overview: text('overview'),
  airDate: text('air_date'),
  runtimeMinutes: integer('runtime_minutes'),
  watched: integer('watched', { mode: 'boolean' }).notNull().default(false),
  watchedAt: text('watched_at'),
  rating: real('rating'),
  notes: text('notes'),
}, (t) => ({
  uniq: uniqueIndex('episode_unique').on(t.seasonId, t.episodeNumber),
}));

export const libraryEntries = sqliteTable('library_entries', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  mediaItemId: integer('media_item_id').notNull().unique().references(() => mediaItems.id, { onDelete: 'cascade' }),
  watchStatus: text('watch_status', {
    enum: ['plan_to_watch', 'watching', 'completed', 'on_hold', 'dropped'],
  }).notNull().default('plan_to_watch'),
  rating: real('rating'),               // movie rating, or overall series/anime rating
  watched: integer('watched', { mode: 'boolean' }).notNull().default(false), // movies only
  watchedAt: text('watched_at'),
  notes: text('notes'),
  favorite: integer('favorite', { mode: 'boolean' }).notNull().default(false),
  addedAt: text('added_at').notNull(),
  startedAt: text('started_at'),
  completedAt: text('completed_at'),
});

export const appSettings = sqliteTable('app_settings', {
  key: text('key').primaryKey(),
  value: text('value').notNull(), // JSON string
});

export const metadataCache = sqliteTable('metadata_cache', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  source: text('source').notNull(),       // 'tmdb' | 'anilist'
  cacheKey: text('cache_key').notNull(),  // e.g. `search:${query}` or `details:${externalId}`
  payload: text('payload').notNull(),     // JSON string
  fetchedAt: text('fetched_at').notNull(),
}, (t) => ({
  uniq: uniqueIndex('cache_unique').on(t.source, t.cacheKey),
}));
```

Notes:
- All timestamps stored as ISO 8601 strings (SQLite has no native datetime type; strings sort correctly and are trivially JSON-serializable for export).
- `externalIds` and `genres` as JSON text columns rather than separate tables — they're read-heavy, never queried by individual field, and normalizing them would add joins for no real benefit at this scale.
- `ON DELETE CASCADE` on foreign keys means deleting a `media_item` cleans up its seasons/episodes/library entry automatically — one place to reason about deletion.
- No `users` table, no auth columns — intentionally, per requirements.

## 5. External metadata API abstraction

Two categories of source: **TMDB** (movies + TV) and **AniList** (anime — richer and more accurate for anime than TMDB, which often has thin anime data). A common interface hides the difference from the rest of the app:

```ts
// electron/main/services/metadata/types.ts
interface MetadataProvider {
  readonly source: 'tmdb' | 'anilist';
  search(query: string, type: 'movie' | 'tv' | 'anime'): Promise<MetadataSearchResult[]>;
  getDetails(externalId: string, type: 'movie' | 'tv' | 'anime'): Promise<MetadataDetails>;
  getSeasons(externalId: string): Promise<MetadataSeason[]>;   // tv/anime only
  getEpisodes(externalId: string, seasonNumber: number): Promise<MetadataEpisode[]>;
}
```

- `TmdbProvider` implements this for movies/tv.
- `AniListProvider` implements this for anime (GraphQL API), normalizing AniList's season/episode shape into the same `MetadataSeason`/`MetadataEpisode` DTOs so the rest of the app never branches on source.
- A `ProviderRegistry` routes by `type`: `movie|tv → TmdbProvider`, `anime → AniListProvider`. This is the **only** place that knows two providers exist.
- A `CachingProvider` decorator wraps each provider: checks `metadata_cache` table first (with a TTL, e.g. 24h for search, 7d for details/episodes), calls the real provider on miss, writes the result back. This is what makes the app tolerate flaky connections and avoids re-hitting rate-limited APIs on every screen visit.
- A thin `fetchWithRetry` helper (exponential backoff, small retry count) wraps outbound HTTP calls; both providers use it.
- API keys (TMDB requires one; AniList doesn't) are stored in `app_settings`, entered once in a Settings screen — never hardcoded, never required at first launch (search simply shows "add a TMDB API key in Settings" if missing).
- **Poster images are downloaded once and cached to disk** (`userData/cache/posters/<hash>.jpg`); `media_items.posterPath` stores the local path. This is what makes "local-first" actually true — the library still shows posters with no internet connection, and you're not hotlinking a third-party CDN indefinitely.

## 6. Error handling

Layered, so a failure in one place degrades gracefully instead of crashing the app:

- **Typed errors** (`electron/main/errors.ts`): `NetworkError`, `RateLimitError`, `NotFoundError`, `ValidationError`, `DatabaseError`, each with a stable `code` string.
- **IPC boundary**: every handler is wrapped by a helper that catches thrown errors and converts them to `{ ok: false, error: { code, message } }` — nothing but plain serializable data crosses the bridge.
- **Renderer**: `window.api.*` calls go through React Query. A `{ ok: false }` result is turned into a thrown error inside the query function, so React Query's existing `isError`/`error` handling and retry semantics apply for free. A top-level error boundary + shadcn `Toast` surfaces unexpected errors without freezing the UI.
- **Metadata failures are non-fatal**: if TMDB/AniList is unreachable, search shows an inline "couldn't reach TMDB — check your connection or API key" state; the rest of the app (library, ratings, stats) is unaffected since it's pure local DB.
- **Logging**: `electron-log` writes to `userData/logs/main.log`, rotated by size. Renderer errors are forwarded to the main process to land in the same log (single place to look when something goes wrong).

## 7. Local data persistence

- Single SQLite file: `app.getPath('userData')/watch-tracker.db`.
- Drizzle migrations (SQL files generated by `drizzle-kit`) run automatically on app startup, before any window is created, guarded by a version check so migrations are never silently skipped.
- Poster/backdrop image cache: `userData/cache/posters/`, `userData/cache/backdrops/`. Simple size cap (e.g. 500MB) with LRU-ish cleanup (delete oldest-accessed files) run opportunistically on startup — prevents unbounded disk growth over years of use.
- No cloud, no telemetry, no network calls except explicit metadata search/detail fetches the user triggers.

## 8. Backup / export / import (designed now, built in a later sprint)

- **Auto-backup**: on every app startup, copy `watch-tracker.db` to `userData/backups/watch-tracker-<timestamp>.db` if the last backup is older than a day; keep the most recent N (e.g. 10), delete older ones. Cheap insurance against a bad migration or accidental deletion.
- **Manual export**: "Export Library" in Settings serializes all tables to a single JSON file (`{ version, exportedAt, mediaItems, seasons, episodes, libraryEntries }`) — human-readable, portable, diffable. Poster cache is not included in the JSON (it's regenerable from `externalIds` on next fetch); a "full export with images" option can zip the cache folder alongside the JSON if ever needed.
- **Manual import**: validated with a `zod` schema before touching the DB; runs inside a single SQLite transaction so a bad file can't leave the DB half-written; offers "merge" (skip items whose `externalIds` already exist) or "replace" (wipe and restore).
- Designing `externalIds` as the stable identity for media (rather than internal autoincrement ids) is what makes future sync/merge across machines possible later without a redesign — noted as a non-goal now, but the schema doesn't block it.

## 9. Potential architectural problems (and how the design addresses them)

| Problem | Mitigation |
|---|---|
| Same title matched differently across TMDB/AniList → duplicates | `externalIds` JSON + a "did you mean this existing library item?" check on add, keyed by source+id |
| Anime episode/season numbering differs from TMDB's model (absolute numbering, specials, cours splits) | AniList provider normalizes into the same `seasons`/`episodes` shape; provider is the only place that deals with source-specific quirks |
| Renderer needs direct DB/file access for "snappy" UI → tempting to disable Electron sandboxing | Rejected — everything goes through typed IPC; React Query caching keeps it feeling instant without breaking process isolation |
| Series "watched" status conflicting with per-episode watched flags | Status is user-controlled, UI only *suggests* transitions (e.g. prompt on last episode watched); never silently overridden |
| Schema changes over time breaking existing users' data | Drizzle migrations + mandatory auto-backup before running a new migration |
| Unbounded poster cache growth | Size cap + LRU cleanup on startup |
| Metadata API downtime blocking the whole app | Metadata calls are isolated to Search/Add flows; library browsing, rating, notes, stats work fully offline |
| Rating scale inconsistency across movie/season/episode/series | Single 0–10/0.5-step scale enforced at the schema and UI-component level (one `RatingInput` component used everywhere) |
| IPC contract drifting between main and preload as features grow | Single shared `shared/ipc-contract.ts` typed contract imported by both sides — a mismatch is a compile error, not a runtime bug |

## 10. Folder structure

```
watch-tracker-app/
├── electron/
│   ├── main/
│   │   ├── index.ts                 # app bootstrap, window creation, migration runner
│   │   ├── db/
│   │   │   ├── client.ts            # better-sqlite3 + drizzle instance
│   │   │   ├── schema.ts            # tables above
│   │   │   └── migrations/          # drizzle-kit generated SQL
│   │   ├── ipc/
│   │   │   ├── registerHandlers.ts  # calls each domain's register fn
│   │   │   ├── library.ts
│   │   │   ├── media.ts
│   │   │   ├── metadata.ts
│   │   │   ├── stats.ts
│   │   │   ├── settings.ts
│   │   │   └── backup.ts
│   │   ├── services/
│   │   │   ├── metadata/
│   │   │   │   ├── types.ts
│   │   │   │   ├── tmdbProvider.ts
│   │   │   │   ├── anilistProvider.ts
│   │   │   │   ├── cachingProvider.ts
│   │   │   │   └── registry.ts
│   │   │   ├── posterCache.ts
│   │   │   └── backup/
│   │   │       ├── export.ts
│   │   │       └── import.ts
│   │   ├── errors.ts
│   │   └── logger.ts
│   └── preload/
│       └── index.ts                 # contextBridge, implements shared contract
├── shared/
│   ├── ipc-contract.ts              # window.api shape, request/response types
│   └── entities.ts                  # MediaItem, Season, Episode, LibraryEntry TS types
├── src/                             # renderer
│   ├── main.tsx
│   ├── App.tsx
│   ├── pages/
│   │   ├── Search.tsx
│   │   ├── Library.tsx
│   │   ├── MediaDetail.tsx
│   │   ├── Statistics.tsx
│   │   └── Settings.tsx
│   ├── components/
│   │   ├── ui/                      # shadcn generated primitives
│   │   ├── media/
│   │   │   ├── MediaCard.tsx
│   │   │   ├── RatingInput.tsx
│   │   │   ├── SeasonAccordion.tsx
│   │   │   ├── EpisodeRow.tsx
│   │   │   └── WatchStatusBadge.tsx
│   │   └── layout/
│   │       ├── Sidebar.tsx
│   │       └── AppShell.tsx
│   ├── hooks/
│   │   ├── useLibrary.ts
│   │   ├── useSearch.ts
│   │   └── useMediaDetail.ts
│   ├── lib/
│   │   ├── ipcClient.ts             # thin wrapper: unwraps {ok,data|error}, throws for React Query
│   │   └── queryClient.ts
│   └── stores/
│       └── uiStore.ts               # zustand, UI-only state
├── drizzle.config.ts
├── electron-builder.yml
├── vite.config.ts
├── tailwind.config.ts
├── tsconfig.json
└── package.json
```
