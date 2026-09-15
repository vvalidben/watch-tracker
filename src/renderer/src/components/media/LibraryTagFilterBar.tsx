import { Tag as TagIcon } from 'lucide-react'
import type { TagDTO } from '@shared/tags'

interface LibraryTagFilterBarProps {
  tags: TagDTO[]
  value: number | null
  onChange: (tagId: number | null) => void
}

/** A plain select rather than a chip row — tags are open-ended and unbounded, unlike the fixed status list. */
export function LibraryTagFilterBar({ tags, value, onChange }: LibraryTagFilterBarProps): JSX.Element | null {
  if (tags.length === 0) return null

  return (
    <div className="flex items-center gap-1.5">
      <TagIcon className="h-4 w-4 text-muted-foreground" />
      <select
        value={value ?? ''}
        onChange={(event) => onChange(event.target.value === '' ? null : Number(event.target.value))}
        className="h-9 rounded-md border border-input bg-background px-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
      >
        <option value="">All tags</option>
        {tags.map((tag) => (
          <option key={tag.id} value={tag.id}>
            {tag.name}
          </option>
        ))}
      </select>
    </div>
  )
}
