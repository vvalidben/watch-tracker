import { useState } from 'react'
import { ChevronDown, ChevronRight, Pencil, StickyNote, Trash2 } from 'lucide-react'
import { Button } from '@renderer/components/ui/button'

interface NotesEditorProps {
  notes: string | null
  onSave: (notes: string | null) => Promise<void>
  placeholder?: string
  /** When true, the editor starts behind a small "Notes" toggle (episode rows); otherwise it's always visible. */
  collapsible?: boolean
}

/**
 * A personal note, editable in place. Fully separate from any metadata the
 * media provider returns — this is local-only text the user wrote
 * themselves, stored on library_entries/season_ratings/episode_progress,
 * never on media_items/seasons/episodes.
 */
export function NotesEditor({ notes, onSave, placeholder, collapsible = false }: NotesEditorProps): JSX.Element {
  const [expanded, setExpanded] = useState(!collapsible || notes !== null)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(notes ?? '')
  const [saving, setSaving] = useState(false)

  function startEditing(): void {
    setDraft(notes ?? '')
    setEditing(true)
  }

  async function save(): Promise<void> {
    setSaving(true)
    const trimmed = draft.trim()
    await onSave(trimmed.length > 0 ? trimmed : null)
    setSaving(false)
    setEditing(false)
  }

  async function remove(): Promise<void> {
    setSaving(true)
    await onSave(null)
    setSaving(false)
    setEditing(false)
  }

  const body = editing ? (
    <div className="space-y-2">
      <textarea
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        placeholder={placeholder ?? 'Write a note…'}
        rows={3}
        autoFocus
        className="w-full resize-y rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
      />
      <div className="flex gap-2">
        <Button type="button" size="sm" disabled={saving} onClick={() => void save()}>
          Save
        </Button>
        <Button type="button" size="sm" variant="outline" disabled={saving} onClick={() => setEditing(false)}>
          Cancel
        </Button>
      </div>
    </div>
  ) : notes !== null ? (
    <div className="space-y-1.5">
      <p className="whitespace-pre-line text-sm">{notes}</p>
      <div className="flex gap-1">
        <Button type="button" size="sm" variant="ghost" className="h-7 gap-1 px-2 text-xs" onClick={startEditing}>
          <Pencil className="h-3 w-3" />
          Edit
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="h-7 gap-1 px-2 text-xs text-destructive hover:text-destructive"
          disabled={saving}
          onClick={() => void remove()}
        >
          <Trash2 className="h-3 w-3" />
          Delete
        </Button>
      </div>
    </div>
  ) : (
    <Button type="button" size="sm" variant="outline" className="h-7 gap-1.5 px-2 text-xs" onClick={startEditing}>
      <StickyNote className="h-3 w-3" />
      Add note
    </Button>
  )

  if (!collapsible) return body

  return (
    <div className="text-xs text-muted-foreground">
      <button
        type="button"
        onClick={() => setExpanded((prev) => !prev)}
        className="flex items-center gap-1 rounded-sm hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
      >
        {expanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
        <StickyNote className="h-3 w-3" />
        Notes
      </button>
      {expanded && <div className="mt-1.5 pl-4">{body}</div>}
    </div>
  )
}
