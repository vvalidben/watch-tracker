import { HashRouter, Routes, Route } from 'react-router-dom'
import { AppShell } from '@renderer/components/layout/AppShell'
import { Dashboard } from '@renderer/pages/Dashboard'
import { Library } from '@renderer/pages/Library'
import { Search } from '@renderer/pages/Search'
import { MediaDetail } from '@renderer/pages/MediaDetail'
import { Watchlist } from '@renderer/pages/Watchlist'
import { WatchLog } from '@renderer/pages/WatchLog'
import { Statistics } from '@renderer/pages/Statistics'
import { Settings } from '@renderer/pages/Settings'
import { DatabaseErrorScreen } from '@renderer/pages/DatabaseErrorScreen'
import { useDatabaseStatus } from '@renderer/hooks/useDatabaseStatus'

function App(): JSX.Element {
  const { status, loading } = useDatabaseStatus()

  // A single fast local IPC call — this never blocks meaningfully long, so
  // no skeleton/spinner is worth the flash of its own; an empty frame for a
  // few milliseconds is preferable to flashing a loading state that's gone
  // before it's readable.
  if (loading) return <div className="h-screen w-screen bg-background" />

  if (status && !status.ok) {
    return <DatabaseErrorScreen error={status.error} dbPath={status.dbPath} />
  }

  return (
    <HashRouter>
      <Routes>
        <Route element={<AppShell />}>
          <Route index element={<Dashboard />} />
          <Route path="library" element={<Library />} />
          <Route path="search" element={<Search />} />
          <Route path="media/:source/:mediaType/:externalId" element={<MediaDetail />} />
          <Route path="watchlist" element={<Watchlist />} />
          <Route path="log" element={<WatchLog />} />
          <Route path="statistics" element={<Statistics />} />
          <Route path="settings" element={<Settings />} />
        </Route>
      </Routes>
    </HashRouter>
  )
}

export default App
