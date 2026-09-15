import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@renderer/components/ui/card'
import { Skeleton } from '@renderer/components/ui/skeleton'
import { useDatabaseInfo } from '@renderer/hooks/useDatabaseInfo'
import { formatBytes } from '@renderer/lib/formatBytes'

function Row({ label, value }: { label: string; value: string }): JSX.Element {
  return (
    <div className="flex items-center justify-between gap-4 py-2 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="truncate font-medium" title={value}>
        {value}
      </span>
    </div>
  )
}

export function DatabaseInfoCard(): JSX.Element {
  const { info, loading } = useDatabaseInfo()

  return (
    <Card>
      <CardHeader>
        <CardTitle>Database</CardTitle>
        <CardDescription>Where your data lives, and how large it&apos;s grown.</CardDescription>
      </CardHeader>
      <CardContent>
        {loading || !info ? (
          <div className="space-y-3 py-1">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="h-4 w-full" />
            ))}
          </div>
        ) : (
          <div className="divide-y divide-border">
            <Row label="Location" value={info.filePath} />
            <Row label="Size" value={formatBytes(info.fileSizeBytes)} />
            <Row label="Titles tracked" value={String(info.mediaItemCount)} />
            <Row label="Library entries" value={String(info.libraryEntryCount)} />
          </div>
        )}
      </CardContent>
    </Card>
  )
}
