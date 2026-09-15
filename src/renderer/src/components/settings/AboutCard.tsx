import { useEffect, useState } from 'react'
import { Badge } from '@renderer/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@renderer/components/ui/card'

const SHORTCUTS: { keys: string; description: string }[] = [
  { keys: '/', description: 'Jump to Search' },
  { keys: 'Esc', description: 'Go back, from a title’s details page' }
]

function Kbd({ children }: { children: string }): JSX.Element {
  return (
    <kbd className="rounded-md border border-border bg-muted px-1.5 py-0.5 font-mono text-xs font-medium text-foreground shadow-sm">
      {children}
    </kbd>
  )
}

export function AboutCard(): JSX.Element {
  const [version, setVersion] = useState('')

  useEffect(() => {
    window.api
      .getAppVersion()
      .then(setVersion)
      .catch(() => setVersion('unknown'))
  }, [])

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0">
        <div className="space-y-1.5">
          <CardTitle>About</CardTitle>
          <CardDescription>Version info and shortcuts, for reference.</CardDescription>
        </div>
        <Badge variant="secondary" className="shrink-0">
          v{version || '…'}
        </Badge>
      </CardHeader>
      <CardContent>
        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Keyboard Shortcuts
        </p>
        <div className="space-y-1.5">
          {SHORTCUTS.map((shortcut) => (
            <div key={shortcut.keys} className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{shortcut.description}</span>
              <Kbd>{shortcut.keys}</Kbd>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
