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
    <div className="space-y-3 rounded-[14px] p-4" style={{ background: 'var(--wt-sunken)' }}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="wt-stack" style={{ gap: 6 }}>
          <span className="wt-label">Season rating</span>
          <RatingStars value={rating} onChange={onChange} readOnly={pending} />
        </div>
        {averageEpisodeRating !== null && (
          <p className="text-xs text-muted-foreground">
            Average episode rating <span className="font-medium text-foreground">{averageEpisodeRating.toFixed(1)}</span>
          </p>
        )}
      </div>
      <NotesEditor notes={notes} onSave={onSaveNotes} placeholder="Note on this season…" />
    </div>
  )
}
