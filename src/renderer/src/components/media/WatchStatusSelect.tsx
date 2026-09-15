import type { WatchStatus } from '@shared/library'
import { WATCH_STATUSES, watchStatusLabel } from '@renderer/lib/mediaFormatting'
import { cn } from '@renderer/lib/utils'

interface WatchStatusSelectProps {
  value: WatchStatus | null
  onChange: (status: WatchStatus) => void
  disabled?: boolean
}

/**
 * The manual override control: lets the user set any of the 5 statuses
 * directly, independent of the automatic progress-based recompute (see
 * shared/progress.ts's deriveAutoStatus). A plain native <select> — no
 * extra dependency needed for a single-choice dropdown like this.
 */
export function WatchStatusSelect({ value, onChange, disabled }: WatchStatusSelectProps): JSX.Element {
  return (
    <select
      value={value ?? ''}
      disabled={disabled}
      onChange={(event) => onChange(event.target.value as WatchStatus)}
      className={cn(
        'h-9 rounded-md border border-input bg-background px-3 text-sm shadow-sm transition-colors',
        'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
        'disabled:cursor-not-allowed disabled:opacity-50'
      )}
    >
      {!value && (
        <option value="" disabled>
          Set status…
        </option>
      )}
      {WATCH_STATUSES.map((status) => (
        <option key={status} value={status}>
          {watchStatusLabel(status)}
        </option>
      ))}
    </select>
  )
}
