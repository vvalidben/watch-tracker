import { useState } from 'react'
import { CheckCircle2, Download, TriangleAlert, Upload } from 'lucide-react'
import { Button } from '@renderer/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@renderer/components/ui/dialog'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@renderer/components/ui/card'
import { useBackup } from '@renderer/hooks/useBackup'
import { useAppConfig } from '@renderer/hooks/useAppConfig'

export function BackupCard(): JSX.Element {
  const { status, exportBackup, importBackup } = useBackup()
  const { config } = useAppConfig()
  const [confirmOpen, setConfirmOpen] = useState(false)
  const pending = status.kind === 'pending' || status.kind === 'restoring'

  async function handleConfirmRestore(): Promise<void> {
    setConfirmOpen(false)
    await importBackup()
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Backup &amp; Restore</CardTitle>
        <CardDescription>
          Everything below stays on this computer — your library, watch history, ratings, notes, favorites, and
          tags are read from (or written to) a single JSON file you choose. Nothing is ever sent anywhere.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <Button type="button" className="gap-1.5" disabled={pending} onClick={() => void exportBackup()}>
            <Download className="h-4 w-4" />
            Create Backup
          </Button>

          <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
            <DialogTrigger asChild>
              <Button type="button" variant="destructive" className="gap-1.5" disabled={pending}>
                <Upload className="h-4 w-4" />
                Restore from Backup
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Restore from backup?</DialogTitle>
                <DialogDescription>
                  This replaces everything currently in your library — titles, watch history, ratings, notes,
                  favorites, and tags — with the contents of a backup file. Choose a file next, and you&apos;ll get
                  one more chance to cancel before anything changes.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setConfirmOpen(false)}>
                  Cancel
                </Button>
                <Button type="button" variant="destructive" onClick={() => void handleConfirmRestore()}>
                  Choose File &amp; Restore
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {config?.defaultBackupDirectory && (
          <p className="text-xs text-muted-foreground">
            Backups default to <span className="font-medium text-foreground">{config.defaultBackupDirectory}</span>
          </p>
        )}

        {status.kind === 'exported' && (
          <p className="flex items-start gap-2 text-sm text-success">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
            Backup saved to {status.filePath}
          </p>
        )}

        {status.kind === 'restoring' && (
          <p className="flex items-start gap-2 text-sm text-muted-foreground">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
            Restoring your backup — the app will restart automatically in a moment.
          </p>
        )}

        {status.kind === 'error' && (
          <p className="flex items-start gap-2 text-sm text-destructive">
            <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
            {status.message}
          </p>
        )}
      </CardContent>
    </Card>
  )
}
