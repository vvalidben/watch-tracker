import { Progress } from '@renderer/components/ui/progress'
import type { SeriesProgressDTO } from '@shared/library'

interface SeriesProgressSummaryProps {
  progress: SeriesProgressDTO
}

/**
 * Matches the format:
 *   Season 2
 *   Episode 5 / 12
 *   Overall: 29 / 87 episodes — 33%
 */
export function SeriesProgressSummary({ progress }: SeriesProgressSummaryProps): JSX.Element {
  if (progress.totalEpisodes === 0) {
    return <p className="text-sm text-muted-foreground">No episode information available yet.</p>
  }

  return (
    <div className="space-y-3 rounded-xl border border-border bg-card p-4">
      {progress.currentSeasonNumber !== null && (
        <div className="text-sm">
          <span className="font-medium">Season {progress.currentSeasonNumber}</span>
          {progress.currentEpisodeNumber !== null && progress.currentSeasonTotalEpisodes !== null && (
            <span className="ml-2 text-muted-foreground">
              Episode {progress.currentEpisodeNumber} / {progress.currentSeasonTotalEpisodes}
            </span>
          )}
        </div>
      )}

      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>
            Overall: {progress.watchedEpisodes} / {progress.totalEpisodes} episodes
          </span>
          <span className="font-medium text-foreground">{progress.percentage}%</span>
        </div>
        <Progress value={progress.percentage} className="h-1.5" />
      </div>
    </div>
  )
}
