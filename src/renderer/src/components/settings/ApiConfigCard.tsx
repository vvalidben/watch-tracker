import { useEffect, useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { useAppConfig } from '@renderer/hooks/useAppConfig'

export function ApiConfigCard(): JSX.Element {
  const { config, loading, pending, error, saveTmdbApiKey } = useAppConfig()
  const [draft, setDraft] = useState('')
  const [showKey, setShowKey] = useState(false)
  const [savedMessage, setSavedMessage] = useState<string | null>(null)

  useEffect(() => {
    if (config) setDraft(config.tmdbApiKey ?? '')
  }, [config])

  async function handleSave(): Promise<void> {
    setSavedMessage(null)
    const key = draft.trim()
    const ok = await saveTmdbApiKey(key.length > 0 ? key : null)
    if (ok) {
      setSavedMessage(
        key.length > 0
          ? 'Saved. Restart the app for the new key to take effect.'
          : 'Key removed. Restart the app for this to take effect.'
      )
    }
  }

  const statusText = config?.tmdbApiKey
    ? 'Key active · search enabled for films and series'
    : config?.tmdbConfiguredViaEnv
      ? 'Key set through this machine’s environment · search enabled for films and series'
      : 'No key · film and series search is disabled'

  return (
    <div className="wt-panel wt-stack wt-rise" style={{ padding: 24, gap: 12, animationDelay: '120ms' }}>
      <h2 className="wt-h3">API configuration</h2>
      <span className="wt-sub">
        TMDB key for films and series (
        <a href="https://www.themoviedb.org/settings/api" target="_blank" rel="noreferrer" style={{ color: 'var(--wt-a2)', textDecoration: 'underline' }}>
          get a free one
        </a>
        ). Anime search through AniList needs no key.
      </span>
      {!loading && (
        <>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <div style={{ position: 'relative', flex: 1, minWidth: 220 }}>
              <input
                className="wt-input"
                type={showKey ? 'text' : 'password'}
                value={draft}
                aria-label="TMDB API key"
                placeholder="Paste your key"
                style={{ width: '100%', paddingRight: 38, boxSizing: 'border-box' }}
                onChange={(event) => {
                  setDraft(event.target.value)
                  setSavedMessage(null)
                }}
              />
              <button
                type="button"
                aria-label={showKey ? 'Hide API key' : 'Show API key'}
                style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--wt-muted)', display: 'flex' }}
                onClick={() => setShowKey((previous) => !previous)}
              >
                {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <button type="button" className="wt-btn wt-btn-cyan" disabled={pending} onClick={() => void handleSave()}>
              Save
            </button>
          </div>
          <span style={{ fontSize: 12, color: error ? 'var(--wt-a1)' : 'var(--wt-a2)' }}>{error ?? savedMessage ?? statusText}</span>
        </>
      )}
    </div>
  )
}
