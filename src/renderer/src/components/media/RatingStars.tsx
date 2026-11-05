import { Star, X } from 'lucide-react'
import { cn } from '@renderer/lib/utils'
import { useRatingPrecision } from '@renderer/lib/ratingPrecision'

interface RatingStarsProps {
  /** 0-10 scale. Whole numbers only unless the user has turned on half-star precision in Settings. */
  value: number | null
  onChange?: (value: number | null) => void
  readOnly?: boolean
  size?: 'sm' | 'md'
  /** Shows an explicit "clear rating" button next to the stars when a value is set. Defaults to true. */
  clearable?: boolean
}

const STAR_COUNT = 10
const FOCUS_RING =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background focus-visible:rounded-sm'

interface StarProps {
  starNumber: number
  value: number | null
  starSize: string
  readOnly: boolean
  precision: 'whole' | 'half'
  onChange?: (value: number | null) => void
}

function StarControl({ starNumber, value, starSize, readOnly, precision, onChange }: StarProps): JSX.Element {
  const isFull = value !== null && value >= starNumber
  const isHalf = precision === 'half' && value !== null && value >= starNumber - 0.5 && value < starNumber
  const fillWidth = isFull ? '100%' : isHalf ? '50%' : '0%'

  function set(next: number): void {
    onChange?.(value === next ? null : next)
  }

  return (
    <span className={cn('relative inline-block', starSize)}>
      <Star className={cn(starSize, 'text-muted-foreground')} />
      {fillWidth !== '0%' && (
        <span className="pointer-events-none absolute inset-0 overflow-hidden" style={{ width: fillWidth }}>
          <Star className={cn(starSize, 'fill-[#ffd84a] text-[#ffd84a]')} />
        </span>
      )}
      {!readOnly &&
        (precision === 'half' ? (
          <>
            <button
              type="button"
              aria-label={`Rate ${starNumber - 0.5} out of ${STAR_COUNT}`}
              onClick={() => set(starNumber - 0.5)}
              className={cn('absolute inset-y-0 left-0 w-1/2 transition-transform hover:scale-110', FOCUS_RING)}
            />
            <button
              type="button"
              aria-label={`Rate ${starNumber} out of ${STAR_COUNT}`}
              onClick={() => set(starNumber)}
              className={cn('absolute inset-y-0 right-0 w-1/2 transition-transform hover:scale-110', FOCUS_RING)}
            />
          </>
        ) : (
          <button
            type="button"
            aria-label={`Rate ${starNumber} out of ${STAR_COUNT}`}
            onClick={() => set(starNumber)}
            className={cn('absolute inset-0 transition-transform hover:scale-110', FOCUS_RING)}
          />
        ))}
    </span>
  )
}

/**
 * A compact 10-star rating control on this app's 0-10 scale, used for the
 * personal rating everywhere it appears (episode, season, series/movie).
 * Re-clicking the currently-set star also clears it, but the explicit ×
 * button makes "delete this rating" discoverable on its own. Read-only mode
 * just renders the value (rounded down to the nearest whole/half star).
 */
export function RatingStars({
  value,
  onChange,
  readOnly = false,
  size = 'sm',
  clearable = true
}: RatingStarsProps): JSX.Element {
  const precision = useRatingPrecision()
  const starSize = size === 'sm' ? 'h-3.5 w-3.5' : 'h-5 w-5'

  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: STAR_COUNT }, (_, index) => (
        <StarControl
          key={index + 1}
          starNumber={index + 1}
          value={value}
          starSize={starSize}
          readOnly={readOnly}
          precision={precision}
          onChange={onChange}
        />
      ))}
      {value !== null && (
        <span className={cn('wt-display ml-2', size === 'sm' ? 'text-xs' : 'text-[22px] leading-none')}>{value.toFixed(1)}</span>
      )}
      {!readOnly && clearable && value !== null && (
        <button
          type="button"
          aria-label="Clear rating"
          onClick={() => onChange?.(null)}
          className={cn('ml-0.5 text-muted-foreground transition-colors hover:text-destructive', FOCUS_RING)}
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  )
}
