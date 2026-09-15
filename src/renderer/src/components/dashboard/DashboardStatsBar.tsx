import { Clapperboard, Clock, Film, Heart, ListVideo, Star, Tv } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Card, CardContent } from '@renderer/components/ui/card'
import { formatWatchTime } from '@renderer/lib/dashboardFormatting'
import type { DashboardStats } from '@shared/dashboardStats'

interface DashboardStatsBarProps {
  stats: DashboardStats
}

interface StatTile {
  label: string
  value: string
  icon: LucideIcon
}

function buildTiles(stats: DashboardStats): StatTile[] {
  return [
    { label: 'Movies Watched', value: String(stats.moviesWatched), icon: Film },
    { label: 'Series Completed', value: String(stats.seriesCompleted), icon: Tv },
    { label: 'Anime Completed', value: String(stats.animeCompleted), icon: Clapperboard },
    { label: 'Episodes Watched', value: String(stats.totalEpisodesWatched), icon: ListVideo },
    { label: 'Watch Time', value: formatWatchTime(stats.estimatedWatchTimeMinutes), icon: Clock },
    {
      label: 'Avg. Rating',
      value: stats.averagePersonalRating !== null ? stats.averagePersonalRating.toFixed(1) : '—',
      icon: Star
    },
    { label: 'Favorites', value: String(stats.favoritesCount), icon: Heart }
  ]
}

/** A compact, scannable numeric overview — deliberately small text/icons so it reads as one glance, not seven cards to study. */
export function DashboardStatsBar({ stats }: DashboardStatsBarProps): JSX.Element {
  const tiles = buildTiles(stats)

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
      {tiles.map((tile) => (
        <Card key={tile.label} className="transition-colors hover:border-primary/30">
          <CardContent className="flex items-center gap-3 p-3.5">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/12 text-primary">
              <tile.icon className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <p className="text-lg font-semibold leading-none tabular-nums">{tile.value}</p>
              <p className="mt-1.5 truncate text-[11px] leading-tight text-muted-foreground" title={tile.label}>
                {tile.label}
              </p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
