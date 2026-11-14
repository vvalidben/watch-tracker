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

interface SeasonWatchActionsProps {
  pending: boolean
  onMarkWatched: () => void
  onMarkUnwatched: () => void
}

export function SeasonWatchActions({ pending, onMarkWatched, onMarkUnwatched }: SeasonWatchActionsProps): JSX.Element {
  const [confirmOpen, setConfirmOpen] = useState(false)

  return (
    <div className="flex flex-wrap gap-2">

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogTrigger asChild>
          <button type="button" className="wt-ghost" disabled={pending}>
            Clear season
          </button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mark this season unwatched?</DialogTitle>
            <DialogDescription>
              This clears watched status for every episode in this season. You&apos;d have to re-mark them one by one
              to undo it.
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
                onMarkUnwatched()
              }}
            >
              Mark unwatched
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <button type="button" className="wt-btn wt-btn-cyan" disabled={pending} onClick={onMarkWatched}>
        ✓ Whole season
      </button>
    </div>
  )
}
