import { Badge, type BadgeProps } from '@renderer/components/ui/badge'
import { mediaStatusLabel, mediaTypeLabel, watchStatusLabel } from '@renderer/lib/mediaFormatting'
import type { MediaStatus, MediaType } from '@shared/metadata'
import type { WatchStatus } from '@shared/library'

type StatusBadgeProps =
  | { kind: 'type'; value: MediaType; className?: string }
  | { kind: 'watch'; value: WatchStatus; className?: string }
  | { kind: 'airing'; value: MediaStatus | null; className?: string }

const WATCH_VARIANTS: Record<WatchStatus, BadgeProps['variant']> = {
  watching: 'default',
  completed: 'success',
  plan_to_watch: 'outline',
  on_hold: 'secondary',
  dropped: 'destructive'
}

const AIRING_VARIANTS: Record<MediaStatus, BadgeProps['variant']> = {
  airing: 'info',
  finished: 'muted',
  upcoming: 'default',
  cancelled: 'destructive'
}

/** The single place mapping a media type / watch status / airing status to a label + color. */
export function StatusBadge(props: StatusBadgeProps): JSX.Element | null {
  if (props.kind === 'type') {
    return (
      <Badge variant="secondary" className={props.className}>
        {mediaTypeLabel(props.value)}
      </Badge>
    )
  }

  if (props.kind === 'watch') {
    return (
      <Badge variant={WATCH_VARIANTS[props.value]} className={props.className}>
        {watchStatusLabel(props.value)}
      </Badge>
    )
  }

  const label = mediaStatusLabel(props.value)
  if (!label || !props.value) return null
  return (
    <Badge variant={AIRING_VARIANTS[props.value]} className={props.className}>
      {label}
    </Badge>
  )
}
