import { Star } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@renderer/components/ui/card'
import type { RatedMediaSummary } from '@shared/statistics'

interface RatedMediaListProps {
  title: string
  emptyMessage: string
  items: RatedMediaSummary[]
}

/** A compact ranked list for highest/lowest rated titles — click through to the detail page. */
export function RatedMediaList({ title, emptyMessage, items }: RatedMediaListProps): JSX.Element {
  const navigate = useNavigate()

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">{emptyMessage}</p>
        ) : (
          <div className="space-y-1">
            {items.map((item) => {
              const canOpen = item.source !== 'manual' && item.sourceId !== null
              return (
                <button
                  key={item.mediaItemId}
                  type="button"
                  disabled={!canOpen}
                  onClick={() => canOpen && navigate(`/media/${item.source}/${item.type}/${item.sourceId}`)}
                  className="flex w-full items-center gap-2 rounded-md px-1.5 py-1.5 text-left transition-colors hover:bg-muted disabled:cursor-default disabled:hover:bg-transparent"
                >
                  <div className="h-10 w-7 shrink-0 overflow-hidden rounded bg-muted">
                    {item.posterPath && (
                      <img src={item.posterPath} alt="" className="h-full w-full object-cover" loading="lazy" />
                    )}
                  </div>
                  <span className="min-w-0 flex-1 truncate text-sm">{item.title}</span>
                  <span className="flex shrink-0 items-center gap-1 text-xs font-medium">
                    <Star className="h-3 w-3 fill-primary text-primary" />
                    {item.rating.toFixed(1)}
                  </span>
                </button>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
