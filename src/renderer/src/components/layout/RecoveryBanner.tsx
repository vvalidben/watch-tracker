import { useState } from 'react'
import { TriangleAlert, X } from 'lucide-react'
import { useDatabaseStatus } from '@renderer/hooks/useDatabaseStatus'

/**
 * A one-time, dismissible notice for the rare case where the database file
 * was unreadable at startup and got automatically reset (see
 * main/db/recovery.ts). The app is fully usable at this point — this is
 * purely informational, so the user knows why their library looks empty
 * and where to find the old file if they want to try recovering it.
 */
export function RecoveryBanner(): JSX.Element | null {
  const { status } = useDatabaseStatus()
  const [dismissed, setDismissed] = useState(false)

  if (dismissed || !status?.recoveredFromCorruption) return null

  return (
    <div className="flex items-start gap-2 border-b border-destructive/30 bg-destructive/10 px-4 py-2 text-sm text-destructive">
      <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
      <p className="flex-1">
        Your database couldn&apos;t be read and was reset. The previous file was saved as{' '}
        <span className="break-all font-mono text-xs">{status.corruptedFilePath}</span> in case you want to recover
        anything from it.
      </p>
      <button
        type="button"
        aria-label="Dismiss"
        onClick={() => setDismissed(true)}
        className="rounded-sm text-destructive hover:opacity-70 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}
