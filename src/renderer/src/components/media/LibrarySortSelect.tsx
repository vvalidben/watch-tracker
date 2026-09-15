import type { LibrarySortKey } from '@shared/library'
import { cn } from '@renderer/lib/utils'

const SORT_LABELS: Record<LibrarySortKey, string> = {
  recently_added: 'Recently Added',
  recently_watched: 'Recently Watched',
  alphabetical: 'Alphabetical',
  rating_desc: 'Highest Rating',
  rating_asc: 'Lowest Rating',
  release_date: 'Release Date'
}

const SORT_KEYS = Object.keys(SORT_LABELS) as LibrarySortKey[]

interface LibrarySortSelectProps {
  value: LibrarySortKey
  onChange: (sort: LibrarySortKey) => void
}

export function LibrarySortSelect({ value, onChange }: LibrarySortSelectProps): JSX.Element {
  return (
    <select
      value={value}
      onChange={(event) => onChange(event.target.value as LibrarySortKey)}
      className={cn(
        'h-9 rounded-md border border-input bg-background px-3 text-sm shadow-sm transition-colors',
        'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring'
      )}
    >
      {SORT_KEYS.map((key) => (
        <option key={key} value={key}>
          {SORT_LABELS[key]}
        </option>
      ))}
    </select>
  )
}
