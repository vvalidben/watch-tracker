import { Button } from '@renderer/components/ui/button'
import type { MediaTypeFilter } from '@renderer/hooks/useMediaSearch'

const FILTERS: { value: MediaTypeFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'movie', label: 'Movies' },
  { value: 'tv', label: 'TV Series' },
  { value: 'anime', label: 'Anime' }
]

interface MediaTypeFilterBarProps {
  value: MediaTypeFilter
  onChange: (value: MediaTypeFilter) => void
}

export function MediaTypeFilterBar({ value, onChange }: MediaTypeFilterBarProps): JSX.Element {
  return (
    <div className="flex flex-wrap gap-2">
      {FILTERS.map((filter) => (
        <Button
          key={filter.value}
          type="button"
          size="sm"
          variant={value === filter.value ? 'default' : 'outline'}
          className="rounded-full"
          onClick={() => onChange(filter.value)}
        >
          {filter.label}
        </Button>
      ))}
    </div>
  )
}
