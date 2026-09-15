import { LayoutGrid, List } from 'lucide-react'
import { Button } from '@renderer/components/ui/button'

export type LibraryViewMode = 'grid' | 'list'

interface LibraryViewToggleProps {
  value: LibraryViewMode
  onChange: (mode: LibraryViewMode) => void
}

export function LibraryViewToggle({ value, onChange }: LibraryViewToggleProps): JSX.Element {
  return (
    <div className="flex gap-1 rounded-md border border-input p-0.5">
      <Button
        type="button"
        size="icon"
        variant={value === 'grid' ? 'secondary' : 'ghost'}
        aria-label="Grid view"
        onClick={() => onChange('grid')}
        className="h-7 w-7"
      >
        <LayoutGrid className="h-4 w-4" />
      </Button>
      <Button
        type="button"
        size="icon"
        variant={value === 'list' ? 'secondary' : 'ghost'}
        aria-label="List view"
        onClick={() => onChange('list')}
        className="h-7 w-7"
      >
        <List className="h-4 w-4" />
      </Button>
    </div>
  )
}
