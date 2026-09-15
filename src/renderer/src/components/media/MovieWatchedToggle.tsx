import { Check } from 'lucide-react'
import { Button } from '@renderer/components/ui/button'
import type { WatchStatus } from '@shared/library'

interface MovieWatchedToggleProps {
  watchStatus: WatchStatus | null
  pending: boolean
  onSetStatus: (status: WatchStatus) => void
}

/** Movies have no episodes, so "watched" is just watchStatus === 'completed'. */
export function MovieWatchedToggle({ watchStatus, pending, onSetStatus }: MovieWatchedToggleProps): JSX.Element {
  const watched = watchStatus === 'completed'

  return (
    <Button
      type="button"
      size="sm"
      variant={watched ? 'secondary' : 'outline'}
      disabled={pending}
      className="gap-1.5"
      onClick={() => onSetStatus(watched ? 'plan_to_watch' : 'completed')}
    >
      <Check className="h-4 w-4" />
      {watched ? 'Watched' : 'Mark as Watched'}
    </Button>
  )
}
