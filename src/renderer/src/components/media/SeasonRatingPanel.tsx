import { NotesEditor } from './NotesEditor'
import { RatingStars } from './RatingStars'

interface SeasonRatingPanelProps {
  rating: number | null
  pending: boolean
  onChange: (rating: number | null) => void
  /** Average of this season's episode ratings — computed client-side from already-loaded episode data. */
  averageEpisodeRating: number | null
  notes: string | null
  onSaveNotes: (notes: string | null) => Promise<void>
}

/** The season's own personal rating and note, plus a read-only average of its episode ratings for context. */
export function SeasonRatingPanel({
  rating,
  pending,
  onChange,
  averageEpisodeRating,
  notes,
  onSaveNotes
}: SeasonRatingPanelProps): JSX.Element {
  return (
    <div className="space-y-3 rounded-xl border border-border bg-card p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3 rounded-lg border border-primary/25 bg-primary/10 px-3 py-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-primary">Season Rating</p>
            <div className="mt-1">
              <RatingStars value={rating} onChange={onChange} readOnly={pending} />
            </div>
          </div>
        </div>
        {averageEpisodeRating !== null && (
          <p className="text-xs text-muted-foreground">
            Avg. Episode Rating: <span className="font-medium text-foreground">{averageEpisodeRating.toFixed(1)}</span>
          </p>
        )}
      </div>
      <NotesEditor notes={notes} onSave={onSaveNotes} placeholder="Note on this season…" />
    </div>
  )
}
