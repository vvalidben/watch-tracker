# Test Strategy

Watch Tracker is tested at three levels. Each level exists because of a
concrete constraint in this codebase, not by convention:

1. **Pure logic tests** (`src/shared/*.test.ts`) — business rules with no
   I/O (progress calculation, status derivation, rating validation, backup
   format validation/migration, dashboard/statistics aggregation, library
   sorting). These are plain functions in, value out, so they're tested
   directly with no mocking.
2. **Repository / orchestration tests** (`src/main/**/*.test.ts`) — anything
   that touches the database or combines several repositories. These run
   against a **real** in-memory SQLite database (via sql.js), migrated with
   the actual migration files in `drizzle/migrations`, using
   `createTestContext()` (see `src/main/db/testUtils.ts`). Nothing here is
   mocked at the database layer — a test that passes here exercises the
   real schema, real foreign keys, and real query logic.
3. **Manual/GUI verification** — every sprint's UI work was additionally
   verified by launching the real Electron app (dev build, and for this
   release pass, the actual packaged installer output) and driving it with
   Playwright's Electron support, then inspecting screenshots. This is not
   part of `npm test` because Electron's native save/open/message dialogs
   cannot be driven by Playwright — this is a hard platform constraint, not
   a gap left unaddressed. Where a feature depends on a native dialog
   (backup export/import), the dialog-independent logic is covered
   exhaustively at level 2, and the dialog wiring itself was confirmed
   working by hand during development and again during this release pass
   against the packaged build (see "Release verification" below).

Renderer React components have no dedicated unit tests. This is a
deliberate scope boundary, not an oversight: this app has no business logic
in components (every calculation lives in `src/shared`, every mutation goes
through a typed IPC call), so component tests would mostly re-assert "this
prop renders as this text," which the manual GUI passes already cover more
realistically end to end.

Run everything with:

```bash
npm run typecheck   # tsc, no emit, both the main and renderer project configs
npm run lint        # eslint
npm test            # vitest — all three hundred-plus tests below
npm run build       # electron-vite production build
```

## Coverage by area

| Area | Where it's tested | Notes |
|---|---|---|
| **Searching** | `metadata/tmdbMapper.test.ts`, `metadata/tmdbProvider.test.ts`, `metadata/anilistProvider.test.ts`, `metadata/searchService.test.ts`, `metadata/httpClient.test.ts`, `metadata/rateLimit.test.ts`, `metadata/cache.test.ts` | Pure response-mapping/normalization (movie, series, season, episode, missing fields) tested with no network mocking at all in `tmdbMapper.test.ts`; provider wiring, not-found/missing-config/network errors, and caching/rate-limiting in the rest. |
| **Adding media** | `library/ensureLocalMedia.test.ts` | The external-id-is-identity rule: adding the same title twice never duplicates it locally. |
| **Library (list/filter/sort/search)** | `library/libraryView.test.ts`, `shared/librarySort.test.ts` | Every filter (type/status/favorite/tag/search) and every sort key, plus the "never calls the network" guarantee. |
| **Movies** | `library/progress.test.ts`, `db/repositories/libraryEntries.repository.test.ts` | Movies short-circuit progress calculation (no episodes) and drive watch status directly. |
| **TV series / Anime** | `library/progress.test.ts`, `db/repositories/episodeProgress.repository.test.ts`, `library/watchHistory.test.ts` | Both media types share the same season/episode model; anime-specific behavior (AniList provider) is covered separately in the metadata tests. |
| **Seasons** | `db/repositories/seasons.repository.test.ts`, `db/repositories/seasonRatings.repository.test.ts` | CRUD, uniqueness constraints, and season-level rating/notes independent of episode data. |
| **Episodes** | `db/repositories/episodes.repository.test.ts`, `db/repositories/episodeProgress.repository.test.ts` | CRUD, bulk "ensure many" for season-wide actions, and the per-season watched-count query. |
| **Watched status** | `db/repositories/episodeProgress.repository.test.ts`, `db/repositories/libraryEntries.repository.test.ts`, `library/watchHistory.test.ts` | Marking watched/unwatched at the episode, season, and series level, and that unwatching never destroys historical dates. |
| **Progress calculation** | `shared/progress.test.ts`, `library/progress.test.ts` | The pure math (percentage, current episode) and its integration with live provider data, including the worked example from the original spec and the "provider unreachable" failure path. |
| **Ratings** | `shared/ratings.test.ts`, `db/repositories/*.repository.test.ts` (episode/season/library entry), `library/ratings.test.ts` | Validation (0–10, half-point steps), and rollups (average episode/season rating). |
| **Notes** | `db/repositories/episodeProgress.repository.test.ts`, `db/repositories/seasonRatings.repository.test.ts`, `db/repositories/libraryEntries.repository.test.ts` | Add/edit/delete at all three levels, independent of rating/watched state. |
| **Favorites** | `db/repositories/libraryEntries.repository.test.ts`, `library/libraryView.test.ts` | Toggling and filtering by favorite. |
| **Watch history** | `db/repositories/watchEvents.repository.test.ts`, `library/watchHistory.test.ts` | The append-only ledger: multiple dates per episode, rewatch counting, and that unwatching never deletes a historical event. |
| **Statistics** | `shared/statistics.test.ts`, `library/statistics.test.ts` | Every statistic (overview, highest/lowest rated, monthly trends, completion, favorite genres), and — critically — that they stay correct after editing, unwatching, or removing a title. |
| **Backup** | `shared/backup.test.ts`, `backup/exportBackup.test.ts` | Format validation for every table, and that a real export round-trips through the reader. |
| **Restore** | `backup/importBackup.test.ts`, `shared/backup.test.ts` (migration tests) | Restoring onto an empty database, restoring over an existing one (full replace), a real export→restore round trip, and migrating a legacy (V1) backup forward. See also "Release verification" below for a restore test against a real packaged-app database file. |
| **Settings** | `config/appConfig.test.ts` | The on-disk config file (API key, remembered backup folder): missing file, corrupted file, non-object JSON, round-trip. |
| **Database migrations** | `db/migrations.test.ts` | Applying every migration to a brand new file and confirming the resulting schema supports a full cross-table read/write; re-opening an already-migrated file is a no-op. |
| **Corrupted database recovery** | `db/recovery.test.ts` | A garbage (non-SQLite) file at the database path is detected, moved aside intact, and replaced with a fresh working database. |

## Release verification (this pass)

Beyond `npm test`, this release was verified by:

- Building the production bundle (`npm run build`) and the Windows
  installer (`npm run package:win`) from a clean `npm install`.
- Launching the **packaged** `Watch Tracker.exe` (not the dev server) on a
  machine with no prior Watch Tracker data, confirming the database
  initializes fresh and the app is fully usable — search, add to library,
  rate, favorite, tag, mark an episode watched, and view statistics all
  exercised end to end.
- Copying the database file that packaged run produced and running it
  through the same export/restore code paths tested above, confirming a
  real, packaged-app-produced database backs up and restores correctly.
- Confirming `drizzle-kit generate` reports no pending schema changes
  (the committed migrations and `schema.ts` are in sync).

Native OS dialogs (save/open/confirm) used by backup export and restore
cannot be driven by Playwright and were verified by hand rather than
scripted; the logic on both sides of those dialogs is covered by the
automated tests listed above.
