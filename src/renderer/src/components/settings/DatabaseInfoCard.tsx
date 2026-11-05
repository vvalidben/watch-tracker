import { useEffect, useState } from 'react'
import { Skeleton } from '@renderer/components/ui/skeleton'
import { useDatabaseInfo } from '@renderer/hooks/useDatabaseInfo'
import { formatBytes } from '@renderer/lib/formatBytes'

export function DatabaseInfoCard(): JSX.Element {
  const { info, loading } = useDatabaseInfo()
  const [version, setVersion] = useState('')

  useEffect(() => {
    window.api
      .getAppVersion()
      .then(setVersion)
      .catch(() => setVersion('unknown'))
  }, [])

  return (
    <div className="wt-panel wt-rise" style={{ padding: 24, display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '10px 24px', fontSize: 14, animationDelay: '240ms' }}>
      <h2 className="wt-h3" style={{ gridColumn: '1 / -1', marginBottom: 6 }}>
        Database
      </h2>
      {loading || !info ? (
        <Skeleton className="h-20 rounded-xl" style={{ gridColumn: '1 / -1' }} />
      ) : (
        <>
          <span style={{ color: 'var(--wt-muted)' }}>Location</span>
          <span style={{ wordBreak: 'break-all' }}>{info.filePath}</span>
          <span style={{ color: 'var(--wt-muted)' }}>File size</span>
          <span>{formatBytes(info.fileSizeBytes)}</span>
          <span style={{ color: 'var(--wt-muted)' }}>Titles</span>
          <span>{info.libraryEntryCount}</span>
          <span style={{ color: 'var(--wt-muted)' }}>Version</span>
          <span>Watch Tracker v{version || '…'}</span>
        </>
      )}
    </div>
  )
}
