import { useNavigate } from 'react-router-dom'
import { Compass, TriangleAlert } from 'lucide-react'
import { Card, CardContent } from '@renderer/components/ui/card'
import { Button } from '@renderer/components/ui/button'
import { Skeleton } from '@renderer/components/ui/skeleton'
import { EmptyState } from '@renderer/components/layout/EmptyState'
import { DashboardStatsBar } from '@renderer/components/dashboard/DashboardStatsBar'
import { DashboardShelf } from '@renderer/components/dashboard/DashboardShelf'
import { useDashboard } from '@renderer/hooks/useDashboard'

function DashboardSkeleton(): JSX.Element {
  return (
    <div className="space-y-8">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
        {Array.from({ length: 7 }).map((_, index) => (
          <Skeleton key={index} className="h-16 rounded-xl" />
        ))}
      </div>
      {Array.from({ length: 2 }).map((_, index) => (
        <div key={index} className="space-y-3">
          <Skeleton className="h-4 w-32" />
          <div className="flex gap-3">
            {Array.from({ length: 5 }).map((_, cardIndex) => (
              <Skeleton key={cardIndex} className="aspect-[2/3] w-36 shrink-0 rounded-xl" />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

export function Dashboard(): JSX.Element {
  const navigate = useNavigate()
  const { data, loading, error } = useDashboard()

  if (loading) {
    return <DashboardSkeleton />
  }

  if (error || !data) {
    return (
      <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
        <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
        <span>{error ?? 'Could not load the dashboard.'}</span>
      </div>
    )
  }

  const { stats, shelves } = data
  const isLibraryEmpty = Object.values(shelves).every((shelf) => shelf.length === 0)

  if (isLibraryEmpty) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Welcome</h2>
          <p className="text-sm text-muted-foreground">Nothing tracked yet — let&apos;s fix that.</p>
        </div>
        <EmptyState
          icon={Compass}
          title="Your dashboard is empty"
          description="Search for a movie, series, or anime to add your first title — everything you track will show up here."
          action={
            <Card className="w-full max-w-sm border-none bg-transparent shadow-none">
              <CardContent className="p-0 pt-2">
                <Button onClick={() => navigate('/search')} className="w-full">
                  Go to Search
                </Button>
              </CardContent>
            </Card>
          }
        />
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Dashboard</h2>
        <p className="text-sm text-muted-foreground">Your library at a glance.</p>
      </div>

      <DashboardStatsBar stats={stats} />

      <DashboardShelf title="Continue Watching" items={shelves.continueWatching} variant="large" />
      <DashboardShelf title="Watchlist" items={shelves.watchlist} />
      <DashboardShelf title="Recently Added" items={shelves.recentlyAdded} />
      <DashboardShelf title="Recently Watched" items={shelves.recentlyWatched} />
      <DashboardShelf title="Highest Rated" items={shelves.highestRated} />
      <DashboardShelf title="Favorites" items={shelves.favorites} />
    </div>
  )
}
