# Watch Tracker

A personal, local-first desktop app for tracking movies, TV series, and
anime — what you're watching, what you've finished, your own ratings and
notes, and your watch history. Everything you track is stored on your own
computer in a single SQLite file; searching for new titles is the only
thing that touches the network.

## Requirements

- [Node.js](https://nodejs.org/) 18 or later (20+ recommended) and npm
- Windows, macOS, or Linux
- A free [TMDB](https://www.themoviedb.org/settings/api) API key if you want
  to search for movies and TV series — anime search (via AniList) needs no
  key at all

## Installation

```bash
git clone <this repository>
cd watch-tracker
npm install
```

## API configuration

Copy the example environment file and add your TMDB key:

```bash
cp .env.example .env
```

```dotenv
TMDB_API_KEY=your_key_here
```

Alternatively, skip the `.env` file entirely and paste your key into
**Settings → API Configuration** once the app is running — a key entered
there is stored in the app's own config file and always takes priority over
`.env`. Either way, restart the app after changing the key so the change
takes effect. Without a TMDB key, movie/TV search is disabled but anime
search and every other feature (library, ratings, notes, statistics,
backup) work normally.

## Development

```bash
npm run dev
```

Starts the app with hot reload for the renderer. Useful checks while
developing:

```bash
npm run typecheck   # TypeScript, no emit
npm run lint        # ESLint
npm test            # vitest — see TESTING.md for the full strategy
npm run test:watch  # vitest in watch mode
```

Database schema changes go in `src/main/db/schema.ts`; generate the
matching migration with:

```bash
npm run db:generate
```

## Build

```bash
npm run build
```

Produces the production bundle in `out/`. To create an installable package
for your platform:

```bash
npm run package:win     # Windows: NSIS installer (.exe)
npm run package:mac     # macOS: .dmg
npm run package:linux   # Linux: AppImage
npm run dist            # current platform, same as `npm run package`
```

Installers are written to `release/` (e.g. `release/Watch Tracker Setup
0.1.0.exe` on Windows). Each script runs the production build first, so a
plain `npm install` followed by one of these commands is enough to go from
a clean checkout to a distributable installer. The packaged app never
depends on the Vite dev server — it loads the built files in `out/renderer`
directly, so it runs standalone with no terminal or dev tooling involved.

## Installing (Windows)

Run the generated `Watch Tracker Setup <version>.exe` and step through the
installer: it lets you choose the install folder, and creates both a Start
Menu entry and a Desktop shortcut (a real `.lnk` to the installed
`Watch Tracker.exe`, not a browser bookmark). After installing, launch the
app from either shortcut — no terminal or code editor needed. To uninstall,
use "Watch Tracker" in *Settings → Apps* (Windows) or run the uninstaller
left in the install folder; your database is untouched either way, since it
lives outside the install directory (see below).

macOS/Linux builds (`.dmg` / `AppImage`) follow their platform's normal
install conventions and are not yet installer-tested end-to-end.

### Regenerating the app icon

`build/icon.svg` is the source of truth; `build/icon.{png,ico,icns}` are
generated from it and consumed by electron-builder. To change the icon,
edit the SVG (or replace it) and re-run:

```bash
npm run icon:generate
```

## Database location

Your library lives in one SQLite file, created automatically on first run:

| Platform | Path |
|---|---|
| Windows | `%APPDATA%\watch-tracker\watch-tracker.db` |
| macOS | `~/Library/Application Support/watch-tracker/watch-tracker.db` |
| Linux | `~/.config/watch-tracker/watch-tracker.db` |

The same folder also holds `app-config.json` (your TMDB key and remembered
backup folder — see Settings). Nothing outside this folder is ever written.
You can find both paths for your own install under **Settings → Database**.

Note: `npm run dev` and the packaged app currently share this same folder
(both resolve it from the `name` field in `package.json`), so library data
and the configured TMDB key carry over between the two automatically —
useful during development, but worth knowing if you ever want to keep dev
and "real" data separate (in that case, back up before running `npm run dev`
against a machine that also has the packaged app installed).

## Backup / restore

**Settings → Backup & Restore** covers both directions:

- **Create Backup** writes a single dated JSON file containing your entire
  library — watch status, watch history, ratings, notes, favorites, and
  tags — to a location you choose. The format is versioned, so a backup
  taken by an older release of the app will still restore correctly.
- **Restore from Backup** reads a backup file you choose, validates it
  (rejecting anything corrupted or unrecognized before touching your data),
  asks you to confirm, then **replaces your entire current library** with
  its contents and restarts the app.

Both operations are entirely local — no data leaves your computer. Restore
is destructive by design (it's a full restore, not a merge), which is why
it always asks for confirmation first.

## Troubleshooting

**Movie/TV search says search is disabled.** No TMDB key is configured.
Add one via `.env` or Settings (see "API configuration" above) and restart.
Anime search works regardless, since AniList needs no key.

**Search or "mark season/series watched" fails with a network-ish error.**
That action needs to reach TMDB/AniList — check your internet connection.
Everything else (your library, ratings, notes, tags, favorites, watch
status, marking a single episode watched) works fully offline.

**A title's page shows "Showing cached info."** The metadata provider
couldn't be reached for that title just now, so the page is showing what's
already saved locally. Personal data still works normally; season/episode
browsing will return once you're back online.

**The app shows a banner about a reset database.** Watch Tracker detected
that its database file couldn't be read (usually from an unclean shutdown)
and automatically started a fresh one so the app stays usable. Your old
file wasn't deleted — the banner names exactly where it was moved to, in
case you want to try recovering data from it. If you have a backup, restore
it from **Settings**.

**The app won't start / shows "Couldn't open your library."** This means
even a fresh database couldn't be created — almost always a full disk or a
permissions problem on the database folder (see "Database location"
above). Free up space or fix permissions on that folder, then restart.

**I want to move my library to another computer.** Create a backup on the
old machine, install Watch Tracker on the new one, and restore the backup
there.
