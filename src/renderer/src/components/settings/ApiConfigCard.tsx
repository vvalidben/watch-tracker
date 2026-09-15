import { useEffect, useState } from 'react'
import { CheckCircle2, Eye, EyeOff, TriangleAlert } from 'lucide-react'
import { Button } from '@renderer/components/ui/button'
import { Input } from '@renderer/components/ui/input'
import { Badge } from '@renderer/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@renderer/components/ui/card'
import { useAppConfig } from '@renderer/hooks/useAppConfig'

export function ApiConfigCard(): JSX.Element {
  const { config, loading, pending, error, saveTmdbApiKey } = useAppConfig()
  const [draft, setDraft] = useState('')
  const [showKey, setShowKey] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (config) setDraft(config.tmdbApiKey ?? '')
  }, [config])

  async function handleSave(): Promise<void> {
    setSaved(false)
    const ok = await saveTmdbApiKey(draft.trim().length > 0 ? draft.trim() : null)
    if (ok) setSaved(true)
  }

  const isConfigured = Boolean(config?.tmdbApiKey || config?.tmdbConfiguredViaEnv)
  const statusText = config?.tmdbApiKey
    ? 'A TMDB key is configured — movie and TV search is enabled.'
    : config?.tmdbConfiguredViaEnv
      ? 'A TMDB key is configured via this machine’s environment.'
      : 'No TMDB key configured — movie and TV search is disabled. Anime search (AniList) needs no key.'

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
        <div className="space-y-1.5">
          <CardTitle>API Configuration</CardTitle>
          <CardDescription>
            TMDB powers movie and TV search.{' '}
            <a
              href="https://www.themoviedb.org/settings/api"
              target="_blank"
              rel="noreferrer"
              className="underline underline-offset-2 hover:text-foreground"
            >
              Get a free key
            </a>
            . Anime search always works with no key needed.
          </CardDescription>
        </div>
        {!loading && (
          <Badge variant={isConfigured ? 'success' : 'muted'} className="shrink-0">
            {isConfigured ? 'Configured' : 'Not Configured'}
          </Badge>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        {!loading && (
          <>
            <div className="flex max-w-sm items-center gap-2">
              <div className="relative flex-1">
                <Input
                  type={showKey ? 'text' : 'password'}
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  placeholder="TMDB API key"
                  className="pr-9"
                />
                <button
                  type="button"
                  aria-label={showKey ? 'Hide API key' : 'Show API key'}
                  onClick={() => setShowKey((prev) => !prev)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                >
                  {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <Button type="button" disabled={pending} onClick={() => void handleSave()}>
                Save
              </Button>
            </div>

            <p className="text-xs text-muted-foreground">{statusText}</p>

            {saved && (
              <p className="flex items-center gap-1.5 text-sm text-success">
                <CheckCircle2 className="h-4 w-4" />
                Saved — restart Watch Tracker to apply the new key.
              </p>
            )}
            {error && (
              <p className="flex items-center gap-1.5 text-sm text-destructive">
                <TriangleAlert className="h-4 w-4" />
                {error}
              </p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}
