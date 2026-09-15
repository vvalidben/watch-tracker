import { Button } from '@renderer/components/ui/button'
import { RatingStars } from '@renderer/components/media/RatingStars'
import { setRatingPrecision, useRatingPrecision } from '@renderer/lib/ratingPrecision'

/** Whole-number ratings (8, 9) vs half-point precision (8.5, 9.5) — affects every rating control in the app. */
export function RatingPrecisionToggle(): JSX.Element {
  const precision = useRatingPrecision()

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Rating precision">
        <Button
          type="button"
          variant={precision === 'whole' ? 'default' : 'outline'}
          role="radio"
          aria-checked={precision === 'whole'}
          onClick={() => setRatingPrecision('whole')}
        >
          Whole numbers
        </Button>
        <Button
          type="button"
          variant={precision === 'half' ? 'default' : 'outline'}
          role="radio"
          aria-checked={precision === 'half'}
          onClick={() => setRatingPrecision('half')}
        >
          Half-point (8.5)
        </Button>
      </div>
      <div className="rounded-lg border border-border bg-muted/30 px-3 py-2.5">
        <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">Preview</p>
        <RatingStars value={precision === 'half' ? 8.5 : 8} readOnly />
      </div>
    </div>
  )
}
