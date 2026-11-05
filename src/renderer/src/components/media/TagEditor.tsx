import { useState } from 'react'
import type { TagDTO } from '@shared/tags'

interface TagEditorProps {
  tags: TagDTO[]
  allTags: TagDTO[]
  pending: boolean
  onAdd: (name: string) => Promise<void>
  onRemove: (tagId: number) => Promise<void>
}

const DATALIST_ID = 'tag-suggestions'

/** Tags as removable pills, plus an autocompleting input to attach one, existing or brand new. */
export function TagEditor({ tags, allTags, pending, onAdd, onRemove }: TagEditorProps): JSX.Element {
  const [draft, setDraft] = useState('')

  const suggestions = allTags.filter((tag) => !tags.some((existing) => existing.id === tag.id))

  async function submit(): Promise<void> {
    const name = draft.trim()
    if (name.length === 0) return
    setDraft('')
    await onAdd(name)
  }

  return (
    <div className="wt-stack" style={{ gap: 8 }}>
      <span className="wt-label">Tags</span>
      {tags.length > 0 && (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {tags.map((tag) => (
            <button
              key={tag.id}
              type="button"
              className="wt-tag"
              disabled={pending}
              aria-label={`Remove tag ${tag.name}`}
              onClick={() => void onRemove(tag.id)}
            >
              #{tag.name} ×
            </button>
          ))}
        </div>
      )}
      <input
        className="wt-input"
        list={DATALIST_ID}
        aria-label="Add a tag"
        placeholder="Add a tag, press Enter"
        value={draft}
        style={{ background: 'var(--wt-surface)' }}
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            event.preventDefault()
            void submit()
          }
        }}
      />
      <datalist id={DATALIST_ID}>
        {suggestions.map((tag) => (
          <option key={tag.id} value={tag.name} />
        ))}
      </datalist>
    </div>
  )
}
