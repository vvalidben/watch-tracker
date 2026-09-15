import type { MonthCount } from '@shared/statistics'
import { Card, CardContent, CardHeader, CardTitle } from '@renderer/components/ui/card'

interface MonthlyTrendChartProps {
  title: string
  data: MonthCount[]
}

function monthLabel(month: string): string {
  const [year, monthNumber] = month.split('-').map(Number)
  const date = new Date(year, monthNumber - 1, 1)
  const short = date.toLocaleDateString(undefined, { month: 'short' })
  // Hint at the year only at a year boundary, so the axis stays readable at a glance.
  return monthNumber === 1 ? `${short} '${String(year).slice(2)}` : short
}

/** A plain CSS bar chart — no charting library needed for twelve bars. */
export function MonthlyTrendChart({ title, data }: MonthlyTrendChartProps): JSX.Element {
  const max = Math.max(1, ...data.map((entry) => entry.count))
  const total = data.reduce((sum, entry) => sum + entry.count, 0)

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {total === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">No activity in the last 12 months.</p>
        ) : (
          <div className="flex h-32 gap-1.5">
            {data.map((entry) => (
              <div key={entry.month} className="flex flex-1 flex-col items-center gap-1">
                <span className="text-[10px] text-muted-foreground">{entry.count > 0 ? entry.count : ''}</span>
                <div className="flex w-full flex-1 items-end">
                  <div
                    className="w-full rounded-t bg-primary/80"
                    style={{ height: `${Math.max(2, (entry.count / max) * 100)}%` }}
                    title={`${entry.month}: ${entry.count}`}
                  />
                </div>
                <span className="text-[10px] text-muted-foreground">{monthLabel(entry.month)}</span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
