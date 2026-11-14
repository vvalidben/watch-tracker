import { ListVideo, TriangleAlert } from 'lucide-react'
import { EmptyState } from '@renderer/components/layout/EmptyState'
import { Skeleton } from '@renderer/components/ui/skeleton'
import { EpisodeRow } from './EpisodeRow'
import type { EpisodeWithProgress } from '@renderer/hooks/useEpisodes'

interface EpisodeListProps {
  episodes: EpisodeWithProgress[]
  loading: boolean
  error: string | null
  isPending: (episodeNumber: number) => boolean
  onToggleWatched: (episodeNumber: number, watched: boolean) => void
  onRate: (episodeNumber: number, rating: number | null) => void
  onLoadHistory: (episodeNumber: number) => Promise<string[]>
  onSaveNotes: (episodeNumber: number, notes: string | null) => Promise<void>
}

export function EpisodeList({
  episodes,
  loading,
  error,
  isPending,
  onToggleWatched,
  onRate,
  onLoadHistory,
  onSaveNotes
}: EpisodeListProps): JSX.Element {
  if (loading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-20 rounded-xl" />
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
        <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
        <span>{error}</span>
      </div>
    )
  }

  if (episodes.length === 0) {
    return (
      <EmptyState
        icon={ListVideo}
        title="No episode information available"
        description="This season doesn't have any episode details for this provider yet."
        className="min-h-0 py-10"
      />
    )
  }

  const nextUpIndex = episodes.findIndex((episode) => !episode.watched)

  return (
    <div className="space-y-2">
      {episodes.map((episode, index) => (
        <EpisodeRow
          key={episode.episodeNumber}
          episode={episode}
          pending={isPending(episode.episodeNumber)}
          isNextUp={index === nextUpIndex}
          onToggleWatched={() => onToggleWatched(episode.episodeNumber, !episode.watched)}
          onRate={(rating) => onRate(episode.episodeNumber, rating)}
          onLoadHistory={() => onLoadHistory(episode.episodeNumber)}
          onSaveNotes={(notes) => onSaveNotes(episode.episodeNumber, notes)}
        />
      ))}
    </div>
  )
}
