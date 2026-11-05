import type { WatchStatus } from '@shared/library'
import { WATCH_STATUSES, watchStatusLabel } from '@renderer/lib/mediaFormatting'

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
      aria-label="Watch status"
      className="wt-select"
      style={{ padding: '6px 10px', borderRadius: 10, fontWeight: 700 }}
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
