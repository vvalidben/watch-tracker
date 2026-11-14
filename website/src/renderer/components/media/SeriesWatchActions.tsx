import { useState } from 'react'
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

interface SeriesWatchActionsProps {
  pending: boolean
  onMarkAllWatched: () => void
  onMarkAllUnwatched: () => void
}

export function SeriesWatchActions({
  pending,
  onMarkAllWatched,
  onMarkAllUnwatched
}: SeriesWatchActionsProps): JSX.Element {
  const [confirmOpen, setConfirmOpen] = useState(false)

  return (
    <div className="flex flex-wrap gap-2">
      <button type="button" className="wt-ghost" disabled={pending} onClick={onMarkAllWatched}>
        Mark series watched
      </button>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogTrigger asChild>
          <button type="button" className="wt-ghost" disabled={pending}>
            Clear series
          </button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mark entire series unwatched?</DialogTitle>
            <DialogDescription>
              This clears watched status for every episode across every season. You&apos;d have to re-mark them one
              by one to undo it.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setConfirmOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => {
                setConfirmOpen(false)
                onMarkAllUnwatched()
              }}
            >
              Mark unwatched
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
