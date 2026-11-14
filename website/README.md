# Watch Tracker Web

A standalone website made from the desktop app's actual React interface and tracking engine. It preserves all eight appearances, motion controls, dashboard, library/showcase/gallery, watchlist, episode schedule, watch log, ratings, notes, tags, CSV imports, statistics, and portable JSON backups.

## Accounts and cloud data

Hosted sign-in uses Sign in with ChatGPT. Sites provides the authenticated identity, and the API scopes every operation to that identity. The website starts private to its owner. Libraries sync across devices signed into the same account. Appearance preferences remain device-specific.

Each library is a SQLite file in private R2 storage. D1 stores its revision and version pointer. A conditional revision update prevents simultaneous devices from overwriting each other; the client retries conflicts. Old versions provide cloud safety snapshots. Library files are never publicly served.

The website does not modify or automatically upload the desktop app's database. To bring over existing data, create a JSON backup in the desktop app, then restore that file in the website's Settings. The format is shared in both directions.

Anime search uses AniList without a key. Film and series search uses the account's TMDB key from Settings, or the optional server-side `TMDB_API_KEY` environment variable. Keys are not placed in the client bundle or backups.

## Discover and streaming information

Open **Discover** in the sidebar to browse popular, top-rated, or upcoming films, series and anime without entering a search term. Filter by genre and release year, move through catalogue pages, hide titles already in your library, or use **Surprise me** to open a result. Add a title directly from its card; it uses the same library and duplicate checks as search. Filters stay in the page URL for back navigation.

Title pages now include **More like this**, using TMDB or AniList community recommendations, and **Where to watch**. For films and series, choose a country to see separate subscription, free, ad-supported, rental and purchase listings from JustWatch via TMDB. Follow the TMDB viewing-options link for provider links. Availability can change; an empty listing does not prove that a title is unavailable everywhere. Anime uses AniList's streaming links, explicitly labelled as not country-specific. The chosen country is saved in this browser.

These additions were informed by [AniList's discovery shelves](https://anilist.co/), [SIMKL's discovery and viewing availability](https://simkl.com/), and [Letterboxd's streaming-service features](https://letterboxd.com/faq/). Existing ratings, diary, statistics and episode tracking already cover several of the comparison sites' core features.

## Development

Install dependencies with `npm ci`, then run:

```
npm run build
npm test
npm run typecheck
npm run dev
```

The portable preview runs at http://127.0.0.1:5175. Its sign-in is explicitly a local simulation, implemented only in the development server. It uses synthetic local identity and stores preview data in ignored `.local-data/`; production never imports that server or accepts its cookie.

For local film and series search, the preview reads `TMDB_API_KEY` from the process environment, `website/.env`, or the desktop project's `../.env`, in that order. Restart `npm run dev` after changing the key. The key stays on the server.

The production artifact is `dist/server/index.js`, a Cloudflare Worker with the compiled React interface and its self-hosted WOFF2 fonts. `.openai/hosting.json` declares the D1 and R2 bindings. Cloud schema migrations are generated with `npm run db:generate` and included in the deployment artifact.

The plain JavaScript SQL.js engine lets the website reuse the desktop's tested repositories and tracking rules without dynamic WebAssembly compilation. The build disables the embedded engine's browser, browser-worker and Node host loaders, because Cloudflare has no browser `self.location`. After building, `npm run test:worker` exercises the compiled artifact with Worker globals and no browser location, including opening and saving a library.

CSV imports support files up to 5 MB; JSON uploads support files up to 7 MB. Library files have a 20 MB bound. A connection is required for library changes; the interface reports failures and never labels an unsaved action as synced.

## Verification

The cloud integration suite checks missing identity, cross-origin rejection, account isolation, persistence, concurrent revision conflicts, portable backup restore, invalid import rollback, per-account CSV previews, and per-account safety snapshots. The desktop application's tracking logic is reused, rather than replaced with a demonstration dataset.
