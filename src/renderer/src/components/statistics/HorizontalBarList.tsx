import { Card, CardContent, CardHeader, CardTitle } from '@renderer/components/ui/card'

interface HorizontalBarListProps {
  title: string
  emptyMessage: string
  items: { label: string; count: number }[]
}

/** A ranked horizontal bar list — used for favorite genres. */
export function HorizontalBarList({ title, emptyMessage, items }: HorizontalBarListProps): JSX.Element {
  const max = Math.max(1, ...items.map((item) => item.count))

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">{emptyMessage}</p>
        ) : (
          <div className="space-y-2">
            {items.map((item) => (
              <div key={item.label} className="flex items-center gap-2">
                <span className="w-24 shrink-0 truncate text-xs text-muted-foreground" title={item.label}>
                  {item.label}
                </span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                  <div className="h-full rounded-full bg-primary/80" style={{ width: `${(item.count / max) * 100}%` }} />
                </div>
                <span className="w-6 shrink-0 text-right text-xs font-medium">{item.count}</span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
