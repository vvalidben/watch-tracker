import { Clapperboard, TriangleAlert } from 'lucide-react'
import { Button } from '@renderer/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@renderer/components/ui/card'

interface DatabaseErrorScreenProps {
  error: string | null
  dbPath: string
}

/**
 * A full takeover shown only when the database failed to open even after
 * the automatic corrupted-file recovery attempt (see main/db/recovery.ts) —
 * a rarer, more serious failure (disk full, permissions denied, the folder
 * itself inaccessible). Every other IPC handler failed to register in this
 * state, so there is nothing else useful to show underneath.
 */
export function DatabaseErrorScreen({ error, dbPath }: DatabaseErrorScreenProps): JSX.Element {
  return (
    <div className="flex h-screen w-screen items-center justify-center bg-background p-6 text-foreground">
      <Card className="max-w-lg">
        <CardHeader>
          <div className="mb-2 flex items-center gap-2 text-muted-foreground">
            <Clapperboard className="h-5 w-5" />
            <span className="text-sm font-medium">Watch Tracker</span>
          </div>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <TriangleAlert className="h-5 w-5" />
            Couldn&apos;t open your library
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Watch Tracker tried to automatically recover from this, but the database still couldn&apos;t be opened.
            Your data hasn&apos;t been deleted — it should still be at the location below.
          </p>
          {error && (
            <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 font-mono text-xs text-destructive">
              {error}
            </p>
          )}
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Database location</p>
            <p className="break-all font-mono text-xs">{dbPath}</p>
          </div>
          <p className="text-sm text-muted-foreground">
            This usually means the disk is full or the app doesn&apos;t have permission to write there. Free up
            space or check permissions, then restart Watch Tracker.
          </p>
          <Button type="button" variant="outline" onClick={() => void window.api.quit()}>
            Quit Watch Tracker
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
