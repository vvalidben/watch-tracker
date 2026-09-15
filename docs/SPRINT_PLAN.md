# Watch Tracker — Sprint Plan

Companion to [ARCHITECTURE.md](./ARCHITECTURE.md). Each sprint is scoped to be completable in isolation and independently verifiable — no sprint depends on later ones. Order matters: metadata (search) comes *after* a working local library, so the app is useful (manually) before it's convenient.

---

### Sprint 0 — Project scaffolding

**Objective:** A blank but real Electron + Vite + React + TS + Tailwind + shadcn app that launches, hot-reloads, and packages.

**Files/components:** `package.json`, `vite.config.ts`, `tsconfig.json`, `tailwind.config.ts`, `electron/main/index.ts`, `electron/preload/index.ts`, `src/main.tsx`, `src/App.tsx`, `electron-builder.yml`.

**Dependencies:** none.

**Acceptance criteria:**
- `npm run dev` opens an Electron window showing a Tailwind/shadcn-styled placeholder page, with renderer hot-reload working.
- BrowserWindow created with `nodeIntegration: false`, `contextIsolation: true`, `sandbox: true`.
- `npm run build` produces a packaged Windows app that launches standalone.

**Tests:** Manual smoke test (launch, resize, close). No unit tests yet — nothing to unit test.

---

### Sprint 1 — Database layer & schema

**Objective:** SQLite + Drizzle wired up in the main process with the full schema from ARCHITECTURE.md and working migrations.

**Files/components:** `electron/main/db/schema.ts`, `electron/main/db/client.ts`, `electron/main/db/migrations/`, `drizzle.config.ts`.

**Dependencies:** Sprint 0.

**Acceptance criteria:**
- On first launch, `watch-tracker.db` is created in `userData` and all tables exist.
- Re-launching the app does not re-run or duplicate migrations.
- A throwaway script can insert a `media_item` + `library_entry` and read it back.

**Tests:** Vitest suite running Drizzle against a temp SQLite file: schema creation, foreign key cascade delete (deleting a `media_item` removes its `library_entry`/`seasons`/`episodes`), unique constraints (`season_unique`, `episode_unique`).

---

### Sprint 2 — IPC contract & preload bridge

**Objective:** The typed request/response contract between renderer and main, with a generic error-wrapping pattern, proven end-to-end with one trivial call.

**Files/components:** `shared/ipc-contract.ts`, `shared/entities.ts`, `electron/preload/index.ts`, `electron/main/ipc/registerHandlers.ts`, `electron/main/errors.ts`, `src/lib/ipcClient.ts`.

**Dependencies:** Sprint 1.

**Acceptance criteria:**
- `window.api.ping()` round-trips from renderer to main and back.
- A handler that deliberately throws surfaces in the renderer as a typed `{ ok: false, error }`, not an unhandled rejection or crash.
- Adding a new IPC method requires touching exactly the contract file + one handler + one preload entry — no other wiring.

**Tests:** Unit tests calling handler functions directly with a mocked db (bypassing Electron). A renderer test mocking `window.api` to confirm `ipcClient` unwraps `{ok,data}`/`{ok:false,error}` correctly into resolve/throw.

---

### Sprint 3 — Manual library CRUD (no external API yet)

**Objective:** Add/view/edit/delete a media item by hand, proving the core data model and UI shell before any network dependency.

**Files/components:** `electron/main/ipc/library.ts`, `electron/main/ipc/media.ts`, `src/pages/Library.tsx`, `src/components/media/MediaCard.tsx`, `src/hooks/useLibrary.ts`, `src/components/layout/AppShell.tsx`.

**Dependencies:** Sprint 2.

**Acceptance criteria:**
- User can add a movie or series by typing a title/type manually (no metadata), see it appear as a card in Library.
- User can edit its title and delete it.
- Data persists across app restarts.

**Tests:** Unit tests for `library.ts`/`media.ts` IPC handlers (create/read/update/delete). Component test rendering `MediaCard` with sample data. Manual restart-persistence check.

---

### Sprint 4 — Metadata provider abstraction + TMDB integration

**Objective:** Real search for movies/TV via TMDB, with the provider abstraction and caching layer in place from the start.

**Files/components:** `electron/main/services/metadata/{types,tmdbProvider,cachingProvider,registry}.ts`, `electron/main/ipc/metadata.ts`, `src/pages/Search.tsx`, `src/hooks/useSearch.ts`, TMDB API key field in Settings.

**Dependencies:** Sprint 3.

**Acceptance criteria:**
- Entering a TMDB API key in Settings and searching a movie/TV title returns real results with posters.
- Selecting a result creates a populated `media_item` (overview, poster, release date) and adds it to the library in one action.
- Repeating the same search within the cache TTL does not re-hit the network (verified via a log line or dev-tools network panel).
- Missing/invalid API key shows a clear inline message, not a crash.

**Tests:** Unit tests for `TmdbProvider` against a mocked `fetch`. Unit test for `CachingProvider` verifying a second identical call is served from `metadata_cache` (mock provider call-count assertion).

---

### Sprint 5 — Anime provider (AniList) + provider routing

**Objective:** Anime search routed to AniList, normalized into the same internal shape as TMDB results.

**Files/components:** `electron/main/services/metadata/anilistProvider.ts`, `registry.ts` updated to route by type.

**Dependencies:** Sprint 4.

**Acceptance criteria:**
- Searching with type "anime" hits AniList, not TMDB, and results render in the same `Search.tsx` UI unmodified.
- Adding an anime title populates `media_items` with `source: 'anilist'` and correct `externalIds.anilistId`.

**Tests:** Unit tests mapping sample AniList GraphQL responses to the internal `MetadataSearchResult`/`MetadataDetails` DTOs, confirming shape parity with the TMDB provider's output.

---

### Sprint 6 — Seasons & episodes tracking

**Objective:** Media detail page listing seasons/episodes (fetched from the matching provider on add), with per-episode watched toggling and computed progress.

**Files/components:** `electron/main/ipc/media.ts` (season/episode fetch + toggle endpoints), `src/pages/MediaDetail.tsx`, `src/components/media/SeasonAccordion.tsx`, `EpisodeRow.tsx`, `src/lib/progress.ts`.

**Dependencies:** Sprint 5.

**Acceptance criteria:**
- Opening a TV/anime item's detail page shows its seasons, each expandable to its episode list.
- Toggling an episode's watched checkbox persists immediately and updates a visible "12/24 watched" progress indicator.
- Marking the final unwatched episode watched prompts "Mark series as completed?" (accept/dismiss), per the status-is-user-controlled rule in the architecture doc.

**Tests:** Unit tests for `progress.ts` (0 episodes, none watched, partial, all watched). Integration test: toggle episode via IPC handler, assert `watched`/`watchedAt` persisted and progress recalculates.

---

### Sprint 7 — Ratings & notes

**Objective:** One consistent rating control (0–10, 0.5 step) usable on movies, series, seasons, and episodes, plus free-text notes at each of those levels.

**Files/components:** `src/components/media/RatingInput.tsx`, IPC handlers extended in `library.ts`/`media.ts` for rating/notes updates, `MediaDetail.tsx` wiring at series/season/episode level, `Library.tsx`/`MediaCard.tsx` showing movie/series rating.

**Dependencies:** Sprint 6.

**Acceptance criteria:**
- Rating and notes can be set at all four levels (movie, series overall, season, episode) and persist across restart.
- Invalid rating values (outside 0–10 or wrong step) are rejected by the IPC handler, not just the UI.

**Tests:** Unit tests for rating validation boundaries (−1, 0, 10, 10.5, 7.3). Persistence test round-tripping a rating + note through the IPC layer.

---

### Sprint 8 — Watching status & library filters

**Objective:** Full `watch_status` management and a Library page that's actually useful once you have more than a handful of entries.

**Files/components:** `electron/main/ipc/library.ts` (status update, filter/sort query params), `src/pages/Library.tsx` (filter bar, sort dropdown), `src/stores/uiStore.ts` (active filters as UI state).

**Dependencies:** Sprint 7.

**Acceptance criteria:**
- User can set/change watch status on any library entry.
- Library page filters by status and by type (movie/tv/anime), and sorts by title/date added/rating.
- Filter/sort state doesn't require a DB round-trip to change (client-side over a cached full list, or a debounced query — either is fine; the query cache should back this, not raw local component state duplicating server truth).

**Tests:** Unit tests for the filter/sort query builder (each status, each type, combinations, empty result). Component test confirming the filter bar updates the rendered list.

---

### Sprint 9 — Statistics dashboard

**Objective:** A stats page proving out the aggregation queries: totals, estimated hours watched, rating distribution, breakdown by type.

**Files/components:** `src/pages/Statistics.tsx`, `electron/main/ipc/stats.ts` (aggregation queries).

**Dependencies:** Sprint 8.

**Acceptance criteria:**
- Stats page shows: total items in library, movies/series/anime watched counts, total episodes watched, estimated hours watched (sum of runtimes), average rating, and a simple ratings histogram.
- Numbers match a manually-verified seeded dataset.

**Tests:** Unit tests for each aggregation query against a seeded temp DB with known expected totals (including edge cases: empty library, all-unrated items).

---

### Sprint 10 — Backup, export, import

**Objective:** The safety net described in the architecture doc: auto-backup on startup, manual JSON export, validated import.

**Files/components:** `electron/main/services/backup/{export,import}.ts`, `electron/main/ipc/backup.ts`, backup rotation logic in `electron/main/index.ts` startup sequence, Settings UI buttons.

**Dependencies:** Sprint 1 (schema stable); can be built any time after, placed late because it's not needed to develop against.

**Acceptance criteria:**
- On startup, a timestamped `.db` copy is written to `userData/backups/` at most once per day, oldest beyond the last 10 pruned.
- "Export Library" produces a JSON file containing all tables; "Import Library" restores from it (merge and replace modes both work) into a fresh install and reproduces the original library exactly.
- Importing a malformed/corrupt file is rejected with a clear error and makes no partial changes to the DB (transactional).

**Tests:** Round-trip test: seed DB → export → wipe → import → assert deep-equal (minus autoincrement ids) to the original dataset. Negative test: malformed JSON import leaves DB untouched.

---

### Sprint 11 — Error handling, logging, and polish

**Objective:** Make failure states feel intentional rather than broken, across the whole app.

**Files/components:** Toast wiring via shadcn `Toast`, `electron-log` setup in `electron/main/logger.ts`, loading/empty/error states added to `Search.tsx`, `Library.tsx`, `MediaDetail.tsx`, `Statistics.tsx`.

**Dependencies:** All prior sprints (this sweeps through screens built so far).

**Acceptance criteria:**
- Disconnecting network and searching shows a friendly inline error, not a crash; the rest of the app (library, ratings, stats) keeps working.
- Every list view has a defined empty state (e.g., "Your library is empty — search for something to add").
- Logs land in `userData/logs/main.log`; renderer errors get forwarded there too.

**Tests:** Simulate a provider throwing `NetworkError`/`RateLimitError`, assert the correct toast copy and a corresponding log entry.

---

### Sprint 12 — Packaging & distribution

**Objective:** A distributable Windows installer that works on a clean profile with no dev environment.

**Files/components:** `electron-builder.yml` (or `forge.config.ts`), app icon assets.

**Dependencies:** All prior sprints.

**Acceptance criteria:**
- `npm run package` produces a Windows installer.
- Installing on a clean Windows user profile launches the app, creates the DB from scratch, and runs migrations correctly with no dev tooling present.

**Tests:** Manual install test on a clean/alternate Windows user account.

---

## Summary table

| # | Sprint | Depends on |
|---|---|---|
| 0 | Scaffolding | — |
| 1 | DB schema & migrations | 0 |
| 2 | IPC contract & preload | 1 |
| 3 | Manual library CRUD | 2 |
| 4 | TMDB metadata + search | 3 |
| 5 | AniList metadata | 4 |
| 6 | Seasons & episodes | 5 |
| 7 | Ratings & notes | 6 |
| 8 | Watch status & filters | 7 |
| 9 | Statistics | 8 |
| 10 | Backup/export/import | 1 (built after 9 in practice) |
| 11 | Error handling & polish | 0–9 |
| 12 | Packaging | all |
