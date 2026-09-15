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
      <Button type="button" size="sm" variant="outline" disabled={pending} onClick={onMarkAllWatched}>
        Mark entire series watched
      </Button>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogTrigger asChild>
          <Button type="button" size="sm" variant="outline" disabled={pending}>
            Mark entire series unwatched
          </Button>
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
