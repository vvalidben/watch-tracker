import { Button } from '@renderer/components/ui/button'
import { watchStatusLabel } from '@renderer/lib/mediaFormatting'
import type { LibraryStatusFilter } from '@shared/library'

const STATUS_FILTERS: LibraryStatusFilter[] = [
  'all',
  'watching',
  'completed',
  'plan_to_watch',
  'on_hold',
  'dropped'
]

interface LibraryStatusFilterBarProps {
  value: LibraryStatusFilter
  onChange: (value: LibraryStatusFilter) => void
}

export function LibraryStatusFilterBar({ value, onChange }: LibraryStatusFilterBarProps): JSX.Element {
  return (
    <div className="flex flex-wrap gap-2">
      {STATUS_FILTERS.map((status) => (
        <Button
          key={status}
          type="button"
          size="sm"
          variant={value === status ? 'default' : 'outline'}
          className="rounded-full"
          onClick={() => onChange(status)}
        >
          {status === 'all' ? 'All' : watchStatusLabel(status)}
        </Button>
      ))}
    </div>
  )
}
