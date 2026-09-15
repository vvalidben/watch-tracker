import { useState } from 'react'
import { Plus, Tag as TagIcon, X } from 'lucide-react'
import { Button } from '@renderer/components/ui/button'
import { Input } from '@renderer/components/ui/input'
import type { TagDTO } from '@shared/tags'

interface TagEditorProps {
  tags: TagDTO[]
  allTags: TagDTO[]
  pending: boolean
  onAdd: (name: string) => Promise<void>
  onRemove: (tagId: number) => Promise<void>
}

const DATALIST_ID = 'tag-suggestions'

/** Tags as removable chips, plus a small autocompleting input to attach one (existing or brand new). */
export function TagEditor({ tags, allTags, pending, onAdd, onRemove }: TagEditorProps): JSX.Element {
  const [draft, setDraft] = useState('')
  const [adding, setAdding] = useState(false)

  const suggestions = allTags.filter((tag) => !tags.some((existing) => existing.id === tag.id))

  async function submit(): Promise<void> {
    const name = draft.trim()
    if (name.length === 0) return
    setAdding(true)
    await onAdd(name)
    setAdding(false)
    setDraft('')
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <TagIcon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
      {tags.map((tag) => (
        <span
          key={tag.id}
          className="flex items-center gap-1 rounded-full border border-border bg-muted px-2 py-0.5 text-xs"
        >
          {tag.name}
          <button
            type="button"
            aria-label={`Remove tag ${tag.name}`}
            disabled={pending}
            onClick={() => void onRemove(tag.id)}
            className="rounded-sm text-muted-foreground hover:text-destructive focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            <X className="h-3 w-3" />
          </button>
        </span>
      ))}

      <div className="flex items-center gap-1">
        <Input
          list={DATALIST_ID}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault()
              void submit()
            }
          }}
          placeholder="Add tag…"
          className="h-7 w-28 text-xs"
        />
        <datalist id={DATALIST_ID}>
          {suggestions.map((tag) => (
            <option key={tag.id} value={tag.name} />
          ))}
        </datalist>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-7 w-7 p-0"
          disabled={adding || draft.trim().length === 0}
          onClick={() => void submit()}
        >
          <Plus className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  )
}
