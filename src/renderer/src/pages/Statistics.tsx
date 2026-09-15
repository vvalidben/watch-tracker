import { BarChart3, TriangleAlert } from 'lucide-react'
import { PageHeader } from '@renderer/components/layout/PageHeader'
import { EmptyState } from '@renderer/components/layout/EmptyState'
import { Skeleton } from '@renderer/components/ui/skeleton'
import { DashboardStatsBar } from '@renderer/components/dashboard/DashboardStatsBar'
import { MonthlyTrendChart } from '@renderer/components/statistics/MonthlyTrendChart'
import { HorizontalBarList } from '@renderer/components/statistics/HorizontalBarList'
import { CompletionChart } from '@renderer/components/statistics/CompletionChart'
import { RatedMediaList } from '@renderer/components/statistics/RatedMediaList'
import { useStatistics } from '@renderer/hooks/useStatistics'

function StatisticsSkeleton(): JSX.Element {
  return (
    <div className="space-y-8">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
        {Array.from({ length: 7 }).map((_, index) => (
          <Skeleton key={index} className="h-16 rounded-xl" />
        ))}
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-48 rounded-xl" />
        ))}
      </div>
    </div>
  )
}

export function Statistics(): JSX.Element {
  const { statistics, loading, error } = useStatistics()

  const header = (
    <PageHeader
      icon={BarChart3}
      title="Statistics"
      description="Everything below is calculated from your local library only."
    />
  )

  if (loading) {
    return (
      <div className="space-y-8">
        {header}
        <StatisticsSkeleton />
      </div>
    )
  }

  if (error || !statistics) {
    return (
      <div className="space-y-8">
        {header}
        <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error ?? 'Could not load statistics.'}</span>
        </div>
      </div>
    )
  }

  if (statistics.completion.totalInLibrary === 0) {
    return (
      <div className="space-y-8">
        {header}
        <EmptyState
          icon={BarChart3}
          title="Nothing to show yet"
          description="Add and rate a few titles in your library, then check back here to see your stats."
        />
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <PageHeader icon={BarChart3} title="Statistics" description="Calculated entirely from your local library." />

      <DashboardStatsBar stats={statistics.overview} />

      <div className="grid gap-4 md:grid-cols-2">
        <MonthlyTrendChart title="Episodes Watched by Month" data={statistics.episodesByMonth} />
        <MonthlyTrendChart title="Movies Watched by Month" data={statistics.moviesByMonth} />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <RatedMediaList title="Highest Rated" emptyMessage="Rate something to see it here." items={statistics.highestRated} />
        <RatedMediaList title="Lowest Rated" emptyMessage="Rate something to see it here." items={statistics.lowestRated} />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <CompletionChart completion={statistics.completion} />
        <HorizontalBarList
          title="Favorite Genres"
          emptyMessage="Watch something to see your favorite genres."
          items={statistics.favoriteGenres.map((entry) => ({ label: entry.genre, count: entry.count }))}
        />
      </div>
    </div>
  )
}
