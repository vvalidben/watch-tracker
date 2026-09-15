import { Card, CardContent, CardHeader, CardTitle } from '@renderer/components/ui/card'
import { watchStatusLabel } from '@renderer/lib/mediaFormatting'
import { cn } from '@renderer/lib/utils'
import type { CompletionStats } from '@shared/statistics'
import type { WatchStatus } from '@shared/library'

interface CompletionChartProps {
  completion: CompletionStats
}

const STATUS_COLOR: Record<WatchStatus, string> = {
  completed: 'bg-emerald-500',
  watching: 'bg-blue-500',
  plan_to_watch: 'bg-muted-foreground/40',
  on_hold: 'bg-amber-500',
  dropped: 'bg-red-500'
}

/** A single segmented bar showing the whole library's status mix, plus a completion-rate headline. */
export function CompletionChart({ completion }: CompletionChartProps): JSX.Element {
  const { byStatus, completionRate, totalInLibrary } = completion

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">Completion</CardTitle>
        <span className="text-lg font-semibold">{completionRate !== null ? `${completionRate}%` : '—'}</span>
      </CardHeader>
      <CardContent className="space-y-3">
        {totalInLibrary === 0 ? (
          <p className="py-2 text-center text-sm text-muted-foreground">Nothing in your library yet.</p>
        ) : (
          <>
            <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-muted">
              {byStatus.map(
                (entry) =>
                  entry.count > 0 && (
                    <div
                      key={entry.status}
                      className={cn(STATUS_COLOR[entry.status])}
                      style={{ width: `${(entry.count / totalInLibrary) * 100}%` }}
                      title={`${watchStatusLabel(entry.status)}: ${entry.count}`}
                    />
                  )
              )}
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1.5">
              {byStatus.map((entry) => (
                <div key={entry.status} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <span className={cn('h-2 w-2 rounded-full', STATUS_COLOR[entry.status])} />
                  {watchStatusLabel(entry.status)}
                  <span className="font-medium text-foreground">{entry.count}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
