import { HashRouter, Routes, Route } from 'react-router-dom'
import { useEffect,useState } from 'react'
import { cloudCall } from '../transport'
import { CloudEffects } from '@renderer/components/layout/CloudEffects'
import { DeletedLibrary } from '@renderer/components/layout/DeletedLibrary'
import { EpisodeReminders } from '@renderer/components/layout/EpisodeReminders'
import { AppShell } from '@renderer/components/layout/AppShell'
import { Dashboard } from '@renderer/pages/Dashboard'
import { Discover } from '@renderer/pages/Discover'
import { Library } from '@renderer/pages/Library'
import { Search } from '@renderer/pages/Search'
import { MediaDetail } from '@renderer/pages/MediaDetail'
import { Watchlist } from '@renderer/pages/Watchlist'
import { WatchLog } from '@renderer/pages/WatchLog'
import { Statistics } from '@renderer/pages/Statistics'
import { Settings } from '@renderer/pages/Settings'
import { Upcoming } from '@renderer/pages/Upcoming'
import { DatabaseErrorScreen } from '@renderer/pages/DatabaseErrorScreen'
import { useDatabaseStatus } from '@renderer/hooks/useDatabaseStatus'
import { AuthProvider, useAuth } from '@renderer/auth/AuthContext'
import { Login } from '@renderer/pages/Login'
import { RecoveryKey } from '@renderer/components/auth/RecoveryKey'

function LibraryApp(): JSX.Element {
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
      <CloudEffects />
      <EpisodeReminders />
      <Routes>
        <Route element={<AppShell />}>
          <Route index element={<Dashboard />} />
          <Route path="library" element={<Library />} />
          <Route path="search" element={<Search />} />
          <Route path="discover" element={<Discover />} />
          <Route path="media/:source/:mediaType/:externalId" element={<MediaDetail />} />
          <Route path="watchlist" element={<Watchlist />} />
          <Route path="log" element={<WatchLog />} />
          <Route path="statistics" element={<Statistics />} />
          <Route path="settings" element={<Settings />} />
          <Route path="upcoming" element={<Upcoming />} />
        </Route>
      </Routes>
    </HashRouter>
  )
}

function AuthGate(): JSX.Element {
  const auth = useAuth()
  if (auth.loading) return <div className="h-screen w-screen bg-background" aria-label="Checking sign-in" />
  if (auth.recoveryKey) return <RecoveryKey value={auth.recoveryKey} onContinue={auth.dismissRecovery} />
  if (!auth.state?.authenticated) return <Login />
  return <AccountGate />
}

function AccountGate():JSX.Element {
  const [deleted,setDeleted]=useState<boolean|null>(null)
  const [error,setError]=useState<string|null>(null)
  useEffect(()=>{
    const removed=()=>setDeleted(true)
    window.addEventListener('watch-tracker-account-deleted',removed)
    void cloudCall('account:status').then(result=>{if(!result.ok)throw new Error(result.error);setDeleted(result.data.deleted)}).catch(reason=>setError(reason instanceof Error?reason.message:'Connection required'))
    return()=>window.removeEventListener('watch-tracker-account-deleted',removed)
  },[])
  if(error)return <DatabaseErrorScreen error={error} dbPath="Your private cloud library"/>
  if(deleted===null)return <div className="h-screen w-screen bg-background" aria-label="Opening cloud library"/>
  return deleted?<DeletedLibrary/>:<LibraryApp/>
}

export default function App(): JSX.Element {
  return <AuthProvider><AuthGate /></AuthProvider>
}
